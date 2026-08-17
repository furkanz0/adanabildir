// Gorsel siniflandirma servisi (TensorFlow.js + Teachable Machine).
//
// Model public/model/ altinda ve IKI sinif biliyor: cukur, cop. Ucuncu
// kategori 'diger' modelden gelmiyor — guven esigi altinda kalan tahminler
// oraya dusuruluyor (bkz. CONFIDENCE_THRESHOLD).
//
// Dosyalar bulunamazsa servis hata firlatmak yerine sahte (mock) bir tahmin
// dondurur; boylece form, model olmadan da uctan uca test edilebilir.

import { CATEGORIES, DEFAULT_CATEGORY } from '../constants'

const MODEL_URL = '/model/model.json'
const METADATA_URL = '/model/metadata.json'
const IMAGE_SIZE = 224

/**
 * Tahmini kabul etmek icin gereken en dusuk guven skoru (0-1).
 *
 * Model yalnizca iki sinif biliyor: cukur ve cop. Softmax cikisi her zaman
 * toplami 1 olan iki skor uretir, yani modele bir sokak lambasi fotografi
 * verilsen bile ikisinden birini secmek zorunda kalir — "bilmiyorum" diyemez.
 * Esik bu bosluğu dolduruyor: en yuksek skor bunun altindaysa tahmini
 * kullanmiyor, kategoriyi 'diger' birakip kullanicidan secmesini istiyoruz.
 *
 * Deger yukseldikce model daha az konusur (daha cok 'diger'), dustukce daha
 * cok konusur ama yanilma payi artar. Egitim setin buyudukce dusurebilirsin.
 */
const CONFIDENCE_THRESHOLD = 0.65

// Teachable Machine'de siniflara verilen isimler bizim Firestore anahtarlarimiza
// birebir uymayabilir ("Çukur", "pothole", "Yol Çukuru" ...). Bu tablo makul
// varyasyonlari dogru anahtara esler.
const LABEL_ALIASES = {
  cukur: ['cukur', 'yolcukuru', 'pothole', 'hole', 'yol'],
  cop: ['cop', 'copyigini', 'garbage', 'trash', 'atik', 'cope'],
  diger: ['diger', 'other', 'genel'],
}

let tfModulePromise = null
let modelPromise = null
let labelsPromise = null

function normalizeLabel(label) {
  return String(label ?? '')
    .toLocaleLowerCase('tr')
    .replaceAll('ç', 'c')
    .replaceAll('ğ', 'g')
    .replaceAll('ı', 'i')
    .replaceAll('ö', 'o')
    .replaceAll('ş', 's')
    .replaceAll('ü', 'u')
    .replace(/[^a-z0-9]/g, '')
}

/** Model etiketini uygulamadaki kategori anahtarina cevirir. */
export function mapLabelToCategory(label) {
  const normalized = normalizeLabel(label)
  if (!normalized) return DEFAULT_CATEGORY

  // Once tam eslesme
  for (const [key, aliases] of Object.entries(LABEL_ALIASES)) {
    if (normalized === key || aliases.includes(normalized)) return key
  }

  // Sonra parcali eslesme ("yolcukuruvar" gibi serbest yazilmis etiketler icin)
  for (const [key, aliases] of Object.entries(LABEL_ALIASES)) {
    if (normalized.includes(key)) return key
    if (aliases.some((alias) => normalized.includes(alias))) return key
  }

  return DEFAULT_CATEGORY
}

/**
 * Model dosyalari sunuluyor mu? Vite gelistirme sunucusu var olmayan bir
 * public/ dosyasi icin 404 doner; ayrica SPA fallback'i HTML dondurme
 * ihtimaline karsi content-type'i da kontrol ediyoruz.
 */
async function modelFilesExist() {
  try {
    const response = await fetch(MODEL_URL, { method: 'HEAD' })
    if (!response.ok) return false
    const contentType = response.headers.get('content-type') ?? ''
    return !contentType.includes('text/html')
  } catch {
    return false
  }
}

// TensorFlow.js ~1 MB'lik bir paket. Statik import etseydik model olmasa bile
// her ziyaretcinin indirmesi gerekirdi; dinamik import ile yalnizca gercekten
// tahmin yapilacaginda yukleniyor.
async function getTf() {
  if (!tfModulePromise) tfModulePromise = import('@tensorflow/tfjs')
  return tfModulePromise
}

async function loadLabels() {
  if (!labelsPromise) {
    labelsPromise = fetch(METADATA_URL)
      .then((response) => (response.ok ? response.json() : null))
      .then((metadata) => metadata?.labels ?? null)
      .catch(() => null)
  }
  return labelsPromise
}

async function loadModel() {
  if (!modelPromise) {
    modelPromise = getTf()
      .then((tf) => tf.loadLayersModel(MODEL_URL))
      .catch((error) => {
        console.warn('[ai] model yüklenemedi:', error)
        modelPromise = null // sonraki denemede tekrar sansini versin
        return null
      })
  }
  return modelPromise
}

function fileToImage(file) {
  return new Promise((resolve, reject) => {
    const objectUrl = URL.createObjectURL(file)
    const image = new Image()

    image.onload = () => {
      URL.revokeObjectURL(objectUrl)
      resolve(image)
    }
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl)
      reject(new Error('Görsel okunamadı.'))
    }

    image.src = objectUrl
  })
}

/**
 * Gorseli modelin bekledigi bicime getirir: merkezden kare kirpma, 224x224'e
 * olcekleme ve [-1, 1] araligina normalizasyon. Teachable Machine'in kendi
 * on isleme adimlariyla ayni (div(127).sub(1)) tutuldu ki tahminler
 * Teachable Machine arayuzunde gordugun sonuclarla ortussun.
 */
function preprocess(tf, image) {
  const side = Math.min(image.naturalWidth, image.naturalHeight)
  const sourceX = (image.naturalWidth - side) / 2
  const sourceY = (image.naturalHeight - side) / 2

  const canvas = document.createElement('canvas')
  canvas.width = IMAGE_SIZE
  canvas.height = IMAGE_SIZE
  canvas
    .getContext('2d')
    .drawImage(image, sourceX, sourceY, side, side, 0, 0, IMAGE_SIZE, IMAGE_SIZE)

  return tf.tidy(() =>
    tf.browser.fromPixels(canvas).expandDims(0).toFloat().div(127).sub(1),
  )
}

function mockPrediction() {
  const keys = Object.keys(CATEGORIES)
  const category = keys[Math.floor(Math.random() * keys.length)]
  // Dusuk guven skoru: %40-60
  const confidence = Math.round(40 + Math.random() * 20)

  // Sahte tahminde esik mantigi calismiyor; arayuz zaten "ornek tahmin"
  // uyarisini gosteriyor, ayrica "siniflandiramadi" demesine gerek yok.
  return { category, confidence, source: 'mock', label: null, lowConfidence: false }
}

/**
 * Bir gorsel dosyasini siniflandirir.
 *
 * @param {File} imageFile
 * @returns {Promise<{category: string, confidence: number, source: 'model'|'mock', label: string|null, lowConfidence: boolean}>}
 *   category      - CATEGORIES anahtarlarindan biri
 *   confidence    - 0-100 arasi yuzde (modelin ham skoru, esikten bagimsiz)
 *   source        - 'model' gercek tahmin, 'mock' model yokken uretilen ornek
 *   label         - modelin dondurdugu ham sinif adi (mock'ta null)
 *   lowConfidence - skor CONFIDENCE_THRESHOLD altinda kaldi, kategori 'diger'e
 *                   dusuruldu. Arayuz bu bayraga bakip kullanicidan elle secim
 *                   istiyor. Kategoriye bakmak yerine bayrak kullaniyoruz:
 *                   ilerde dort sinifli bir model gelirse yuksek guvenle
 *                   uretilmis gercek bir 'diger' tahminiyle karismasin.
 */
export async function predictCategory(imageFile) {
  if (!imageFile) throw new Error('Sınıflandırılacak görsel bulunamadı.')

  if (!(await modelFilesExist())) return mockPrediction()

  try {
    const [tf, model, labels] = await Promise.all([
      getTf(),
      loadModel(),
      loadLabels(),
    ])

    if (!model) return mockPrediction()

    const image = await fileToImage(imageFile)
    const input = preprocess(tf, image)

    const output = model.predict(input)
    const scores = Array.from(await output.data())

    input.dispose()
    output.dispose()

    if (scores.length === 0) return mockPrediction()

    let bestIndex = 0
    for (let i = 1; i < scores.length; i += 1) {
      if (scores[i] > scores[bestIndex]) bestIndex = i
    }

    const label = labels?.[bestIndex] ?? String(bestIndex)
    const score = scores[bestIndex]
    const lowConfidence = score < CONFIDENCE_THRESHOLD

    return {
      // Esigin altindaysa modelin dedigini kullanmiyoruz — bkz.
      // CONFIDENCE_THRESHOLD aciklamasi
      category: lowConfidence ? DEFAULT_CATEGORY : mapLabelToCategory(label),
      confidence: Math.round(score * 100),
      source: 'model',
      label,
      lowConfidence,
    }
  } catch (error) {
    console.warn('[ai] tahmin başarısız, örnek tahmine düşülüyor:', error)
    return mockPrediction()
  }
}

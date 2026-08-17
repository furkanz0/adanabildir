/**
 * OpenCV.js yukleyicisi ve ortak goruntu hazirligi.
 *
 * Iki servis kullaniyor:
 *   - damageDensityService.js  (hasar yogunlugu)
 *   - imageQualityService.js   (bulaniklik kontrolu)
 *
 * Kutuphane index.html'de <script async> ile geliyor; burasi onun hazir
 * olmasini bekleyip erisim saglıyor.
 */

/**
 * Analiz oncesi gorselin indirgenecegi en uzun kenar (piksel).
 *
 * Her iki olcum de cozunurluge duyarli:
 *   - adaptiveThreshold'un blockSize'i (21 px) MUTLAK bir deger
 *   - Laplacian varyansi ham piksel farklarindan hesaplaniyor
 *
 * Olceklemezsek ayni sorunun fotografi, ceken telefonun cozunurlugune gore
 * bambaska sayilar uretir ve kayitlar karsilastirilamaz hale gelir. Ayrica
 * 48 MP bir fotografi WASM belleginde islemek hem yavas hem riskli.
 *
 * Colab tarafinda ayni sonuclari almak icin goruntuyu once ayni kurala gore
 * kucultmek gerekiyor: en uzun kenar 800 piksel, en-boy orani korunarak.
 */
export const MAX_ANALYSIS_SIDE = 800

/**
 * Yukleme icin beklenecek sure.
 *
 * Olcum: soguk onbellekle ~12,5 saniye (yaklasik 9 MB WASM). Yavas baglantida
 * daha uzun surebilir, o yuzden bol tutuluyor — ama sinirsiz degil: kutuphane
 * hic gelmeyecekse "hesaplaniyor" gostergesini dakikalarca donduremeyiz.
 */
const CDN_TIMEOUT_MS = 20000

let cvPromise = null

/**
 * OpenCV.js hazir olana kadar bekler.
 *
 * Uc asamali bir yukleme var ve ucunu de beklemek gerekiyor:
 *   1. index.html'deki <script async> indirilir
 *   2. window.cv olusur — ama icindeki fonksiyonlar HENUZ YOK
 *   3. WASM derlenir, cv.onRuntimeInitialized tetiklenir
 *
 * Yalnizca `window.cv` kontrolu yapmak 2. asamada yanlis pozitif verir:
 * nesne vardir, cv.Mat cagirinca patlar. Bu yuzden hazirlik olcutu
 * `typeof cv.Mat === 'function'`.
 *
 * DIKKAT — iki tuzak var, ikisi de olculdu:
 *
 *   a) OpenCV 4.9'un `cv` nesnesi Emscripten'in `then` metodunu tasiyor ama
 *      bu zincirlenebilir bir Promise DEGIL: `cv.then(...).catch(...)`
 *      "catch is not a function" hatasi veriyor.
 *   b) Daha sinsisi: `resolve(cv)` cagirmak JS'in "thenable" mekanizmasini
 *      tetikliyor — motor cv'yi Promise sanip `cv.then(resolve, reject)`
 *      cagiriyor. Bu yuzden bu Promise cv nesnesiyle DEGIL, `true` ile
 *      cozuluyor; modul `getCv()` ile aliniyor.
 *
 * @returns {Promise<boolean>} hazir oldugunda true
 */
export function loadOpenCv({ timeoutMs = CDN_TIMEOUT_MS } = {}) {
  if (cvPromise) return cvPromise

  cvPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('OpenCV yalnızca tarayıcıda çalışır.'))
      return
    }

    let settled = false
    let poll = null
    let timer = null

    const cleanup = () => {
      if (poll) window.clearInterval(poll)
      if (timer) window.clearTimeout(timer)
    }

    // Bilerek cv nesnesiyle degil `true` ile cozuyoruz — yukaridaki (b) tuzagi
    const succeed = () => {
      if (settled) return
      settled = true
      cleanup()
      resolve(true)
    }

    const fail = (error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }

    const isReady = (cv) => typeof cv?.Mat === 'function'

    // window.cv'yi bulup hazir olmasini beklemeye calisir.
    // @returns {boolean} cv nesnesi bulundu mu (hazir olmasi sart degil)
    const attach = () => {
      const cv = window.cv
      if (!cv) return false

      if (isReady(cv)) {
        succeed()
        return true
      }

      // Emscripten'in `then`i: zincirlenemez, geri cagrimla calisir
      if (typeof cv.then === 'function') {
        try {
          cv.then(() => succeed())
        } catch (error) {
          fail(error)
        }
        return true
      }

      cv.onRuntimeInitialized = () => succeed()
      return true
    }

    if (!attach()) {
      // Script henuz inmedi; olusmasini bekliyoruz.
      poll = window.setInterval(() => {
        if (attach() && poll) window.clearInterval(poll)
      }, 120)
    }

    timer = window.setTimeout(
      () =>
        fail(
          new Error(
            'OpenCV.js yüklenemedi. Bağlantınızı kontrol edin veya sayfayı yenileyin.',
          ),
        ),
      timeoutMs,
    )
  })

  // Hata kalici olmasin: sonraki cagri yeniden denesin.
  cvPromise.catch(() => {
    cvPromise = null
  })

  return cvPromise
}

/** OpenCV zaten hazirsa true — arayuz "yükleniyor" demeden gecebilsin diye. */
export function isOpenCvReady() {
  return typeof window !== 'undefined' && typeof window.cv?.Mat === 'function'
}

/** Hazir cv modulu. loadOpenCv() beklendikten sonra cagrilmali. */
export function getCv() {
  if (!isOpenCvReady()) throw new Error('OpenCV.js henüz hazır değil.')
  return window.cv
}

/**
 * Gorseli analiz cozunurlugune indirger.
 *
 * cv.imread dogrudan <img>'den de okuyabilir ama o zaman fotografin ham
 * boyutuyla calisiriz — bkz. MAX_ANALYSIS_SIDE.
 */
export function toAnalysisCanvas(imageElement) {
  const width = imageElement.naturalWidth || imageElement.width
  const height = imageElement.naturalHeight || imageElement.height

  if (!width || !height) {
    throw new Error('Görsel henüz yüklenmemiş.')
  }

  const scale = Math.min(1, MAX_ANALYSIS_SIDE / Math.max(width, height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width * scale))
  canvas.height = Math.max(1, Math.round(height * scale))

  canvas
    .getContext('2d')
    .drawImage(imageElement, 0, 0, canvas.width, canvas.height)

  return canvas
}

/** Dosyayi <img> olarak cozer — her iki servisin de girisi. */
export async function fileToImage(file) {
  if (!file) throw new Error('Görsel bulunamadı.')

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = objectUrl
    await image.decode()
    return { image, revoke: () => URL.revokeObjectURL(objectUrl) }
  } catch (error) {
    URL.revokeObjectURL(objectUrl)
    throw error
  }
}

/**
 * Mat'lari toplayip finally'de topluca silen yardimci.
 *
 * WASM belleginde tutulan her Mat elle serbest birakilmali; cop toplayici
 * bunlari bilmiyor. Arada bir hata firlasa bile sizinti olmasin diye.
 */
export function withMats(fn) {
  const mats = []
  const track = (mat) => {
    mats.push(mat)
    return mat
  }
  try {
    return fn(track)
  } finally {
    for (const mat of mats) {
      // Zaten silinmis bir Mat'i silmek hata firlatir; sonucu bunun yuzunden
      // kaybetmeyelim.
      try {
        mat.delete()
      } catch {
        /* yoksay */
      }
    }
  }
}

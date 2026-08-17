/**
 * Fotograf kalitesi kontrolu — bulaniklik olcumu (OpenCV.js).
 *
 * Neden: bulanik bir fotograf belediye ekibi icin ise yaramaz. Sahaya gidip
 * "bu neydi?" demek yerine, kullaniciya HENUZ ORADAYKEN tekrar cekmesini
 * soylemek cok daha ucuz.
 *
 * Yontem — Laplacian varyansi:
 *
 *   Laplacian operatoru ikinci turevi alir, yani kenarlari one cikarir. Net
 *   bir fotografta keskin kenarlar cok sayida buyuk deger uretir; bulanik
 *   fotografta kenarlar yayvanlasir ve degerler sifira yaklasir. Sonucun
 *   VARYANSI bu yayilimin olcusu: yuksek varyans = net, dusuk = bulanik.
 *
 *   Python karsiligi:
 *     gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
 *     varyans = cv2.Laplacian(gray, cv2.CV_64F).var()
 *
 * ONEMLI: varyans mutlak bir sayi degil, cozunurluge ve sahne icerigine gore
 * degisir. Bu yuzden girdi once sabit boya olcekleniyor (MAX_ANALYSIS_SIDE) ve
 * esik bu projenin kendi veri setinde olculerek secildi — asagiya bakin.
 */
import {
  fileToImage,
  getCv,
  loadOpenCv,
  toAnalysisCanvas,
  withMats,
} from './opencv'

/**
 * Bulaniklik esigi (Laplacian varyansi). Bunun ALTI bulanik sayiliyor.
 *
 * Tahmin degil, OLCUM. Projenin kendi veri setinden 6 fotograf, 800 piksele
 * indirgenmis halde, giderek artan GaussianBlur cekirdekleriyle:
 *
 *   fotograf       net      k=3      k=5      k=9     k=15     k=25
 *   ---------------------------------------------------------------
 *   cop-4.jpg    273.0     62.8     33.9     11.4      4.7      2.5
 *   cop-5.jpg    280.3     63.9     33.7     11.1      4.5      2.3
 *   cop-6.jpg   1126.5    288.4    163.2     48.8     13.3      3.9
 *   cukur-1.jpg 2244.7    156.7     48.0      7.5      2.6      1.8
 *   cukur-2.jpg  771.2     88.9     39.9     11.9      4.8      2.4
 *   cukur-3.jpg 3273.7    241.9     76.9     11.9      3.4      2.0
 *
 * Iki kume net biciminde ayriliyor:
 *   - k=3 (hafif yumusama, hala okunabilir) en dusuk 62.8
 *   - k>=9 (ne oldugu secilemiyor)          en yuksek 48.8
 *
 * Esik bu iki kumenin arasina, 60'a konuldu. Sonuc:
 *   - net fotograflarin hicbiri uyari almiyor (en dususu 273, 4,5 kat pay)
 *   - hafif yumusak k=3 fotograflar da geciyor (yanlis alarm yok)
 *   - k>=9 olanlarin TAMAMI yakalaniyor
 *
 * Literaturde sik gecen 100 degeri ~500 px goruntuler icindir; bu projede
 * calisma cozunurlugu 800 px oldugu icin kendi olcumumuze dayaniyoruz.
 *
 * DIKKAT — yontemin bilinen zayifligi: varyans sahne dokusuna da bagli.
 * Duz asfalt veya boş bir duvar gibi az kenarli bir sahne, odagi tam olsa
 * bile dusuk deger uretebilir. Bu yuzden uyari ENGELLEYICI degil: kullanici
 * yine de gonderebiliyor.
 */
export const BLUR_THRESHOLD = 60

/**
 * Bir gorselin netlik skorunu olcer.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} imageElement
 * @returns {Promise<{variance: number, isBlurry: boolean, threshold: number}>}
 */
export async function measureBlur(imageElement) {
  if (!imageElement) throw new Error('Analiz edilecek görsel bulunamadı.')

  await loadOpenCv()
  const cv = getCv()
  const canvas = toAnalysisCanvas(imageElement)

  return withMats((track) => {
    const source = track(cv.imread(canvas))
    const gray = track(new cv.Mat())
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY, 0)

    // CV_64F sart: Laplacian negatif degerler de uretiyor, 8 bitlik bir
    // hedefe yazarsak bunlar kirpilir ve varyans oldugundan kucuk cikar.
    const laplacian = track(new cv.Mat())
    cv.Laplacian(gray, laplacian, cv.CV_64F, 1, 1, 0, cv.BORDER_DEFAULT)

    const mean = track(new cv.Mat())
    const stddev = track(new cv.Mat())
    cv.meanStdDev(laplacian, mean, stddev)

    // meanStdDev standart SAPMA veriyor; varyans onun karesi.
    const variance = stddev.data64F[0] ** 2

    return {
      variance: Math.round(variance * 100) / 100,
      isBlurry: variance < BLUR_THRESHOLD,
      threshold: BLUR_THRESHOLD,
    }
  })
}

/** Dosyadan okuyup olcer — form bu sarmalayiciyi kullaniyor. */
export async function measureBlurFromFile(file) {
  const { image, revoke } = await fileToImage(file)
  try {
    return await measureBlur(image)
  } finally {
    revoke()
  }
}

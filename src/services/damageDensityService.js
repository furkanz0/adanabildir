/**
 * Hasar yogunlugu analizi (OpenCV.js).
 *
 * Yapay zeka kategori tahmininden (src/services/aiService.js) TAMAMEN AYRI bir
 * adim. O "bu ne?" sorusuna cevap veriyor, bu "gorselin ortasinda ne kadar
 * duzensiz/koyu doku var?" sorusuna.
 *
 * Colab'da Python/OpenCV ile gelistirilen algoritmanin karsiligi:
 *
 *   gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
 *   h, w = gray.shape
 *   y1, y2 = int(h*0.2), int(h*0.8)
 *   x1, x2 = int(w*0.2), int(w*0.8)
 *   merkez_bolge = gray[y1:y2, x1:x2]
 *   blurred = cv2.GaussianBlur(merkez_bolge, (7,7), 0)
 *   thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
 *                                    cv2.THRESH_BINARY_INV, 21, 5)
 *   oran = np.sum(thresh > 0) / thresh.size
 *
 * Tek kasitli fark: girdi once sabit bir boya olcekleniyor
 * (bkz. MAX_ANALYSIS_SIDE, src/services/opencv.js).
 */
import {
  fileToImage,
  getCv,
  loadOpenCv,
  toAnalysisCanvas,
  withMats,
} from './opencv'

/**
 * Bu analizin uygulandigi kategori.
 *
 * Algoritmanin kendisi kategori bilmiyor — her fotografta bir sayi uretir ve
 * cop fotograflarinda da anlamli degerler cikiyor (olctuk: %24-%41). Ama
 * "hasar yogunlugu" bir cop yigini icin dogru bir ifade degil; cop bir hasar
 * degil. Kapsami cukura sabitleyip olcumu tek ve net anlamli tutuyoruz.
 */
export const DENSITY_CATEGORY = 'cukur'

/** Kenarlardan atilan pay. 0.2 -> ortadaki %60'lik kare inceleniyor. */
export const ROI_RATIO = 0.2

/** adaptiveThreshold komsuluk boyutu — tek sayi olmali. */
const BLOCK_SIZE = 21
/** adaptiveThreshold sabiti: ortalamadan cikarilan deger. */
const THRESHOLD_C = 5
/** GaussianBlur cekirdegi. */
const BLUR_KSIZE = 7

/**
 * Gorselin merkezindeki %60'lik bolgede koyu/duzensiz piksel oranini olcer.
 *
 * @param {HTMLImageElement|HTMLCanvasElement} imageElement
 * @returns {Promise<{density: number, width: number, height: number}>}
 *   density 0-1 arasi ondalik
 */
export async function calculateDamageDensity(imageElement) {
  if (!imageElement) throw new Error('Analiz edilecek görsel bulunamadı.')

  await loadOpenCv()
  const cv = getCv()
  const canvas = toAnalysisCanvas(imageElement)

  return withMats((track) => {
    const source = track(cv.imread(canvas))
    const gray = track(new cv.Mat())
    // Canvas RGBA veriyor — Python'daki BGR2GRAY'in tarayici karsiligi bu.
    cv.cvtColor(source, gray, cv.COLOR_RGBA2GRAY, 0)

    // Python'daki int() kesme davranisiyla ayni olsun diye Math.floor
    const x1 = Math.floor(gray.cols * ROI_RATIO)
    const y1 = Math.floor(gray.rows * ROI_RATIO)
    const x2 = Math.floor(gray.cols * (1 - ROI_RATIO))
    const y2 = Math.floor(gray.rows * (1 - ROI_RATIO))
    const roiWidth = x2 - x1
    const roiHeight = y2 - y1

    if (roiWidth < BLOCK_SIZE || roiHeight < BLOCK_SIZE) {
      throw new Error('Görsel analiz için fazla küçük.')
    }

    const roi = track(gray.roi(new cv.Rect(x1, y1, roiWidth, roiHeight)))

    const blurred = track(new cv.Mat())
    cv.GaussianBlur(
      roi,
      blurred,
      new cv.Size(BLUR_KSIZE, BLUR_KSIZE),
      0,
      0,
      cv.BORDER_DEFAULT,
    )

    const thresh = track(new cv.Mat())
    cv.adaptiveThreshold(
      blurred,
      thresh,
      255,
      cv.ADAPTIVE_THRESH_GAUSSIAN_C,
      cv.THRESH_BINARY_INV,
      BLOCK_SIZE,
      THRESHOLD_C,
    )

    const marked = cv.countNonZero(thresh)
    const total = thresh.rows * thresh.cols
    const density = total > 0 ? marked / total : 0

    return {
      // 4 basamak yeterli: arayuz zaten yuzdeyi tek ondalikla gosteriyor.
      density: Math.round(density * 10000) / 10000,
      width: canvas.width,
      height: canvas.height,
    }
  })
}

/** Dosyadan okuyup analiz eder — form bu sarmalayiciyi kullaniyor. */
export async function calculateDamageDensityFromFile(file) {
  const { image, revoke } = await fileToImage(file)
  try {
    return await calculateDamageDensity(image)
  } finally {
    revoke()
  }
}

/**
 * 0-1 arasi orani yuzde metnine cevirir. Form ve detay sayfasi ayni
 * bicimi kullansin diye tek yerde.
 */
export function formatDensityPercent(density) {
  if (!Number.isFinite(density)) return null
  return `%${(density * 100).toFixed(1)}`
}

// Geriye donuk: bazi cagiranlar bunlari bu modulden aliyordu.
export { MAX_ANALYSIS_SIDE, isOpenCvReady, loadOpenCv, getCv } from './opencv'

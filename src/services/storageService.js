// Gorsel depolama servisi.
//
// Firebase Storage yerine Cloudinary kullaniliyor: yeni Firebase projelerinde
// Storage'i etkinlestirmek Blaze planina (kredi karti) gecmeyi gerektiriyor,
// bu proje ise tamamen ucretsiz kalmali. Cagiran taraf bunu bilmez; tek
// bilmesi gereken uploadReportImage() fonksiyonu. Ileride saglayici
// degistirilirse sadece bu dosya degisir.

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export const isUploadConfigured = Boolean(
  CLOUD_NAME?.trim() && UPLOAD_PRESET?.trim(),
)

export const MAX_IMAGE_BYTES = 10 * 1024 * 1024 // 10 MB

const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`

/**
 * Secilen dosyayi yuklemeden once dogrular.
 * @returns {string|null} hata mesaji, sorun yoksa null
 */
export function validateImageFile(file) {
  if (!file) return 'Lütfen bir fotoğraf seçin.'

  if (!file.type.startsWith('image/')) {
    return 'Yalnızca görsel dosyası yükleyebilirsiniz (JPG, PNG, WEBP).'
  }

  if (file.size > MAX_IMAGE_BYTES) {
    const mb = (file.size / 1024 / 1024).toFixed(1)
    return `Görsel çok büyük (${mb} MB). En fazla 10 MB olabilir.`
  }

  return null
}

function parseCloudinaryError(responseText, statusCode) {
  try {
    const parsed = JSON.parse(responseText)
    if (parsed?.error?.message) return parsed.error.message
  } catch {
    // JSON degilse asagidaki genel mesaja duseriz
  }
  return `Görsel yüklenemedi (HTTP ${statusCode}).`
}

/**
 * Bir gorseli Cloudinary'ye yukler ve erisilebilir URL'i dondurur.
 *
 * fetch() yerine XMLHttpRequest kullaniliyor cunku yukleme ilerlemesini
 * (progress) yalnizca XHR raporlayabiliyor; kullaniciya yuzde gosterebilmek
 * icin buna ihtiyacimiz var.
 *
 * @param {File} file yuklenecek gorsel
 * @param {string} userId bildirimi olusturan kullanicinin UID'i
 * @param {{ onProgress?: (percent: number) => void }} [options]
 * @returns {Promise<string>} yuklenen gorselin URL'i
 */
export function uploadReportImage(file, userId, { onProgress } = {}) {
  if (!isUploadConfigured) {
    return Promise.reject(
      new Error(
        'Görsel yükleme yapılandırılmamış. .env dosyasına VITE_CLOUDINARY_CLOUD_NAME ve VITE_CLOUDINARY_UPLOAD_PRESET değerlerini ekleyin.',
      ),
    )
  }

  const validationError = validateImageFile(file)
  if (validationError) return Promise.reject(new Error(validationError))

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'vatandas-bildirim')
  if (userId) formData.append('tags', userId)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', UPLOAD_URL)

    xhr.upload.onprogress = (event) => {
      if (!event.lengthComputable) return
      onProgress?.(Math.round((event.loaded / event.total) * 100))
    }

    xhr.onload = () => {
      if (xhr.status < 200 || xhr.status >= 300) {
        reject(new Error(parseCloudinaryError(xhr.responseText, xhr.status)))
        return
      }

      try {
        const data = JSON.parse(xhr.responseText)
        if (!data.secure_url) {
          reject(new Error('Cloudinary yanıtında görsel URL\'i bulunamadı.'))
          return
        }
        onProgress?.(100)
        resolve(data.secure_url)
      } catch {
        reject(new Error('Cloudinary yanıtı okunamadı.'))
      }
    }

    xhr.onerror = () =>
      reject(new Error('Görsel yüklenirken ağ hatası oluştu. Bağlantınızı kontrol edin.'))

    xhr.ontimeout = () => reject(new Error('Görsel yükleme zaman aşımına uğradı.'))

    xhr.timeout = 60000
    xhr.send(formData)
  })
}

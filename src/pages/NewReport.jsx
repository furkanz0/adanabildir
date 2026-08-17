import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Camera,
  Check,
  CircleHelp,
  Crosshair,
  MapPin,
  RefreshCw,
  Ruler,
  ScanEye,
  Send,
  Sparkles,
  TriangleAlert,
} from 'lucide-react'
import CategoryBadge from '../components/CategoryBadge'
import LocationPicker from '../components/LocationPicker'
import Spinner from '../components/Spinner'
import StatusBadge from '../components/StatusBadge'
import { CATEGORIES, getCategory } from '../constants'
import { DISTRICTS } from '../constants/districts'
import { useAuth } from '../context/useAuth'
import { suggestDistrict } from '../utils/district'
import { predictCategory } from '../services/aiService'
import {
  DENSITY_CATEGORY,
  calculateDamageDensityFromFile,
  formatDensityPercent,
} from '../services/damageDensityService'
import { measureBlurFromFile } from '../services/imageQualityService'
import { createReport, subscribeToReports } from '../services/reportsService'
import { formatDateTime } from '../utils/date'
import { revealField, revealFirstError } from '../utils/formFocus'
import {
  NEARBY_RADIUS_METERS,
  findNearbyReports,
  formatDistance,
} from '../utils/geo'
import { referenceCode } from '../utils/reference'
import {
  isUploadConfigured,
  uploadReportImage,
  validateImageFile,
} from '../services/storageService'

const MIN_DESCRIPTION_LENGTH = 5

function geolocationErrorMessage(error) {
  const suffix = ' Konumu aşağıdaki haritadan da seçebilirsiniz.'

  switch (error?.code) {
    case 1:
      return `Konum izni reddedildi.${suffix}`
    case 2:
      // Kurumsal cihazlarda konum servisi yonetici tarafindan kapatilmis
      // olabilir; bu durumda tarayici bu kodu doner.
      return `Konum bilgisi alınamadı. Cihazınızın konum servisi kapalı olabilir.${suffix}`
    case 3:
      return `Konum alma işlemi zaman aşımına uğradı.${suffix}`
    default:
      return `Konum alınamadı.${suffix}`
  }
}

function Step({ number, title, children }) {
  return (
    <section className="form-step">
      <header className="form-step__header">
        <span className="form-step__number" aria-hidden="true">
          {number}
        </span>
        <h2 className="form-step__title">{title}</h2>
      </header>
      {children}
    </section>
  )
}

export default function NewReport() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [file, setFile] = useState(null)
  const [previewUrl, setPreviewUrl] = useState(null)
  const [description, setDescription] = useState('')
  const [category, setCategory] = useState('')
  const [district, setDistrict] = useState('')
  // Konum desteklenen 4 ilcenin disindaysa kullaniciyi bilgilendiriyoruz
  const [districtOutOfArea, setDistrictOutOfArea] = useState(false)
  // Kullanici ilceyi elle sectiyse otomatik oneri artik ustune yazmamali
  const districtTouchedRef = useRef(false)

  const [prediction, setPrediction] = useState(null)
  const [predicting, setPredicting] = useState(false)

  // Hasar yogunlugu: 0-1 arasi oran, ve hesaplamanin durumu
  const [density, setDensity] = useState(null)
  const [densityStatus, setDensityStatus] = useState('idle') // idle|loading|done|error

  // Bulaniklik: yalnizca uyari amacli, gonderimi engellemiyor
  const [blur, setBlur] = useState(null)

  const [coords, setCoords] = useState(null)
  const [coordsSource, setCoordsSource] = useState(null) // 'gps' | 'manual'
  const [geoStatus, setGeoStatus] = useState('idle')
  const [geoError, setGeoError] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)

  // Mukerrer bildirim uyarisi icin mevcut kayitlar. Firestore yaricap sorgusu
  // yapamadigindan (geohash gerekir) tum kayitlari cekip mesafeyi istemcide
  // hesapliyoruz. Bu olcekte sorun degil; binlerce kayda cikarsa geohash
  // tabanli bir sorguya gecmek gerekir.
  const [allReports, setAllReports] = useState([])

  const [submitting, setSubmitting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [fieldErrors, setFieldErrors] = useState({})
  const [formError, setFormError] = useState('')
  // Mukerrer bildirim onayi: soru gosteriliyor mu, ve kullanici "yine de"
  // dedi mi. Ikisi ayri cunku onay verildikten sonra soru kapaniyor ama
  // karar hatirlanmali.
  const [duplicateConfirm, setDuplicateConfirm] = useState(false)
  const [duplicateAccepted, setDuplicateAccepted] = useState(false)

  // Onizleme icin uretilen object URL'i elle serbest birakmamiz gerekiyor,
  // yoksa her yeni fotografta bellekte birikirler.
  const previewUrlRef = useRef(null)
  // Kullanici hizlica ikinci bir fotograf secerse, once baslayan tahminin
  // gec gelip yenisinin uzerine yazmasini engelliyoruz.
  const predictionTokenRef = useRef(0)
  // Hizli hizli fotograf degistirilirse eski analiz sonucu yenisini ezmesin
  const densityTokenRef = useRef(0)
  // Hangi dosya icin hesaplandi — kategori cukur -> cop -> cukur diye
  // degistiginde ayni fotografi bastan hesaplamayalim
  const densityFileRef = useRef(null)
  const blurTokenRef = useRef(0)

  const requestLocation = useCallback(() => {
    if (!('geolocation' in navigator)) {
      setGeoStatus('error')
      setGeoError('Tarayıcınız konum servisini desteklemiyor.')
      setPickerOpen(true)
      return
    }

    setGeoStatus('loading')
    setGeoError('')

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
        })
        setCoordsSource('gps')
        setGeoStatus('success')
      },
      (error) => {
        setGeoStatus('error')
        setGeoError(geolocationErrorMessage(error))
        // Otomatik konum yoksa kullaniciyi cikmaza sokmayalim: haritayi acip
        // elle secmesini isteyelim.
        setPickerOpen(true)
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
    )
  }, [])

  useEffect(() => {
    requestLocation()
  }, [requestLocation])

  useEffect(() => {
    // Hata durumunda sessiz kaliyoruz: yakinlik uyarisi yardimci bir ozellik,
    // calismamasi bildirim gondermeyi engellememeli.
    const unsubscribe = subscribeToReports(setAllReports, (error) =>
      console.warn('[nearby] mevcut bildirimler alınamadı:', error),
    )
    return unsubscribe
  }, [])

  const nearbyReports = useMemo(
    () => (coords ? findNearbyReports(allReports, coords, { category }) : []),
    [allReports, coords, category],
  )

  const nearbySameCategory = useMemo(
    () => nearbyReports.filter((report) => report.sameCategory).length,
    [nearbyReports],
  )

  // Hasar yogunlugu yalnizca cukur bildirimlerinde — bkz. DENSITY_CATEGORY
  const densityApplies = category === DENSITY_CATEGORY

  // Hesaplama kategori kesinlestikten SONRA basliyor. Boylece cop secilen bir
  // fotograf icin OpenCV hic calismiyor; kullanici kategoriyi elle cukura
  // cevirirse o an devreye giriyor.
  useEffect(() => {
    if (!file || !densityApplies) return
    if (densityFileRef.current === file) return // bu dosya icin zaten yapildi

    densityFileRef.current = file
    runDensity(file)
    // runDensity bilerek bagimlilik degil: her render'da yeniden olusan bir
    // fonksiyon, effect'i sonsuz donguye sokardi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file, densityApplies])

  // Konum veya kategori degisince yakindaki kayitlar da degisiyor; onceki
  // onay artik baska bir soruya verilmis cevap. Sifirliyoruz ki kullanici
  // yeni durumu gorup yeniden karar versin.
  useEffect(() => {
    setDuplicateConfirm(false)
    setDuplicateAccepted(false)
  }, [coords, category])

  // Konum belli olunca ilceyi tahmin et.
  // Kullanici dropdown'a bir kez dokunduysa artik ustune yazmiyoruz — kendi
  // secimi otomatik tahminden onceliklidir.
  useEffect(() => {
    if (!coords) return

    const suggestion = suggestDistrict(coords.latitude, coords.longitude)
    setDistrictOutOfArea(!suggestion)

    if (suggestion && !districtTouchedRef.current) {
      setDistrict(suggestion)
      setFieldErrors((prev) => ({ ...prev, district: '' }))
    }
  }, [coords])

  useEffect(
    () => () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    },
    [],
  )

  function handlePickLocation(latitude, longitude) {
    setCoords({ latitude, longitude, accuracy: null })
    setCoordsSource('manual')
    setFormError('')
  }

  async function runPrediction(selectedFile) {
    const token = predictionTokenRef.current + 1
    predictionTokenRef.current = token

    setPredicting(true)
    setPrediction(null)

    try {
      const result = await predictCategory(selectedFile)
      if (token !== predictionTokenRef.current) return // eskimis tahmin

      setPrediction(result)
      setCategory(result.category) // otomatik doldur, kullanici degistirebilir
    } catch (error) {
      console.warn('[ai] tahmin hatası:', error)
    } finally {
      if (token === predictionTokenRef.current) setPredicting(false)
    }
  }

  /**
   * Hasar yogunlugu analizi. Kategori tahmininden bagimsiz calisiyor ve
   * BASARISIZ OLMASI bildirim gonderimini engellemiyor — OpenCV.js CDN'den
   * geliyor, inmeyebilir. O durumda alan bos kaliyor, form calismaya devam
   * ediyor.
   */
  async function runDensity(selectedFile) {
    const token = densityTokenRef.current + 1
    densityTokenRef.current = token

    setDensity(null)
    setDensityStatus('loading')

    try {
      const result = await calculateDamageDensityFromFile(selectedFile)
      if (token !== densityTokenRef.current) return // eskimis sonuc

      setDensity(result.density)
      setDensityStatus('done')
    } catch (error) {
      if (token !== densityTokenRef.current) return
      console.warn('[density] hasar yoğunluğu hesaplanamadı:', error)
      setDensityStatus('error')
    }
  }

  function handleFileChange(event) {
    const selected = event.target.files?.[0]
    if (!selected) return

    const validationError = validateImageFile(selected)
    if (validationError) {
      setFieldErrors((prev) => ({ ...prev, image: validationError }))
      return
    }

    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    const objectUrl = URL.createObjectURL(selected)
    previewUrlRef.current = objectUrl

    setFile(selected)
    setPreviewUrl(objectUrl)
    setFieldErrors((prev) => ({ ...prev, image: '' }))
    setFormError('')

    // Yogunluk burada baslatilmiyor: yalnizca kategori "cukur" oldugunda
    // calisiyor ve kategori bu noktada henuz belli degil (yapay zeka tahmini
    // suruyor). Asagidaki effect ikisini de bekliyor.
    densityFileRef.current = null
    setDensity(null)
    setDensityStatus('idle')
    setBlur(null)

    runPrediction(selected)
    // Bulaniklik kategoriden bagimsiz: her fotograf bulanik olabilir.
    runBlurCheck(selected)
  }

  /**
   * Netlik kontrolu. Basarisiz olursa sessizce geciliyor — bu bir yardimci
   * uyari, bildirim gonderimini hicbir sekilde engellemiyor.
   */
  async function runBlurCheck(selectedFile) {
    const token = blurTokenRef.current + 1
    blurTokenRef.current = token

    try {
      const result = await measureBlurFromFile(selectedFile)
      // Bu arada baska bir fotograf secildiyse sonucu atiyoruz
      if (token !== blurTokenRef.current) return
      setBlur(result)
    } catch (error) {
      console.warn('[quality] netlik ölçülemedi:', error)
    }
  }

  function validateDescription(value) {
    const trimmed = value.trim()
    if (!trimmed) return 'Lütfen sorunu kısaca açıklayın.'
    if (trimmed.length < MIN_DESCRIPTION_LENGTH)
      return `Açıklama en az ${MIN_DESCRIPTION_LENGTH} karakter olmalı.`
    return ''
  }

  function validate() {
    const errors = {}

    if (!file) errors.image = 'Lütfen bir fotoğraf seçin.'
    if (!category) errors.category = 'Lütfen bir kategori seçin.'
    if (!district) errors.district = 'Lütfen bir ilçe seçin.'

    const message = validateDescription(description)
    if (message) errors.description = message

    return errors
  }

  async function handleSubmit(event) {
    event.preventDefault()

    const errors = validate()
    setFieldErrors(errors)

    if (Object.keys(errors).length > 0) {
      // Sira DOM sirasiyla ayni: kullanici ilk sorunu en yukaridakinden
      // gormeli, hangisi once dogrulanmissa o degil.
      revealFirstError([
        { id: 'photo', error: errors.image },
        { id: 'category', error: errors.category },
        { id: 'district', error: errors.district },
        { id: 'description', error: errors.description },
      ])
      return
    }

    if (!coords) {
      setFormError(
        'Konumunuz alınamadı. Bildirimin haritada gösterilebilmesi için konum gerekli.',
      )
      // Uyari kutusu formun basinda; odaklanilabilir bir oge degil, yalnizca
      // ekrana getiriyoruz.
      revealField('report-form-error', { focus: false })
      return
    }

    // Yakinda ayni kategoride kayit varsa once soruyoruz. Kullanici "yine de"
    // dedikten sonra tekrar sormuyoruz — yukleme hata verip yeniden
    // denedigimizde ayni soruyu bir daha sormak sinir bozucu olurdu.
    if (nearbyReports.length > 0 && !duplicateAccepted) {
      setDuplicateConfirm(true)
      revealField('nearby-confirm')
      return
    }

    await submitReport()
  }

  /** Onay adimindaki "Evet, yine de gonder". */
  function handleConfirmDuplicate() {
    setDuplicateAccepted(true)
    setDuplicateConfirm(false)
    // Dogrudan cagiriyoruz: state guncellemesinin bu tik icinde gorunmesini
    // bekleyemeyiz, submitReport zaten kendi kontrollerini yapmiyor.
    submitReport()
  }

  async function submitReport() {
    setSubmitting(true)
    setProgress(0)
    setFormError('')

    try {
      const imageUrl = await uploadReportImage(file, user.uid, {
        onProgress: setProgress,
      })

      await createReport({
        userId: user.uid,
        category,
        district,
        description,
        imageUrl,
        latitude: coords.latitude,
        longitude: coords.longitude,
        // Cukur disindaki kategorilerde hic hesaplanmiyor; hesaplanamadiysa da
        // null gidiyor — bildirim her durumda olusuyor
        damageDensity: densityApplies ? density : null,
      })

      navigate('/', {
        replace: true,
        state: { toast: 'Bildiriminiz alındı. Teşekkür ederiz!' },
      })
    } catch (error) {
      console.error('[report] olusturma hatasi:', error)
      setFormError(error.message ?? 'Bildirim gönderilemedi.')
      setSubmitting(false)
    }
  }

  const predictedCategory = prediction ? getCategory(prediction.category) : null

  return (
    <div className="page">
      <form className="form-card" onSubmit={handleSubmit} noValidate>
        <header className="form-card__header">
          <h1 className="form-card__title">Yeni Bildirim</h1>
          <p className="form-card__subtitle">
            Fotoğrafı çekin, kısaca açıklayın — konumunuz otomatik eklenir.
          </p>
        </header>

        {!isUploadConfigured ? (
          <div className="alert alert--warning">
            Görsel yükleme yapılandırılmamış. <code>.env</code> dosyasına{' '}
            <code>VITE_CLOUDINARY_CLOUD_NAME</code> ve{' '}
            <code>VITE_CLOUDINARY_UPLOAD_PRESET</code> değerlerini ekleyip
            sunucuyu yeniden başlatın. Formu doldurabilir ama gönderemezsiniz.
          </div>
        ) : null}

        {formError ? (
          <div id="report-form-error" className="alert alert--error" role="alert">
            {formError}
          </div>
        ) : null}

        {/* --- 1. fotograf --- */}
        <Step number="1" title="Fotoğraf">
          <div className="field">
            <label className="field__label" htmlFor="photo">
              Sorunun fotoğrafı
            </label>
            <input
              id="photo"
              type="file"
              accept="image/*"
              capture="environment"
              className="input input--file"
              onChange={handleFileChange}
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.image)}
              aria-describedby={
                fieldErrors.image ? 'photo-error' : 'photo-hint'
              }
            />
            {fieldErrors.image ? (
              <span id="photo-error" className="field__error" role="alert">
                {fieldErrors.image}
              </span>
            ) : (
              <span id="photo-hint" className="field__hint">
                Telefonda bu alan doğrudan kamerayı açar. En fazla 10 MB.
              </span>
            )}
          </div>

          {previewUrl ? (
            <div className="preview">
              {/* Çerçeve önizlemede de görünüyor: kullanıcı hangi bölgenin
                  ölçüldüğünü gönderimden ÖNCE görüyor, gerekirse fotoğrafı
                  yeniden çekebiliyor. Detay sayfası ve harita paneliyle aynı
                  bileşen. */}
              <div className="preview__frame">
                <img
                  className="preview__image"
                  src={previewUrl}
                  alt="Seçilen fotoğraf önizlemesi"
                />

                {densityApplies &&
                densityStatus === 'done' &&
                Number.isFinite(density) ? (
                  <div className="roi-overlay" aria-hidden="true">
                    <span className="roi-overlay__label">
                      Hasar Yoğunluğu: {formatDensityPercent(density)}
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {/* Netlik uyarisi — ENGELLEYICI DEGIL. Laplacian varyansi sahne
              dokusuna da bagli: duz asfalt gibi az kenarli bir fotograf odagi
              tam olsa bile dusuk deger uretebiliyor. Karari kullaniciya
              birakiyoruz, elindeki tek fotograf o olabilir. */}
          {blur?.isBlurry ? (
            <div className="quality" role="status">
              <span className="quality__icon" aria-hidden="true">
                <ScanEye size={16} />
              </span>
              <div>
                <p className="quality__line">
                  Fotoğraf net görünmüyor — mümkünse tekrar çeker misiniz?
                </p>
                <p className="quality__note">
                  Ekipler sorunu fotoğraftan tanıyabilmeli. Yine de bu
                  fotoğrafla devam edebilirsiniz.
                </p>
              </div>
            </div>
          ) : null}
        </Step>

        {/* --- 2. yapay zeka --- */}
        <Step number="2" title="Yapay zeka tahmini">
          {predicting ? (
            <div className="predict-box predict-box--loading">
              <Spinner label="Yapay zeka görseli analiz ediyor…" />
            </div>
          ) : prediction?.lowConfidence ? (
            /* Model esik altinda kaldi. Yuzde gostermek burada yaniltici
               olurdu: "%58 ihtimalle Diğer" gibi bir cumle, modelin 'diger'
               diye bir sinifi varmis izlenimi verir — oysa emin olamadigi
               icin oraya dusuruldu. */
            <div className="predict-box predict-box--uncertain">
              <span className="predict-box__icon" aria-hidden="true">
                <CircleHelp size={17} />
              </span>
              <div>
                <p className="predict-box__text">
                  Yapay zeka bu görseli net bir şekilde sınıflandıramadı,
                  lütfen kategoriyi elle seçin.
                </p>
                <p className="predict-box__note">
                  Kategori <strong>“Diğer”</strong> olarak bırakıldı. Model
                  yalnızca çukur ve çöp tanıyor; emin olmadığı görselleri
                  tahmin etmiyor.
                </p>
              </div>
            </div>
          ) : prediction ? (
            <div className="predict-box">
              <span className="predict-box__icon" aria-hidden="true">
                <Sparkles size={17} />
              </span>
              <div>
                <p className="predict-box__text">
                  Yapay zeka bu görseli{' '}
                  <span className="predict-box__confidence">
                    %{prediction.confidence}
                  </span>{' '}
                  ihtimalle <strong>“{predictedCategory.label}”</strong> olarak
                  tahmin etti.
                </p>
                {prediction.source === 'mock' ? (
                  <p className="predict-box__note">
                    Model dosyaları henüz eklenmediği için bu örnek bir
                    tahmindir. Gerçek model <code>public/model/</code> klasörüne
                    kopyalandığında otomatik devreye girer.
                  </p>
                ) : (
                  <p className="predict-box__note">
                    Model etiketi: <code>{prediction.label}</code>. Yanlışsa
                    aşağıdan değiştirebilirsiniz.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="field__hint">
              <Camera
                size={14}
                aria-hidden="true"
                style={{ verticalAlign: '-2px', marginRight: '6px' }}
              />
              Fotoğraf seçtiğinizde kategori otomatik tahmin edilecek.
            </p>
          )}

          {/* Hasar yoğunluğu — kategori tahmininden ayrı bir görüntü işleme
              adımı (OpenCV.js). Salt bilgi: kullanıcı değiştiremiyor, gönderimi
              etkilemiyor. Hesaplanamazsa satır hiç görünmüyor; bildirim yine
              oluşturulabiliyor. */}
          {!densityApplies ? null : densityStatus === 'loading' ? (
            <div className="density density--loading">
              <Spinner label="Hasar yoğunluğu hesaplanıyor…" />
            </div>
          ) : densityStatus === 'done' ? (
            <div className="density">
              <span className="density__icon" aria-hidden="true">
                <Ruler size={15} />
              </span>
              <div>
                <p className="density__line">
                  Hesaplanan hasar yoğunluğu:{' '}
                  <strong className="density__value">
                    {formatDensityPercent(density)}
                  </strong>
                </p>
                <p className="density__note">
                  Görselin ortasındaki %60’lık alanda ölçülen koyu/düzensiz doku
                  oranı. Yalnızca çukur bildirimlerinde hesaplanır, bildirimle
                  birlikte kaydedilir.
                </p>
              </div>
            </div>
          ) : null}
        </Step>

        {/* --- 3. detaylar --- */}
        <Step number="3" title="Detaylar">
          <div className="field">
            <label className="field__label" htmlFor="category">
              Kategori
            </label>
            <select
              id="category"
              className={fieldErrors.category ? 'input input--invalid' : 'input'}
              value={category}
              onChange={(event) => {
                setCategory(event.target.value)
                setFieldErrors((prev) => ({ ...prev, category: '' }))
              }}
              onBlur={(event) =>
                setFieldErrors((prev) => ({
                  ...prev,
                  category: event.target.value
                    ? ''
                    : 'Lütfen bir kategori seçin.',
                }))
              }
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.category)}
              aria-describedby={
                fieldErrors.category ? 'category-error' : undefined
              }
            >
              <option value="">Seçiniz…</option>
              {Object.entries(CATEGORIES).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
            {fieldErrors.category ? (
              <span id="category-error" className="field__error" role="alert">
                {fieldErrors.category}
              </span>
            ) : null}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="district">
              İlçe
            </label>
            <select
              id="district"
              className={fieldErrors.district ? 'input input--invalid' : 'input'}
              value={district}
              onChange={(event) => {
                districtTouchedRef.current = true
                setDistrict(event.target.value)
                setFieldErrors((prev) => ({ ...prev, district: '' }))
              }}
              onBlur={(event) =>
                setFieldErrors((prev) => ({
                  ...prev,
                  district: event.target.value ? '' : 'Lütfen bir ilçe seçin.',
                }))
              }
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.district)}
              aria-describedby={
                fieldErrors.district ? 'district-error' : 'district-hint'
              }
            >
              <option value="">Seçiniz…</option>
              {DISTRICTS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            {fieldErrors.district ? (
              <span id="district-error" className="field__error" role="alert">
                {fieldErrors.district}
              </span>
            ) : districtOutOfArea ? (
              <span id="district-hint" className="field__hint">
                Konumunuz şu an desteklenen 4 merkez ilçenin dışında görünüyor.
                Listeden size en yakın ilçeyi seçebilirsiniz.
              </span>
            ) : (
              <span id="district-hint" className="field__hint">
                Konumunuza göre otomatik seçildi — yanlışsa değiştirebilirsiniz.
              </span>
            )}
          </div>

          <div className="field">
            <label className="field__label" htmlFor="description">
              Açıklama
            </label>
            <textarea
              id="description"
              rows={4}
              className={
                fieldErrors.description ? 'input input--invalid' : 'input'
              }
              value={description}
              onChange={(event) => {
                setDescription(event.target.value)
                setFieldErrors((prev) => ({ ...prev, description: '' }))
              }}
              // Alandan çıkınca doğrula — gönderime kadar bekletme
              onBlur={(event) =>
                setFieldErrors((prev) => ({
                  ...prev,
                  description: validateDescription(event.target.value),
                }))
              }
              placeholder="Örn. Kaldırımın ortasında derin bir çukur var, yayalar için tehlikeli."
              disabled={submitting}
              aria-invalid={Boolean(fieldErrors.description)}
              aria-describedby={
                fieldErrors.description ? 'description-error' : 'description-hint'
              }
            />
            {fieldErrors.description ? (
              <span id="description-error" className="field__error" role="alert">
                {fieldErrors.description}
              </span>
            ) : (
              <span id="description-hint" className="field__hint">
                Sorunu kısaca anlatın: nerede, ne zamandır var, kimi etkiliyor.
              </span>
            )}
          </div>
        </Step>

        {/* --- 4. konum --- */}
        <Step number="4" title="Konum">
          {geoStatus === 'loading' ? (
            <div className="geo">
              <Spinner label="Konumunuz alınıyor…" />
            </div>
          ) : null}

          {coords ? (
            <div className="geo geo--ok">
              <Check size={16} aria-hidden="true" />
              <span>
                {coordsSource === 'gps'
                  ? 'Konum alındı'
                  : 'Konum haritadan seçildi'}{' '}
                —{' '}
                <span className="geo__coords">
                  {coords.latitude.toFixed(5)}, {coords.longitude.toFixed(5)}
                </span>
                {coords.accuracy ? ` (±${Math.round(coords.accuracy)} m)` : ''}
              </span>
            </div>
          ) : null}

          {geoStatus === 'error' && !coords ? (
            <div className="geo geo--error">
              <TriangleAlert size={16} aria-hidden="true" />
              <span>{geoError}</span>
            </div>
          ) : null}

          <div className="geo__actions">
            {geoStatus === 'error' ? (
              <button
                type="button"
                className="btn btn--sm btn--outline"
                onClick={requestLocation}
                disabled={submitting}
              >
                <RefreshCw size={14} aria-hidden="true" />
                Otomatik konumu tekrar dene
              </button>
            ) : null}

            <button
              type="button"
              className="btn btn--sm btn--outline"
              onClick={() => setPickerOpen((open) => !open)}
              disabled={submitting}
            >
              {coords ? (
                <Crosshair size={14} aria-hidden="true" />
              ) : (
                <MapPin size={14} aria-hidden="true" />
              )}
              {pickerOpen
                ? 'Haritayı kapat'
                : coords
                  ? 'Haritadan düzelt'
                  : 'Haritadan seç'}
            </button>
          </div>

          {pickerOpen ? (
            <LocationPicker value={coords} onChange={handlePickLocation} />
          ) : null}
        </Step>

        {/* Mükerrer bildirim uyarısı. Gönderim butonunun hemen üstünde duruyor
            ki karar anında görülsün.

            Önce yalnızca bilgilendiriyordu ve gönderim doğrudan geçiyordu;
            kullanıcı uyarıyı görmeden kaydı oluşturabiliyordu. Artık gönderime
            basıldığında burada duruyor ve açık bir soru soruyor.

            Tarayıcının confirm() penceresi yerine satır içi onay: kullanıcının
            karar verebilmesi için yakındaki kayıtları GÖRMESİ gerekiyor, bir
            iletişim kutusu tam da onları örterdi. Silme onayında da aynı
            gerekçeyle bu desen kullanılıyor. */}
        {nearbyReports.length > 0 ? (
          <div
            id="nearby-confirm"
            className={
              duplicateConfirm ? 'nearby nearby--confirming' : 'nearby'
            }
            tabIndex={-1}
          >
            <p className="nearby__title">
              Bu konumun {NEARBY_RADIUS_METERS} metre yakınında{' '}
              {nearbySameCategory > 0 ? 'aynı kategoride ' : ''}
              {nearbyReports.length === 1
                ? 'bir bildirim'
                : `${nearbyReports.length} bildirim`}{' '}
              zaten var
            </p>

            <ul className="nearby__list">
              {nearbyReports.slice(0, 3).map((report) => (
                <li key={report.id} className="nearby__item">
                  <Link
                    to={`/report/${report.id}`}
                    className="nearby__ref"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {referenceCode(report.id)}
                  </Link>
                  {/* Kategori rozeti artik sart: liste tek kategoriden
                      olusmuyor, kullanici hangisinin kendi bildirimiyle
                      ayni sorun oldugunu buradan ayirt ediyor. */}
                  <CategoryBadge category={report.category} />
                  <StatusBadge status={report.status} variant="soft" />
                  <span className="nearby__meta">
                    {formatDistance(report.distance)} uzakta ·{' '}
                    {formatDateTime(report.createdAtMillis)}
                  </span>
                </li>
              ))}
            </ul>

            {duplicateConfirm ? (
              <div className="nearby__confirm" role="alert">
                <p className="nearby__question">
                  Yine de yeni bir bildirim oluşturulsun mu?
                </p>
                <p className="nearby__note">
                  {nearbySameCategory > 0
                    ? 'Aynı sorunu kastediyorsanız yukarıdaki kayıttan durumu takip edebilirsiniz — yeniden bildirmeye gerek yok. Farklı bir sorun bildiriyorsanız devam edin.'
                    : 'Yakındaki kayıtlar farklı kategoride. Aynı noktada başka bir sorun bildiriyorsanız devam edin.'}
                </p>
                <div className="nearby__actions">
                  <button
                    type="button"
                    className="btn btn--accent btn--sm"
                    onClick={handleConfirmDuplicate}
                  >
                    <Send size={15} aria-hidden="true" />
                    Evet, yine de gönder
                  </button>
                  <button
                    type="button"
                    className="btn btn--outline btn--sm"
                    onClick={() => setDuplicateConfirm(false)}
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            ) : (
              <p className="nearby__note">
                {nearbySameCategory > 0
                  ? 'Aynı sorunu kastediyorsanız yeniden bildirmenize gerek yok; yukarıdaki kayıttan durumu takip edebilirsiniz. Farklı bir sorun bildiriyorsanız devam edin.'
                  : 'Yakındaki kayıtlar farklı kategoride. Aynı noktada başka bir sorun bildiriyorsanız devam edin.'}
              </p>
            )}
          </div>
        ) : null}

        {submitting ? (
          <div
            className="progress"
            role="progressbar"
            aria-valuenow={progress}
            aria-valuemin={0}
            aria-valuemax={100}
          >
            <div className="progress__track">
              <div
                className="progress__bar"
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="progress__label">
              {progress < 100
                ? `Fotoğraf yükleniyor… %${progress}`
                : 'Bildirim kaydediliyor…'}
            </span>
          </div>
        ) : null}

        <div className="form-card__actions">
          <button
            type="button"
            className="btn btn--outline"
            onClick={() => navigate('/')}
            disabled={submitting}
          >
            Vazgeç
          </button>
          <button
            type="submit"
            className="btn btn--accent"
            disabled={submitting || predicting || !isUploadConfigured}
          >
            <Send size={16} aria-hidden="true" />
            {submitting ? 'Gönderiliyor…' : 'Bildir'}
          </button>
        </div>
      </form>
    </div>
  )
}

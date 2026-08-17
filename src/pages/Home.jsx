import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import {
  Check,
  MapIcon,
  RefreshCw,
  SearchX,
  TriangleAlert,
  X,
} from 'lucide-react'
import MapFilters, { ALL } from '../components/MapFilters'
import ReportPanel from '../components/ReportPanel'
import ReportsMap from '../components/ReportsMap'
import SetupNotice from '../components/SetupNotice'
import Spinner from '../components/Spinner'
import { CATEGORIES, STATUSES } from '../constants'
import { ALL_DISTRICTS, getDistrictLabel } from '../constants/districts'
import { ALL_DATES, isWithinRange } from '../constants/dateRanges'
import { isFirebaseConfigured } from '../firebase/config'
import { subscribeToReports } from '../services/reportsService'

function errorMessage(error) {
  if (error?.code === 'permission-denied') {
    return 'Firestore kuralları okumaya izin vermiyor. Firebase Console > Firestore Database > Rules bölümünü kontrol edin.'
  }
  if (error?.code === 'unavailable') {
    return 'Firestore\'a ulaşılamıyor. İnternet bağlantınızı kontrol edin.'
  }
  return error?.message ?? 'Bildirimler yüklenirken bir hata oluştu.'
}

export default function Home() {
  const location = useLocation()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [statusFilter, setStatusFilter] = useState(ALL)
  const [categoryFilter, setCategoryFilter] = useState(ALL)
  // Ilce suzmesi sunucu tarafinda — abonelik yeniden kuruluyor
  // Ilce suzmesi de istemcide — durum ve kategoriyle ayni yerde.
  // Sunucu tarafli `where` denendi ve geri alindi: ilce alani olmayan eski
  // kayitlari sonuctan tamamen dusuruyordu.
  const [districtFilter, setDistrictFilter] = useState(ALL_DISTRICTS)
  // Tarih suzgeci bilerek istatistik seridini ETKILEMIYOR: panelde zaten
  // "ŞU AN / BU AY / TÜM ZAMANLAR" var, "Son 7 gün" secildiginde "TÜM
  // ZAMANLAR: 3" yazmasi celiskili olurdu. Durum ve kategori suzgecleri de
  // ayni sekilde yalnizca haritayi suzuyor.
  const [dateFilter, setDateFilter] = useState(ALL_DATES)
  // Hata sonrasi yeniden denemek icin: degisince dinleme efekti tekrar kurulur
  const [retryKey, setRetryKey] = useState(0)
  // Bildirim gonderildikten sonra /new-report buraya bir mesaj birakir.
  const [toast, setToast] = useState(location.state?.toast ?? '')

  // Alt bilgi seridi yalnizca haritada seffaf kalmali. Diger sayfalar
  // kaydirilabilir oldugu icin metin seridin altindan gecerken okunmuyordu;
  // govdeye birakilan bu isaret CSS'in ikisini ayirt etmesini sagliyor.
  useEffect(() => {
    document.body.classList.add('on-map')
    return () => document.body.classList.remove('on-map')
  }, [])

  useEffect(() => {
    if (!toast) return undefined

    // Mesaji gecmisten temizle ki sayfa yenilenince tekrar gorunmesin.
    window.history.replaceState({}, '')

    const timer = setTimeout(() => setToast(''), 6000)
    return () => clearTimeout(timer)
  }, [toast])

  useEffect(() => {
    if (!isFirebaseConfigured) {
      setLoading(false)
      return undefined
    }

    setLoading(true)

    const unsubscribe = subscribeToReports(
      (data) => {
        setReports(data)
        setError(null)
        setLoading(false)
      },
      (err) => {
        setError(err)
        setLoading(false)
      },
    )

    return unsubscribe
  }, [retryKey])

  const handleRetry = useCallback(() => {
    setError(null)
    setLoading(true)
    setRetryKey((key) => key + 1)
  }, [])

  // Yalnizca ilceye gore suzulmus kume. Hem istatistiklerin hem de
  // durum/kategori suzgeclerinin ortak temeli: ilce secildiginde panel o
  // ilcenin rakamlarini gostermeli, yoksa basliktaki "Seyhan ilcesi" ile
  // altindaki sayilar celisir.
  const districtReports = useMemo(
    () =>
      districtFilter === ALL_DISTRICTS
        ? reports
        : reports.filter((report) => report.district === districtFilter),
    [reports, districtFilter],
  )

  // Canli istatistik. Uc ayri soruya cevap veriyor:
  //   "Su an"        -> mevcut durum dagilimi
  //   "Bu ay"        -> bu ayin akisi: kac yeni bildirim, kac cozum
  //   "Tum zamanlar" -> toplam ve cozum orani
  //
  // Kapsam districtReports: secili ilce neyse rakamlar onun. Durum ve kategori
  // suzgecleri BILEREK disarida — panel zaten durum dagilimini gosteriyor,
  // "sadece bekliyor" secilince "3 bekliyor / 0 cozuldu" demesi anlamsiz olur.
  //
  // ONEMLI: "bu ay cozuldu", bu ay OLUSTURULAN kayitlarin cozulmusleri degil,
  // bu ay COZULEN kayitlardir. Temmuzda bildirilip agustosta cozulen bir
  // sorun agustosun basarisidir. Bunu ancak cozum damgasina bakarak dogru
  // hesaplayabiliyoruz.
  const stats = useMemo(() => {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime()

    const countStatus = (status) =>
      districtReports.filter((report) => report.status === status).length

    // Eski kayitlarda cozum damgasi olmayabilir; o durumda mevcut duruma bak.
    const everSolved = (report) =>
      Boolean(report.statusTimestamps?.cozuldu) || report.status === 'cozuldu'

    const solvedAllTime = districtReports.filter(everSolved).length
    const total = districtReports.length

    return {
      // Durum anahtariyla erisilebilen sayim tablosu — arayuz STATUSES
      // uzerinde donerken dogrudan bunu okuyor.
      byStatus: {
        bekliyor: countStatus('bekliyor'),
        inceleniyor: countStatus('inceleniyor'),
        cozuldu: countStatus('cozuldu'),
      },

      monthReported: districtReports.filter(
        (report) => report.createdAtMillis >= monthStart,
      ).length,
      monthSolved: districtReports.filter(
        (report) => (report.statusTimestamps?.cozuldu ?? 0) >= monthStart,
      ).length,

      total,
      solvedAllTime,
      solvedRate: total > 0 ? Math.round((solvedAllTime / total) * 100) : 0,
    }
  }, [districtReports])

  // Haritada gosterilecek kayitlar. Suzme istemcide: veri zaten bellekte,
  // her filtre degisiminde Firestore'a gitmenin anlami yok.
  const visibleReports = useMemo(
    () =>
      districtReports.filter(
        (report) =>
          (statusFilter === ALL || report.status === statusFilter) &&
          (categoryFilter === ALL || report.category === categoryFilter) &&
          isWithinRange(report.createdAtMillis, dateFilter),
      ),
    [districtReports, statusFilter, categoryFilter, dateFilter],
  )

  // Secili bildirim silinirse VEYA filtre disinda kalirsa secim kendiliginden
  // dusuyor — haritada olmayan bir kaydin paneli acik kalmamali.
  const selectedReport = useMemo(
    () => visibleReports.find((report) => report.id === selectedId) ?? null,
    [visibleReports, selectedId],
  )

  const handleResetFilters = useCallback(() => {
    setStatusFilter(ALL)
    setCategoryFilter(ALL)
    setDistrictFilter(ALL_DISTRICTS)
    setDateFilter(ALL_DATES)
  }, [])

  const handleSelect = useCallback((id) => setSelectedId(id), [])
  const handleClear = useCallback(() => setSelectedId(null), [])

  if (!isFirebaseConfigured) {
    return (
      <div className="page page--centered">
        <SetupNotice />
      </div>
    )
  }

  // Panel ekranin ortasinda, istatistikler sagda, aciklama kutusu sol altta —
  // ucu de ayri bolgede durdugu icin ayni anda acik kalabiliyorlar.
  // Kullanici bir bildirimi incelerken genel tabloyu da gormeye devam ediyor.
  // Kayit yokken de gosteriyoruz: panel bir gosterge tablosu, veri bitince
  // kaybolmamali. Hepsini silince sifirlari gormek "panel nerede?" demekten
  // daha anlasilir.
  const showStats = !loading && !error

  return (
    <div className="home">
      <ReportsMap
        reports={visibleReports}
        selectedId={selectedId}
        onSelect={handleSelect}
        onClear={handleClear}
        focusDistrict={districtFilter}
      />

      {!error ? (
        <MapFilters
          status={statusFilter}
          category={categoryFilter}
          district={districtFilter}
          dateRange={dateFilter}
          onStatusChange={setStatusFilter}
          onCategoryChange={setCategoryFilter}
          onDistrictChange={setDistrictFilter}
          onDateRangeChange={setDateFilter}
          onReset={handleResetFilters}
          visibleCount={visibleReports.length}
          totalCount={reports.length}
        />
      ) : null}

      {showStats ? (
        <aside className="stats" aria-label="Bildirim özeti">
          {/* İlçe seçiliyken sayılar yalnızca o ilçeyi kapsıyor — kapsamı
              açıkça yazmazsak rakamlar yanıltıcı olur. */}
          {districtFilter !== ALL_DISTRICTS ? (
            <p className="stats__scope">
              {getDistrictLabel(districtFilter)} ilçesi
            </p>
          ) : null}

          {/* Şu anki durum dağılımı — üç durumun tamamı, canlı */}
          <div className="stats__group">
            <span className="stats__group-title">Şu an</span>
            {Object.entries(STATUSES).map(([key, { label, hex }]) => (
              <p className="stats__row" key={key}>
                <span
                  className="stats__dot"
                  style={{ backgroundColor: hex }}
                  aria-hidden="true"
                />
                <span className="stats__value stats__value--sm">
                  {stats.byStatus[key] ?? 0}
                </span>
                {/* toLocaleLowerCase('tr') sart: JS'in toLowerCase()'i Unicode
                    varsayilanini uyguluyor ve "İnceleniyor" -> "i̇nceleniyor"
                    veriyor (i + U+0307 birlesen ust nokta). Ekranda fazladan
                    bir nokta goruluyordu. */}
                <span className="stats__label">
                  {label.toLocaleLowerCase('tr')}
                </span>
              </p>
            ))}
          </div>

          {/* Bu ayın akışı */}
          <div className="stats__group">
            <span className="stats__group-title">Bu ay</span>
            <p className="stats__row">
              <span className="stats__value">{stats.monthReported}</span>
              <span className="stats__label">yeni bildirim</span>
            </p>
            <p className="stats__row">
              <span
                className="stats__value"
                style={{ color: STATUSES.cozuldu.text }}
              >
                {stats.monthSolved}
              </span>
              <span className="stats__label">çözüldü</span>
            </p>
          </div>

          {/* Tüm zamanlar */}
          <div className="stats__group">
            <span className="stats__group-title">Tüm zamanlar</span>
            <p className="stats__row">
              <span className="stats__value stats__value--sm">
                {stats.total}
              </span>
              <span className="stats__label">toplam bildirim</span>
            </p>
            <p className="stats__row">
              <span
                className="stats__value stats__value--sm"
                style={{ color: STATUSES.cozuldu.text }}
              >
                {stats.solvedAllTime}
              </span>
              <span className="stats__label">çözüldü</span>
            </p>
            <p className="stats__rate">
              Çözüm oranı <strong>%{stats.solvedRate}</strong>
            </p>
          </div>
        </aside>
      ) : null}

      {toast ? (
        <div className="toast" role="status">
          <span className="toast__icon" aria-hidden="true">
            <Check size={18} />
          </span>
          <span>{toast}</span>
          <button
            type="button"
            className="toast__close"
            onClick={() => setToast('')}
            aria-label="Kapat"
          >
            <X size={16} />
          </button>
        </div>
      ) : null}

      <ReportPanel report={selectedReport} onClose={handleClear} />

      {/* İşaretçi rengi durumu, içindeki simge kategoriyi gösteriyor. */}
      <div className="map-legend">
        <div className="map-legend__group">
            <span className="map-legend__title">Durum</span>
            <ul className="map-legend__list">
              {Object.entries(STATUSES).map(([key, { label, hex }]) => (
                <li key={key} className="map-legend__item">
                  <span
                    className="map-legend__dot"
                    style={{ backgroundColor: hex }}
                    aria-hidden="true"
                  />
                  {label}
                </li>
              ))}
            </ul>
          </div>

          <div className="map-legend__group map-legend__group--categories">
            <span className="map-legend__title">Kategori</span>
            <ul className="map-legend__list">
              {Object.entries(CATEGORIES).map(([key, { label, Icon }]) => (
                <li key={key} className="map-legend__item">
                  <span className="map-legend__glyph" aria-hidden="true">
                    <Icon />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
        </div>
      </div>

      {loading ? (
        <div className="map-overlay">
          <div className="card--floating">
            <Spinner label="Bildirimler yükleniyor…" />
          </div>
        </div>
      ) : null}

      {!loading && error ? (
        <div className="map-overlay">
          <div className="card--floating">
            <span className="card__icon" aria-hidden="true">
              <TriangleAlert size={22} />
            </span>
            <h2 className="card__title">Bildirimler yüklenemedi</h2>
            <p className="card__text">{errorMessage(error)}</p>
            {/* Hata mesajı tek başına yeterli değil — çıkış yolu da lazım */}
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleRetry}
            >
              <RefreshCw size={16} aria-hidden="true" />
              Tekrar dene
            </button>
          </div>
        </div>
      ) : null}

      {!loading && !error && reports.length === 0 ? (
        <div className="map-overlay">
          <div className="card--floating">
            <span className="card__icon" aria-hidden="true">
              <MapIcon size={22} />
            </span>
            <h2 className="card__title">Henüz bildirim yok</h2>
            <p className="card__text">
              İlk bildirim oluşturulduğunda haritada anında görünecek.
            </p>
          </div>
        </div>
      ) : null}

      {/* Kayıt var ama filtre hepsini eledi — farklı bir durum, farklı mesaj */}
      {!loading && !error && reports.length > 0 && visibleReports.length === 0 ? (
        <div className="map-overlay">
          <div className="card--floating">
            <span className="card__icon" aria-hidden="true">
              <SearchX size={22} />
            </span>
            <h2 className="card__title">
              {districtFilter === ALL_DISTRICTS
                ? 'Bu filtreye uyan bildirim yok'
                : `${getDistrictLabel(districtFilter)} için sonuç yok`}
            </h2>
            <p className="card__text">
              {reports.length} kayıttan hiçbiri seçtiğiniz ölçütlere uymuyor.
            </p>
            <button
              type="button"
              className="btn btn--primary"
              onClick={handleResetFilters}
            >
              Filtreleri temizle
            </button>
          </div>
        </div>
      ) : null}
    </div>
  )
}

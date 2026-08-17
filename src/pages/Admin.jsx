import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Filter, TriangleAlert } from 'lucide-react'
import AdminNoteEditor from '../components/AdminNoteEditor'
import CategoryBadge from '../components/CategoryBadge'
import DeleteReportButton from '../components/DeleteReportButton'
import Spinner from '../components/Spinner'
import StatusBadge from '../components/StatusBadge'
import { CATEGORIES, STATUSES, getCategory } from '../constants'
import {
  ALL_DISTRICTS,
  DISTRICTS,
  getDistrictLabel,
} from '../constants/districts'
import {
  subscribeToReports,
  updateReportStatus,
} from '../services/reportsService'
import { formatDateTime } from '../utils/date'

const ALL = 'hepsi'

export default function Admin() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const [statusFilter, setStatusFilter] = useState(ALL)
  // Admin panelde ilce suzmesi ISTEMCIDE: ilce istatistiklerini hesaplamak
  // icin zaten tum kayitlara ihtiyacimiz var, ikinci bir sorgu gereksiz.
  const [districtFilter, setDistrictFilter] = useState(ALL_DISTRICTS)
  const [categoryFilter, setCategoryFilter] = useState(ALL)
  // Hangi satirlarin guncellemesi suruyor: id -> true
  const [updating, setUpdating] = useState({})
  const [updateError, setUpdateError] = useState('')

  useEffect(() => {
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
  }, [])

  const visibleReports = useMemo(
    () =>
      reports.filter(
        (report) =>
          (statusFilter === ALL || report.status === statusFilter) &&
          (districtFilter === ALL_DISTRICTS ||
            report.district === districtFilter) &&
          // getCategory() ile karsilastirmiyoruz: o, taninmayan anahtari
          // 'diger'e dusurur ve eski bir kayit "Diğer" suzgecinde cikardi.
          // Burada ham degeri karsilastirmak dogru olan.
          (categoryFilter === ALL || report.category === categoryFilter),
      ),
    [reports, statusFilter, districtFilter, categoryFilter],
  )

  // Ilce basina bildirim sayisi ve en cok bildirim alan ilce.
  // Ayri bir aggregation sistemi kurmadan, elimizdeki veriden sayiyoruz.
  const districtStats = useMemo(() => {
    const counts = Object.fromEntries(DISTRICTS.map((d) => [d.value, 0]))
    let unassigned = 0

    for (const report of reports) {
      if (report.district in counts) counts[report.district] += 1
      else unassigned += 1
    }

    const max = Math.max(0, ...Object.values(counts))
    // Berabere kalirsa "en cok" vurgusu gostermiyoruz — yaniltici olur
    const leaders = Object.keys(counts).filter((k) => counts[k] === max)
    const top = max > 0 && leaders.length === 1 ? leaders[0] : null

    return { counts, unassigned, top }
  }, [reports])

  async function handleStatusChange(reportId, nextStatus) {
    setUpdating((prev) => ({ ...prev, [reportId]: true }))
    setUpdateError('')

    try {
      await updateReportStatus(reportId, nextStatus)
      // Listeyi elle guncellemeye gerek yok: onSnapshot degisikligi
      // kendiliginden yayinliyor.
    } catch (err) {
      console.error('[admin] durum guncelleme hatasi:', err)
      setUpdateError(
        err?.code === 'permission-denied'
          ? "Firestore kuralları güncellemeye izin vermiyor. README'deki admin kuralını yayınlayın."
          : (err.message ?? 'Durum güncellenemedi.'),
      )
    } finally {
      setUpdating((prev) => {
        const next = { ...prev }
        delete next[reportId]
        return next
      })
    }
  }

  if (loading) {
    return (
      <div className="page page--centered">
        <Spinner full label="Bildirimler yükleniyor…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page page--centered">
        <div className="card--standalone">
          <span className="card__icon" aria-hidden="true">
            <TriangleAlert size={22} />
          </span>
          <h2 className="card__title">Bildirimler yüklenemedi</h2>
          <p className="card__text">{error.message}</p>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="list">
        <header className="list__header">
          <h1 className="list__title">Admin Paneli</h1>
          <span className="list__count">
            {visibleReports.length} / {reports.length} kayıt
          </span>
        </header>

        {/* İlçe bazında dağılım — kutulara tıklayarak da süzülebiliyor */}
        <div className="district-stats">
          {DISTRICTS.map(({ value, label }) => {
            const count = districtStats.counts[value]
            const isTop = districtStats.top === value
            const isActive = districtFilter === value

            const classNames = ['district-stats__tile']
            if (isTop) classNames.push('is-top')
            if (isActive) classNames.push('is-active')

            return (
              <button
                key={value}
                type="button"
                className={classNames.join(' ')}
                aria-pressed={isActive}
                onClick={() =>
                  setDistrictFilter(isActive ? ALL_DISTRICTS : value)
                }
              >
                <span className="district-stats__count">{count}</span>
                <span className="district-stats__label">{label}</span>
                {isTop ? (
                  <span className="district-stats__badge">en çok</span>
                ) : null}
              </button>
            )
          })}

          {districtStats.unassigned > 0 ? (
            <span
              className="district-stats__tile district-stats__tile--muted"
              title="Konumu 4 merkez ilçenin dışında kalan kayıtlar"
            >
              <span className="district-stats__count">
                {districtStats.unassigned}
              </span>
              <span className="district-stats__label">ilçesiz</span>
            </span>
          ) : null}
        </div>

        <div className="admin__filter">
          <span className="admin__filter-icon">
            <Filter size={15} aria-hidden="true" />
          </span>

          <div className="admin__filter-group">
            <label className="field__label" htmlFor="districtFilter">
              İlçe
            </label>
            <select
              id="districtFilter"
              className="input input--compact"
              value={districtFilter}
              onChange={(event) => setDistrictFilter(event.target.value)}
            >
              <option value={ALL_DISTRICTS}>Tümü</option>
              {DISTRICTS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin__filter-group">
            <label className="field__label" htmlFor="categoryFilter">
              Kategori
            </label>
            <select
              id="categoryFilter"
              className="input input--compact"
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
            >
              <option value={ALL}>Hepsi</option>
              {Object.entries(CATEGORIES).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <div className="admin__filter-group">
            <label className="field__label" htmlFor="statusFilter">
              Durum
            </label>
            <select
              id="statusFilter"
              className="input input--compact"
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
            >
              <option value={ALL}>Hepsi</option>
              {Object.entries(STATUSES).map(([key, { label }]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          <span className="admin__filter-count">
            {visibleReports.length} / {reports.length} bildirim
          </span>
        </div>

        {updateError ? (
          <div className="alert alert--error" role="alert">
            {updateError}
          </div>
        ) : null}

        {visibleReports.length === 0 ? (
          <div className="card--standalone">
            <p className="card__text">Bu filtreye uyan bildirim yok.</p>
          </div>
        ) : (
          <ul className="list__items">
            {visibleReports.map((report) => {
              const { Icon } = getCategory(report.category)

              return (
                <li key={report.id}>
                  <article className="admin-card">
                    <Link to={`/report/${report.id}`} aria-label="Detayı aç">
                      {report.imageUrl ? (
                        <img
                          className="admin-card__thumb"
                          src={report.imageUrl}
                          alt={`${getCategory(report.category).label} bildirimi fotoğrafı`}
                          loading="lazy"
                        />
                      ) : (
                        <span className="admin-card__thumb admin-card__thumb--empty">
                          <Icon size={22} aria-hidden="true" />
                        </span>
                      )}
                    </Link>

                    <div className="admin-card__body">
                      <div className="admin-card__head">
                        <CategoryBadge category={report.category} />
                        <StatusBadge status={report.status} variant="soft" />
                        <span className="district-chip">
                          {getDistrictLabel(report.district)}
                        </span>
                      </div>

                      <p className="admin-card__description">
                        {report.description || 'Açıklama girilmemiş.'}
                      </p>

                      <div className="admin-card__meta">
                        <span>{formatDateTime(report.createdAtMillis)}</span>
                        <span
                          className="admin-card__uid"
                          title={report.userId}
                        >
                          {report.userId || '—'}
                        </span>
                      </div>

                      {/* Not varsa listede görünsün — admin hangi kayda ne
                          yazdığını açmadan görebilsin */}
                      {report.adminNote ? (
                        <p className="admin-card__note">{report.adminNote}</p>
                      ) : null}

                      <AdminNoteEditor
                        reportId={report.id}
                        note={report.adminNote}
                      />
                    </div>

                    <div className="admin-card__control">
                      <label
                        className="field__hint"
                        htmlFor={`status-${report.id}`}
                      >
                        Durumu değiştir
                      </label>
                      <select
                        id={`status-${report.id}`}
                        className="input input--compact"
                        value={report.status}
                        disabled={Boolean(updating[report.id])}
                        onChange={(event) =>
                          handleStatusChange(report.id, event.target.value)
                        }
                      >
                        {Object.entries(STATUSES).map(([key, { label }]) => (
                          <option key={key} value={key}>
                            {label}
                          </option>
                        ))}
                      </select>

                      <DeleteReportButton reportId={report.id} />
                    </div>
                  </article>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { MapContainer, Marker, TileLayer } from 'react-leaflet'
import { ArrowLeft, ImageOff, SearchX, ShieldCheck } from 'lucide-react'
import 'leaflet/dist/leaflet.css'
import CategoryBadge from '../components/CategoryBadge'
import DeleteReportButton from '../components/DeleteReportButton'
import Spinner from '../components/Spinner'
import StatusBadge from '../components/StatusBadge'
import StatusTimeline from '../components/StatusTimeline'
import { getCategory } from '../constants'
import { getDistrictLabel } from '../constants/districts'
import { useAuth } from '../context/useAuth'
import { isFirebaseConfigured } from '../firebase/config'
import { canDeleteReport } from '../utils/permissions'
import { getReport } from '../services/reportsService'
import { formatDensityPercent } from '../services/damageDensityService'
import { formatDateTime } from '../utils/date'
import { reportIcon } from '../utils/mapIcons'
import { referenceCode } from '../utils/reference'

const DETAIL_ZOOM = 16

export default function ReportDetail() {
  const { id } = useParams()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const data = await getReport(id)
        if (cancelled) return

        if (!data) {
          setError(
            'Bu bildirim mevcut değil. Silinmiş ya da bağlantı hatalı olabilir.',
          )
        } else {
          setReport(data)
        }
      } catch (fetchError) {
        if (cancelled) return
        console.error('[report] detay hatasi:', fetchError)
        setError(
          fetchError?.code === 'permission-denied'
            ? 'Bu bildirimi görüntüleme izniniz yok.'
            : 'Bildirim yüklenirken bir hata oluştu.',
        )
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    if (!isFirebaseConfigured) {
      setError('Firebase yapılandırılmamış. .env dosyasını doldurun.')
      setLoading(false)
    } else {
      load()
    }

    return () => {
      cancelled = true
    }
  }, [id])

  if (loading) {
    return (
      <div className="page page--centered">
        <Spinner full label="Bildirim yükleniyor…" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="page page--centered">
        <div className="card--standalone">
          <span className="card__icon" aria-hidden="true">
            <SearchX size={22} />
          </span>
          <h2 className="card__title">Bildirim bulunamadı</h2>
          <p className="card__text">{error}</p>
          <Link to="/" className="btn btn--primary">
            <ArrowLeft size={16} aria-hidden="true" />
            Haritaya dön
          </Link>
        </div>
      </div>
    )
  }

  const category = getCategory(report.category)
  const hasCoordinates =
    Number.isFinite(report.latitude) && Number.isFinite(report.longitude)

  return (
    <div className="page">
      <article className="detail">
        <Link to="/" className="detail__back">
          <ArrowLeft size={16} aria-hidden="true" />
          Haritaya dön
        </Link>

        <div className="detail__card">
          {report.imageUrl ? (
            /* Çerçeve piksel hesabıyla değil yüzdeyle konumlanıyor: analizde
               kırpılan bölge de görselin %20–%80'i, yani hangi boyutta
               gösterilirse gösterilsin çerçeve tam o alanı işaretliyor. */
            <div className="detail__image-wrap">
              <img
                className="detail__image"
                src={report.imageUrl}
                alt={`${category.label} bildirimi`}
              />

              {Number.isFinite(report.damageDensity) ? (
                <div className="roi-overlay" aria-hidden="true">
                  <span className="roi-overlay__label">
                    Hasar Yoğunluğu: {formatDensityPercent(report.damageDensity)}
                  </span>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="detail__image detail__image--empty">
              <ImageOff size={24} aria-hidden="true" />
              Bu bildirime fotoğraf eklenmemiş
            </div>
          )}

          <div className="detail__body">
            <div className="detail__badges">
              <CategoryBadge category={report.category} />
              <StatusBadge status={report.status} variant="soft" />
            </div>

            <h1 className="detail__title">{category.label}</h1>

            <p className="detail__description">
              {report.description || 'Açıklama girilmemiş.'}
            </p>

            <div className="field">
              <span className="detail__section-title">Bildirim durumu</span>
              <StatusTimeline
                status={report.status}
                timestamps={report.statusTimestamps}
              />
            </div>

            {/* Zaman çizelgesi "ne zaman" der; bu kutu "ne yapıldı" der. */}
            {report.adminNote ? (
              <div className="admin-note">
                <span className="admin-note__title">
                  <ShieldCheck size={15} aria-hidden="true" />
                  Belediye açıklaması
                </span>
                <p className="admin-note__text">{report.adminNote}</p>
                {report.adminNoteAtMillis ? (
                  <p className="admin-note__meta">
                    {formatDateTime(report.adminNoteAtMillis)}
                  </p>
                ) : null}
              </div>
            ) : null}

            <dl className="detail__meta">
              <div className="detail__meta-row">
                <dt>Oluşturulma</dt>
                <dd>{formatDateTime(report.createdAtMillis)}</dd>
              </div>
              <div className="detail__meta-row">
                <dt>İlçe</dt>
                <dd>{getDistrictLabel(report.district)}</dd>
              </div>
              {/* Görseldeki çerçeve aria-hidden — bir görselleştirme.
                  Değerin kendisi ekran okuyucuya buradan ulaşıyor. */}
              {Number.isFinite(report.damageDensity) ? (
                <div className="detail__meta-row">
                  <dt>Hasar yoğunluğu</dt>
                  <dd>{formatDensityPercent(report.damageDensity)}</dd>
                </div>
              ) : null}
              {hasCoordinates ? (
                <div className="detail__meta-row">
                  <dt>Konum</dt>
                  <dd>
                    {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
                  </dd>
                </div>
              ) : null}
              <div className="detail__meta-row">
                <dt>Bildirim no</dt>
                <dd>{referenceCode(report.id)}</dd>
              </div>
            </dl>

            {hasCoordinates ? (
              <div className="field">
                <span className="detail__section-title">Konum</span>
                <div className="detail__map-wrap">
                  <MapContainer
                    className="detail__map"
                    center={[report.latitude, report.longitude]}
                    zoom={DETAIL_ZOOM}
                    scrollWheelZoom={false}
                  >
                    <TileLayer
                      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> katkıda bulunanlar'
                      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />
                    <Marker
                      position={[report.latitude, report.longitude]}
                      icon={reportIcon(report.category, report.status)}
                    />
                  </MapContainer>
                </div>
              </div>
            ) : (
              <p className="detail__no-map">Bu bildirimde konum bilgisi yok.</p>
            )}

            {canDeleteReport(user, report) ? (
              <div className="detail__actions">
                <DeleteReportButton
                  reportId={report.id}
                  label="Bildirimi sil"
                  onDeleted={() =>
                    navigate('/', {
                      replace: true,
                      state: { toast: 'Bildirim silindi.' },
                    })
                  }
                />
              </div>
            ) : null}
          </div>
        </div>
      </article>
    </div>
  )
}

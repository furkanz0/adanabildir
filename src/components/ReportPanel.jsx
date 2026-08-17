import { useEffect } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ImageOff, MapPin, ShieldCheck, X } from 'lucide-react'
import CategoryBadge from './CategoryBadge'
import StatusBadge from './StatusBadge'
import { getCategory, getStatus } from '../constants'
import { getDistrictLabel } from '../constants/districts'
import { formatDensityPercent } from '../services/damageDensityService'
import { formatDateTime } from '../utils/date'
import { referenceCode } from '../utils/reference'

/**
 * Harita üzerinde seçilen bildirimin detay paneli.
 *
 * Leaflet popup'inin yerini aliyor. Fark su: popup marker'a cipalanir, yani
 * konumu marker'in nerede oldugunu gore degisir ve er ya da gec haritanin
 * sabit katmanlariyla (istatistik seridi, aciklama kutusu, alt bilgi)
 * carpisir. Bu panelin yeri sabit — masaustunde solda, mobilde altta — bu
 * yuzden cakisma matematiksel olarak mumkun degil.
 */
export default function ReportPanel({ report, onClose }) {
  const isOpen = Boolean(report)

  // Escape ile kapatma: haritada gezinirken en dogal cikis yolu.
  useEffect(() => {
    if (!isOpen) return undefined

    function handleKey(event) {
      if (event.key === 'Escape') onClose()
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [isOpen, onClose])

  // Panel acikken govdeye isaret birakiyoruz. Alt bilgi seridi .home'un
  // disinda, App iskeletinde duruyor; mobilde alttan yukselen sayfa onu
  // ortmesin diye o seridin gizlenmesi gerekiyor ve CSS'in bunu bilmesinin
  // tek yolu bu.
  useEffect(() => {
    if (!isOpen) return undefined

    document.body.classList.add('has-report-panel')
    return () => document.body.classList.remove('has-report-panel')
  }, [isOpen])

  if (!report) return null

  const category = getCategory(report.category)
  const status = getStatus(report.status)
  const statusAt = report.statusTimestamps?.[report.status]
  const hasCoordinates =
    Number.isFinite(report.latitude) && Number.isFinite(report.longitude)

  return (
    <aside
      className="report-panel"
      role="region"
      aria-label={`${category.label} bildirimi detayı`}
    >
      <header className="report-panel__header">
        <div className="report-panel__badges">
          <CategoryBadge category={report.category} />
          <StatusBadge status={report.status} variant="soft" />
        </div>

        <button
          type="button"
          className="report-panel__close"
          onClick={onClose}
          aria-label="Paneli kapat"
        >
          <X size={18} />
        </button>
      </header>

      <div className="report-panel__body">
        {report.imageUrl ? (
          <div className="report-panel__image-wrap">
            <img
              className="report-panel__image"
              src={report.imageUrl}
              alt={`${category.label} bildirimi`}
            />

            {/* Detay sayfasindakiyle ayni cerceve: analiz edilen %20-%80
                bolgesi. Yuzdeyle konumlandigi icin panelin dar genisliginde
                de dogru yeri isaretliyor. */}
            {Number.isFinite(report.damageDensity) ? (
              <div className="roi-overlay" aria-hidden="true">
                <span className="roi-overlay__label">
                  Hasar Yoğunluğu: {formatDensityPercent(report.damageDensity)}
                </span>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="report-panel__image report-panel__image--empty">
            <ImageOff size={22} aria-hidden="true" />
            Fotoğraf eklenmemiş
          </div>
        )}

        <p className="report-panel__description">
          {report.description || 'Açıklama girilmemiş.'}
        </p>

        {report.adminNote ? (
          <div className="admin-note admin-note--compact">
            <span className="admin-note__title">
              <ShieldCheck size={14} aria-hidden="true" />
              Belediye açıklaması
            </span>
            <p className="admin-note__text">{report.adminNote}</p>
          </div>
        ) : null}

        <dl className="report-panel__meta">
          <div>
            <dt>Bildirim no</dt>
            <dd>{referenceCode(report.id)}</dd>
          </div>
          <div>
            <dt>İlçe</dt>
            <dd>{getDistrictLabel(report.district)}</dd>
          </div>
          {/* Cerceve aria-hidden — deger ekran okuyucuya buradan ulasiyor */}
          {Number.isFinite(report.damageDensity) ? (
            <div>
              <dt>Hasar yoğunluğu</dt>
              <dd>{formatDensityPercent(report.damageDensity)}</dd>
            </div>
          ) : null}
          <div>
            <dt>Bildirildi</dt>
            <dd>{formatDateTime(report.createdAtMillis)}</dd>
          </div>
          {/* Mevcut duruma ne zaman gecildigi — "bekliyor" zaten bildirim
              anidir, onu tekrar yazmiyoruz. */}
          {report.status !== 'bekliyor' ? (
            <div>
              <dt>{status.label}</dt>
              <dd>{statusAt ? formatDateTime(statusAt) : '—'}</dd>
            </div>
          ) : null}
          {hasCoordinates ? (
            <div>
              <dt>
                <MapPin size={12} aria-hidden="true" /> Konum
              </dt>
              <dd>
                {report.latitude.toFixed(5)}, {report.longitude.toFixed(5)}
              </dd>
            </div>
          ) : null}
        </dl>
      </div>

      <footer className="report-panel__footer">
        <Link to={`/report/${report.id}`} className="btn btn--primary btn--block">
          Detay sayfasını aç
          <ArrowRight size={16} aria-hidden="true" />
        </Link>
      </footer>
    </aside>
  )
}

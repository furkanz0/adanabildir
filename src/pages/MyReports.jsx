import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Inbox, Plus, TriangleAlert } from 'lucide-react'
import CategoryBadge from '../components/CategoryBadge'
import DeleteReportButton from '../components/DeleteReportButton'
import Spinner from '../components/Spinner'
import StatusBadge from '../components/StatusBadge'
import { getCategory } from '../constants'
import { getDistrictLabel } from '../constants/districts'
import { useAuth } from '../context/useAuth'
import {
  extractIndexUrl,
  subscribeToUserReports,
} from '../services/reportsService'
import { formatDateTime } from '../utils/date'

export default function MyReports() {
  const { user } = useAuth()

  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!user) return undefined

    const unsubscribe = subscribeToUserReports(
      user.uid,
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
  }, [user])

  if (loading) {
    return (
      <div className="page page--centered">
        <Spinner full label="Bildirimleriniz yükleniyor…" />
      </div>
    )
  }

  if (error) {
    const indexUrl = extractIndexUrl(error)

    return (
      <div className="page page--centered">
        <div className="card--standalone">
          <span className="card__icon" aria-hidden="true">
            <TriangleAlert size={22} />
          </span>
          <h2 className="card__title">Bildirimler yüklenemedi</h2>

          {error.code === 'failed-precondition' && indexUrl ? (
            <>
              <p className="card__text">
                Bu sorgu Firestore'da bir bileşik index gerektiriyor. Aşağıdaki
                bağlantıya tıklayıp <strong>Create index</strong> deyin; index
                birkaç dakika içinde hazır olur.
              </p>
              <a
                className="btn btn--primary"
                href={indexUrl}
                target="_blank"
                rel="noreferrer"
              >
                Index'i oluştur
              </a>
            </>
          ) : (
            <p className="card__text">
              {error.message ?? 'Beklenmeyen bir hata oluştu.'}
            </p>
          )}
        </div>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="page page--centered">
        <div className="card--standalone">
          <span className="card__icon" aria-hidden="true">
            <Inbox size={22} />
          </span>
          <h2 className="card__title">Henüz bir bildirim oluşturmadınız</h2>
          <p className="card__text">
            Şehrinizde gördüğünüz bir sorunu fotoğraflayıp bildirin.
          </p>
          <Link to="/new-report" className="btn btn--accent">
            <Plus size={16} aria-hidden="true" />
            Yeni Bildirim Oluştur
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="page">
      <div className="list">
        <header className="list__header">
          <h1 className="list__title">Bildirimlerim</h1>
          <span className="list__count">{reports.length} kayıt</span>
        </header>

        <ul className="list__items">
          {reports.map((report) => {
            const { Icon } = getCategory(report.category)

            return (
              <li key={report.id}>
                {/* Silme butonu bağlantının DIŞINDA: etkileşimli bir öğeyi
                    başka bir etkileşimli öğenin içine koymak hem geçersiz
                    HTML hem de klavye/ekran okuyucu için karışıklık. */}
                <article className="report-card">
                  <Link
                    to={`/report/${report.id}`}
                    className="report-card__link"
                  >
                    {report.imageUrl ? (
                      <img
                        className="report-card__thumb"
                        src={report.imageUrl}
                        alt={`${getCategory(report.category).label} bildirimi fotoğrafı`}
                        loading="lazy"
                      />
                    ) : (
                      <div className="report-card__thumb report-card__thumb--empty">
                        <Icon size={24} aria-hidden="true" />
                      </div>
                    )}

                    <div className="report-card__body">
                      <div className="report-card__head">
                        <CategoryBadge category={report.category} />
                        <StatusBadge status={report.status} variant="soft" />
                        {/* Detay ve harita panelinde ilce gorunuyordu, burada
                            gorunmuyordu — ayni kayit uc yerde ayni bilgiyi
                            vermeli. */}
                        {report.district ? (
                          <span className="district-chip">
                            {getDistrictLabel(report.district)}
                          </span>
                        ) : null}
                      </div>

                      <p className="report-card__description">
                        {report.description || 'Açıklama girilmemiş.'}
                      </p>

                      <p className="report-card__meta">
                        {formatDateTime(report.createdAtMillis)}
                      </p>
                    </div>
                  </Link>

                  <div className="report-card__actions">
                    <DeleteReportButton reportId={report.id} />
                  </div>
                </article>
              </li>
            )
          })}
        </ul>
      </div>
    </div>
  )
}

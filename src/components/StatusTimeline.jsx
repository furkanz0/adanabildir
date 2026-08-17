import { STATUS_STEPS, getStatus } from '../constants'
import { formatDateTime } from '../utils/date'

/**
 * Bildirimin yasam dongusunu uc dugumde anlatan zaman cizelgesi.
 *
 * Sitenin imza bileseni: yalnizca detay sayfasinda kullaniliyor.
 *   - gecilmis ve mevcut adimlar dolu ve renkli
 *   - mevcut adim ayrica halkali ve kalin yazili
 *   - henuz gelinmemis adimlar soluk
 *
 * Her adimin altinda o asamaya ne zaman gecildigi yaziyor; vatandas
 * bildiriminin hangi asamada ne kadar bekledigini gorebiliyor.
 */
export default function StatusTimeline({ status, timestamps }) {
  const current = getStatus(status)

  return (
    <div className="timeline-wrap">
      <ol className="timeline">
        {STATUS_STEPS.map((step, index) => {
          const reached = step.order <= current.order
          const isCurrent = step.order === current.order
          const at = timestamps?.[step.key]

          // Uc ayri durumu birbirinden ayiriyoruz:
          //   - zaman var          -> tarih/saat
          //   - asamaya gelinmis ama damga yok -> eski kayit (bu ozellik
          //     eklenmeden once durumu degistirilmis), durustce soyluyoruz
          //   - asamaya henuz gelinmemis -> bekleniyor
          const timeLabel = at
            ? formatDateTime(at)
            : reached
              ? 'tarih kaydı yok'
              : 'bekleniyor'

          const classNames = ['timeline__step']
          if (reached) classNames.push('is-reached')
          if (isCurrent) classNames.push('is-current')

          return (
            <li
              key={step.key}
              className={classNames.join(' ')}
              style={{
                '--step-color': step.hex,
                '--step-ink': step.ink,
                '--step-text': step.text,
                // Giris animasyonunun sirasi: dugum -> cizgi -> sonraki dugum
                '--step-index': index,
              }}
              aria-current={isCurrent ? 'step' : undefined}
            >
              <span className="timeline__node">
                <step.Icon aria-hidden="true" />
              </span>
              <span className="timeline__label">{step.label}</span>
              <span className="timeline__time">{timeLabel}</span>
            </li>
          )
        })}
      </ol>

      <p className="timeline__hint">{current.hint}</p>
    </div>
  )
}

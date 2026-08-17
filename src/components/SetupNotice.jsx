import { Settings } from 'lucide-react'
import Logo from './Logo'

/**
 * .env doldurulmadan uygulama acildiginda gosterilen kurulum uyarisi.
 * Firebase baslatilmadigi icin harita ve auth calismaz; bu ekran nedenini
 * ve cozumu acikca soyler.
 */
export default function SetupNotice() {
  return (
    <div className="setup-notice">
      <Logo size={30} />

      <h2 className="setup-notice__title">
        <Settings
          size={18}
          aria-hidden="true"
          style={{ verticalAlign: '-3px', marginRight: '8px' }}
        />
        Firebase yapılandırması eksik
      </h2>

      <p className="setup-notice__text">
        Uygulamanın çalışması için proje kökündeki <code>.env</code> dosyasını
        kendi Firebase projenizin bilgileriyle doldurmanız gerekiyor.
      </p>

      <pre className="setup-notice__code">
{`VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...`}
      </pre>

      <p className="setup-notice__text setup-notice__text--muted">
        Değerleri kaydettikten sonra geliştirme sunucusunu durdurup{' '}
        <code>npm run dev</code> ile yeniden başlatın — Vite ortam
        değişkenlerini yalnızca açılışta okur.
      </p>
    </div>
  )
}

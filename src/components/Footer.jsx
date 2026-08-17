import { useState } from 'react'

/**
 * Kurumsal alt bilgi.
 *
 * Belediye logosu bilerek navbar'a degil buraya konuldu: navbar'da
 * uygulamanin kendi logosu var ve iki marka yan yana birbiriyle yarisiyor.
 * Kurumsal is birligi markalari evrensel olarak alt bilgiye konur.
 *
 * Logo dosyasi projeye eklenmemisse (public/belediye-logo.png yoksa) kirik
 * gorsel simgesi cikmasin diye img gizleniyor; metin tek basina anlamli
 * kaliyor.
 */
export default function Footer() {
  const [logoFailed, setLogoFailed] = useState(false)

  return (
    <footer className="footer">
      <div className="footer__inner">
        {logoFailed ? null : (
          <img
            className="footer__logo"
            src="/belediye-logo.png"
            alt="Adana Büyükşehir Belediyesi"
            onError={() => setLogoFailed(true)}
          />
        )}

        {/* Metin kısa tutuldu: şerit haritanın üzerine biniyor, her ek satır
            haritadan yer götürüyor. Kritik olan kısım "resmî hizmet değildir"
            ibaresi — o korunuyor. */}
        <p className="footer__text">
          Adana Büyükşehir Belediyesi staj projesi —{' '}
          <strong>resmî bir belediye hizmeti değildir</strong>.
        </p>
      </div>
    </footer>
  )
}

/**
 * AdanaBildir wordmark'i.
 *
 * Isaret bir PNG ama `mask-image` ile ciziliyor, `<img>` olarak degil.
 * Sebebi: maske yalnizca SEKLI aliyor, rengi `background-color: currentColor`
 * belirliyor. Boylece tek dosya koyu navbar'da beyaz, acik kartta petrol
 * yesili gorunuyor — <img> ile bu mumkun olmazdi, her zemin icin ayri dosya
 * gerekirdi.
 *
 * Kaynak dosya turuncu zeminli JPG'den ayiklandi: turuncu seffafa cevrildi,
 * geriye yalnizca isaretin silueti kaldi (public/logo-mark.png).
 */
export default function Logo({ size = 28, withWordmark = true, className }) {
  return (
    <span className={className ? `logo ${className}` : 'logo'}>
      <span
        className="logo__mark"
        style={{ '--logo-size': `${size}px` }}
        role="img"
        aria-label="AdanaBildir"
      />

      {withWordmark ? (
        <span className="logo__wordmark">AdanaBildir</span>
      ) : null}
    </span>
  )
}

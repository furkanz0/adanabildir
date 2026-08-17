/**
 * Form gonderiminde ilk hatali alani ekrana getirir.
 *
 * Sorun: uzun bir formda alta inip "Gonder" denince, hata mesaji yukarida
 * bir yerde beliriyordu ve ekran oldugu yerde kaliyordu. Kullanici neden
 * gonderilmedigini goremiyordu.
 *
 * Uc sey ayni anda yapiliyor:
 *   1. Alani gorunur hale getir (yumusak kaydirma)
 *   2. Alani odakla — klavye ve ekran okuyucu kullanicisi de oraya gitsin,
 *      yalnizca gorsel bir hareket yeterli degil
 *   3. Kisa bir halka animasyonuyla isaretle — kaydirma bitince gozun
 *      nereye bakacagi belli olsun
 */

const FLAG_CLASS = 'is-flagged'
const FLAG_MS = 700

function prefersReducedMotion() {
  return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
}

/**
 * Tek bir alani (veya uyari kutusunu) ekrana getirir.
 *
 * @param {string|HTMLElement} target element kimligi veya elementin kendisi
 * @param {{ focus?: boolean }} [options] uyari kutularinda focus kapatilir —
 *   odaklanilabilir bir oge degil
 */
export function revealField(target, { focus = true } = {}) {
  if (typeof document === 'undefined') return

  // Hata metni DOM'a girip yer kapladiktan SONRA olculsun. Once kaydirirsak,
  // metin eklendiginde sayfa altimizdan kayiyor ve hedef ortada kalmiyor.
  requestAnimationFrame(() => {
    const element =
      typeof target === 'string' ? document.getElementById(target) : target
    if (!element) return

    element.scrollIntoView({
      behavior: prefersReducedMotion() ? 'auto' : 'smooth',
      block: 'center',
    })

    // preventScroll olmadan focus() kendi basina ikinci ve animasyonsuz bir
    // sicrama yapiyor, yumusak kaydirmayi yarida kesiyor.
    if (focus && typeof element.focus === 'function') {
      element.focus({ preventScroll: true })
    }

    element.classList.remove(FLAG_CLASS)
    // Ayni sinif art arda eklendiginde animasyon yeniden baslamiyor;
    // araya bir yeniden akis (reflow) sokup tarayiciyi zorluyoruz.
    void element.offsetWidth
    element.classList.add(FLAG_CLASS)

    window.setTimeout(() => element.classList.remove(FLAG_CLASS), FLAG_MS)
  })
}

/**
 * Sirali alan listesinden hatasi olan ILKINI ekrana getirir.
 *
 * Sira DOM sirasi olmali: kullanici yukaridan asagi okur, ilk sorunu
 * yukaridakinden gormeli.
 *
 * @param {Array<{ id: string, error?: string }>} fields
 * @returns {boolean} hatali alan bulundu mu
 */
export function revealFirstError(fields) {
  const first = fields.find((field) => field.error)
  if (!first) return false

  revealField(first.id)
  return true
}

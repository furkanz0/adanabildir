import L from 'leaflet'
import { CATEGORIES, STATUSES, getCategory, getStatus } from '../constants'

// Harita isaretcileri iki bilgiyi ayni anda tasiyor:
//   - pin RENGI   -> durum (amber / mavi / yesil)
//   - pin SIMGESI -> kategori
// Boylece admin bir bildirimin durumunu degistirdiginde harita aninda tepki
// verir, ama kategori bilgisi de kaybolmaz.
//
// Leaflet divIcon ham HTML bekliyor, React bileseni kabul etmiyor. Bu yuzden
// lucide ikonlarinin SVG govdeleri burada dize olarak duruyor. Cizgi
// kalinligi ve uc bicimi lucide varsayilanlariyla ayni (2 / round) tutuldu ki
// arayuzun geri kalanindaki ikonlarla ayni ailedan gorunsunler.
const CATEGORY_GLYPHS = {
  // TriangleAlert
  cukur: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
  // Trash2
  cop: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/><path d="M10 11v6"/><path d="M14 11v6"/>',
  // Ellipsis
  diger:
    '<circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/><circle cx="5" cy="12" r="1"/>',
}

// Durum, isaretcide RENKLE anlatiliyordu — bu WCAG 1.4.1'e (bilgiyi yalnizca
// renkle iletme) takiliyor: kirmizi/yesil ekseni renk korlugunun en yaygin
// bicimi. Pin'in kosesine kucuk bir durum rozeti koyuyoruz; saat / buyutec /
// onay isareti bicim olarak birbirinden ayirt edilebiliyor.
const STATUS_GLYPHS = {
  bekliyor: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
  inceleniyor: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  cozuldu: '<path d="M20 6 9 17l-5-5"/>',
}

function svg(body, strokeWidth = 2.2) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`
}

function glyphSvg(categoryKey) {
  const key = CATEGORY_GLYPHS[categoryKey] ? categoryKey : 'diger'
  return svg(CATEGORY_GLYPHS[key])
}

function statusGlyphSvg(statusKey) {
  const key = STATUS_GLYPHS[statusKey] ? statusKey : 'bekliyor'
  return svg(STATUS_GLYPHS[key], 3)
}

const iconCache = new Map()

/**
 * Pin govdesini uretir. Hem normal hem dagilmis (spiderfy) isaretci bunu
 * kullaniyor; aradaki tek fark disaridan verilen ek sinif ve CSS degiskenleri.
 */
function pinHtml(category, status, selected, { wrapClass = '', extraVars = '' } = {}) {
  // ink: dolgu uzerindeki ikon rengi. Sari pinde beyaz ikon okunmadigi
  // icin duruma gore degisiyor. text: beyaz rozet uzerindeki koyu ton.
  const { hex, ink, text, label: statusLabel } = getStatus(status)
  const { label: categoryLabel } = getCategory(category)
  const pinClass = selected ? 'map-pin map-pin--selected' : 'map-pin'

  // Ekran okuyucu icin: isaretci hem kategoriyi hem durumu soyluyor.
  const accessibleName = `${categoryLabel} — ${statusLabel}`

  return (
    `<span class="map-pin-wrap ${wrapClass}" role="img" aria-label="${accessibleName}" ` +
    `style="--pin-color:${hex};--pin-ink:${ink};--pin-text:${text};${extraVars}">` +
    `<span class="${pinClass}"><span class="map-pin__glyph">${glyphSvg(category)}</span></span>` +
    `<span class="map-pin__status">${statusGlyphSvg(status)}</span>` +
    `</span>`
  )
}

const PIN_SIZE = { iconSize: [34, 44], iconAnchor: [17, 42] }

/**
 * @param {string} categoryKey
 * @param {string} statusKey
 * @param {number} [index] listedeki sira - damla animasyonunun kademeli
 *   gecikmesi icin. Ayni gecikmeyi paylasan isaretciler onbellekten gelir.
 */
export function reportIcon(categoryKey, statusKey, index = 0, selected = false) {
  const category = CATEGORIES[categoryKey] ? categoryKey : 'diger'
  const status = STATUSES[statusKey] ? statusKey : 'bekliyor'
  // Gecikmeyi sinirla: 20. isaretciden sonrasi ayni anda dussun, yoksa
  // kalabalik haritalarda animasyon dakikalarca surer.
  const step = Math.min(index, 20)
  const cacheKey = `${category}|${status}|${step}|${selected ? 's' : 'n'}`

  if (!iconCache.has(cacheKey)) {
    iconCache.set(
      cacheKey,
      L.divIcon({
        className: selected ? 'map-pin-host is-selected' : 'map-pin-host',
        html: pinHtml(category, status, selected, {
          extraVars: `--pin-index:${step}`,
        }),
        ...PIN_SIZE,
      }),
    )
  }

  return iconCache.get(cacheKey)
}

/**
 * Acilmis kumenin bir uyesi. Merkezden disari acilma animasyonu icin
 * otelemenin TERSI degisken olarak veriliyor: animasyon merkezden baslayip
 * kendi yerinde bitiyor.
 *
 * Onbelleklenmiyor — her uyenin otelemesi farkli ve acik kume kucuk (2-6).
 */
export function spiderIcon(categoryKey, statusKey, selected, offset, order = 0) {
  const category = CATEGORIES[categoryKey] ? categoryKey : 'diger'
  const status = STATUSES[statusKey] ? statusKey : 'bekliyor'

  return L.divIcon({
    className: selected
      ? 'map-pin-host map-pin-host--spider is-selected'
      : 'map-pin-host map-pin-host--spider',
    html: pinHtml(category, status, selected, {
      wrapClass: 'map-pin-wrap--spider',
      extraVars:
        `--spider-x:${(-offset.dx).toFixed(1)}px;` +
        `--spider-y:${(-offset.dy).toFixed(1)}px;` +
        `--spider-order:${order}`,
    }),
    ...PIN_SIZE,
  })
}

/**
 * Ust uste binen isaretcilerin yerine gecen sayac.
 *
 * Bilerek NOTR renkte: bu tasarimda renk yalnizca durumu anlatiyor
 * (kirmizi/sari/yesil) ve karisik durumlu bir kumeyi tek renge indirmek
 * yalan olurdu. Durumlar acilinca gorunuyor.
 */
export function clusterIcon(count, hasSelected = false) {
  return L.divIcon({
    className: hasSelected
      ? 'map-pin-host map-cluster-host is-selected'
      : 'map-pin-host map-cluster-host',
    html:
      `<span class="map-cluster" role="img" ` +
      `aria-label="${count} bildirim aynı noktada — ayırmak için tıklayın">` +
      `<span class="map-cluster__count">${count}</span>` +
      `</span>`,
    iconSize: [38, 38],
    iconAnchor: [19, 19],
  })
}

/** Konum secme haritasindaki suruklenebilir isaretci. */
export const pickerIcon = L.divIcon({
  className: 'map-pin-host',
  html: '<span class="map-pin map-pin--picker"><span class="map-pin__glyph"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="3"/><path d="M12 2v3"/><path d="M12 19v3"/><path d="M2 12h3"/><path d="M19 12h3"/></svg></span></span>',
  iconSize: [34, 44],
  iconAnchor: [17, 42],
})

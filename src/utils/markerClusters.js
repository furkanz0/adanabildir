/**
 * Harita uzerinde ust uste binen isaretcilerin gruplanmasi ve acilirken
 * dagilacaklari konumlar.
 *
 * Sorun: iki bildirim birkac metre arayla oldugunda pinler ust uste biniyor ve
 * arkadakine tiklamak neredeyse imkansiz hale geliyor. Yakinlastirmak her
 * zaman ise yaramiyor — ayni binanin onundeki iki kayit en yuksek zoom'da bile
 * ayni pikselde duruyor.
 *
 * Cozum: ekranda cakisanlari tek bir sayaca topluyoruz, tiklaninca bir cember
 * uzerine dagiliyorlar (spiderfy). Konumlar degismiyor, yalnizca gosterim
 * aciliyor; her uyenin gercek yerine ince bir cizgi baglaniyor.
 *
 * Bu dosya saf geometri — Leaflet'e bagimli degil, boylece test edilebiliyor.
 */

/** Bu piksel mesafesinden yakin isaretciler cakisiyor sayilir.
 *  Pin genisligi 34px; yarisindan azi ust uste binmis demektir. */
export const OVERLAP_PX = 26

/**
 * Isaretcileri ekrandaki piksel yakinligina gore gruplar.
 *
 * Tek gecisli, ilk uyan gruba katma yontemi. Kusursuz kumeleme degil (sonuc
 * girdi sirasina bagli) ama burada amac istatistik degil, tiklanabilirlik:
 * birkac pikselik fark kullanici acisindan onemsiz.
 *
 * @param {Array} reports
 * @param {(report: object) => {x: number, y: number}} project
 *   kaydi mutlak piksel duzlemine tasiyan fonksiyon (Leaflet'te map.project)
 * @param {{ thresholdPx?: number }} [options]
 * @returns {Array<{ key: string, x: number, y: number, members: Array }>}
 */
export function groupOverlapping(reports, project, { thresholdPx = OVERLAP_PX } = {}) {
  const groups = []

  for (const report of reports) {
    const point = project(report)
    if (!Number.isFinite(point?.x) || !Number.isFinite(point?.y)) continue

    const hit = groups.find(
      (group) => Math.hypot(group.x - point.x, group.y - point.y) <= thresholdPx,
    )

    if (hit) {
      hit.members.push(report)
      hit.points.push(point)
      // Merkezi uyelerin ortalamasina cekiyoruz ki sayac ortada dursun
      hit.x = hit.points.reduce((sum, p) => sum + p.x, 0) / hit.points.length
      hit.y = hit.points.reduce((sum, p) => sum + p.y, 0) / hit.points.length
    } else {
      groups.push({ x: point.x, y: point.y, members: [report], points: [point] })
    }
  }

  // Anahtar uye kimliklerinden turetiliyor: ayni grup yeniden hesaplandiginda
  // ayni anahtari aliyor, boylece "acik" durumu render'lar arasinda korunuyor.
  return groups.map((group) => ({
    key: group.members
      .map((member) => member.id)
      .sort()
      .join('|'),
    x: group.x,
    y: group.y,
    members: group.members,
  }))
}

/**
 * Acilan grubun uyelerinin merkeze gore piksel otelemeleri.
 *
 * Cember yaricapi uye sayisiyla buyuyor; sabit kalsaydi 5-6 uyede pinler
 * cemberin uzerinde birbirine degerdi.
 *
 * @param {number} count
 * @returns {Array<{ dx: number, dy: number }>}
 */
export function spiderPositions(count) {
  if (count < 2) return [{ dx: 0, dy: 0 }]

  const radius = 30 + count * 5

  // Iki uyede cember yerine yatay ikili: pinler dikeyde uzun oldugu icin
  // alt alta koymak gorsel olarak daha cok cakisiyor.
  const startAngle = count === 2 ? 0 : -Math.PI / 2

  return Array.from({ length: count }, (_, index) => {
    const angle = startAngle + (index * 2 * Math.PI) / count
    return {
      dx: Math.cos(angle) * radius,
      dy: Math.sin(angle) * radius,
    }
  })
}

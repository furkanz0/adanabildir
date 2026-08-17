/**
 * Harita suzgecindeki tarih araliklari.
 *
 * "Son N gun" ifadesi SU ANDAN geriye N*24 saat demek — takvim gunu degil.
 * Sebebi: gun basina yuvarlamak, sabah 09:00'da "son 7 gun" secen biri icin
 * bugunku bildirimleri kapsam disi birakma riskini dogurur. Kayan pencere
 * daha az sasirtici.
 */
export const ALL_DATES = 'tumu'

export const DATE_RANGES = [
  { value: ALL_DATES, label: 'Tümü', days: null },
  { value: '7', label: 'Son 7 gün', days: 7 },
  { value: '30', label: 'Son 30 gün', days: 30 },
  { value: '90', label: 'Son 3 ay', days: 90 },
]

const DAYS = Object.fromEntries(DATE_RANGES.map((r) => [r.value, r.days]))

/**
 * Bir zaman damgasi secili araliga giriyor mu?
 *
 * @param {number} millis kaydin olusturulma zamani
 * @param {string} range DATE_RANGES degerlerinden biri
 * @param {number} [now] test edilebilirlik icin disaridan verilebilir
 */
export function isWithinRange(millis, range, now = Date.now()) {
  const days = DAYS[range]
  if (days == null) return true // "Tümü" veya taninmayan deger

  // createdAt damgasi olmayan eski/elle girilmis kayitlar 0 gelir. Bunlari
  // elemek yerine ariyoruz: "tarihi bilinmiyor" ile "eski" ayni sey degil,
  // ve gorunmez olmalari kullaniciyi kayip kayit aramaya iter.
  if (!Number.isFinite(millis) || millis <= 0) return true

  return millis >= now - days * 24 * 60 * 60 * 1000
}

export function getRangeLabel(value) {
  return DATE_RANGES.find((r) => r.value === value)?.label ?? 'Tümü'
}

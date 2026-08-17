/**
 * Desteklenen ilceler — simdilik yalnizca Adana'nin 4 merkez ilcesi.
 * Diger 11 ilce kapsam disi.
 *
 * Bu dosya tek dogruluk kaynagi: form secicisi, harita suzgeci, admin
 * paneli ve rozetler hepsi buradan besleniyor.
 */
export const DISTRICTS = [
  { value: 'seyhan', label: 'Seyhan' },
  { value: 'yuregir', label: 'Yüreğir' },
  { value: 'cukurova', label: 'Çukurova' },
  { value: 'saricam', label: 'Sarıçam' },
]

/**
 * Kaba dikdortgen sinirlar ve harita odak merkezleri.
 *
 * Bunlar GERCEK idari sinirlar DEGIL — ilcelerin gercek sinirlari duzensiz
 * poligonlardir. Burada amac hassas coglrafi dogruluk degil, kullaniciya
 * makul bir on secim sunmak; kullanici yanlissa dropdown'dan degistirebiliyor.
 *
 * Dikdortgenler kacinilmaz olarak ust uste biniyor (Seyhan/Yuregir sinirinda
 * Seyhan nehri, Cukurova/Saricam sinirinda universite bolgesi gibi). Cakisma
 * durumunda merkeze en yakin ilce seciliyor — bkz. src/utils/district.js
 *
 * `center` ve `focus` bilerek ayri:
 *   center -> cakisma cozumu icin geometrik referans (siniflandirma)
 *   focus  -> ilce secilince haritanin ucacagi nokta (goruntuleme)
 * Cogunda ayni; ayrildigi yerde `focus` tanimli. Ikisini tek alanda tutmak,
 * kadraji duzeltmek isteyince siniflandirmayi bozmak demek olurdu.
 */
export const DISTRICT_GEO = {
  seyhan: {
    // Seyhan nehrinin batisi: tarihi merkez, Cinarli, Resatbey, Doseme
    center: [36.985, 35.315],
    bounds: { minLat: 36.9, maxLat: 37.015, minLon: 35.22, maxLon: 35.345 },
  },
  yuregir: {
    // Nehrin dogusu ve guneyi: Yuregir merkez, Sinanpasa, Karsiyaka.
    // Kuzeyde Yenibaraj/Kislaya kadar uzaniyor, o yuzden maxLat 37.01.
    center: [36.968, 35.372],
    // Dikdortgen guneyde 36.85'e kadar iniyor (kirsal kesim), bu da geometrik
    // merkezi asagi cekiyor. Haritayi oraya ucurunca sehir kadraj disinda
    // kaliyordu; odagi yerlesik alanin ortasina aliyoruz.
    focus: [36.995, 35.365],
    bounds: { minLat: 36.85, maxLat: 37.01, minLon: 35.335, maxLon: 35.405 },
  },
  cukurova: {
    // Kuzeybati: Toros, Guzelyali, Yurt, Huzurevleri, Belediye Evleri
    center: [37.045, 35.3],
    bounds: { minLat: 37.005, maxLat: 37.1, minLon: 35.24, maxLon: 35.345 },
  },
  saricam: {
    // Kuzeydogu: Cukurova Universitesi, Incirlik, Saricam merkez
    center: [37.04, 35.41],
    bounds: { minLat: 36.96, maxLat: 37.15, minLon: 35.345, maxLon: 35.58 },
  },
}

/**
 * Ilce secildiginde haritanin odaklanacagi yakinlastirma seviyesi.
 *
 * Sehir geneli MAP_ZOOM=12. Tam kademeler arada kaliyordu: 13 fazla genis,
 * 14 fazla yakin. Yarim kademe icin haritada zoomSnap={0.5} ayarli — bkz.
 * ReportsMap.jsx. Masaustunde 13.5 yaklasik 15 km genislik demek: ilce
 * ortada, cevresi de gorunur halde.
 */
export const DISTRICT_ZOOM = 13.5

/**
 * Dar ekranda ayni zoom cok daha az alan gosterir. Telefonda yarim kademe
 * geri alip ilcenin tamamini gorunur tutuyoruz.
 */
export const DISTRICT_ZOOM_NARROW = 12.5

/** Bunun altindaki harita genisliginde dar ekran sayiliyor (piksel). */
export const NARROW_MAP_WIDTH = 700

export const ALL_DISTRICTS = 'tumu'

const LABELS = Object.fromEntries(DISTRICTS.map((d) => [d.value, d.label]))

/** Kayitli deger yoksa veya taninmiyorsa cizgi doner. */
export function getDistrictLabel(value) {
  return LABELS[value] ?? '—'
}

export function isKnownDistrict(value) {
  return Boolean(value) && value in LABELS
}

const EARTH_RADIUS_METERS = 6371000

/** Ayni noktada sayilacak yaricap. Sehirde GPS sapmasi ~10-30 m oldugu icin
 *  bundan daha dar bir esik gercek mukerrerleri kacirir. */
export const NEARBY_RADIUS_METERS = 60

const toRadians = (degrees) => (degrees * Math.PI) / 180

/**
 * Iki koordinat arasindaki yuzey mesafesi (metre) — haversine formulu.
 *
 * Duz Oklid mesafesi kullanilamaz: enlem/boylam dereceleri esit uzunlukta
 * degildir. Adana enleminde 1 derece boylam ~89 km, 1 derece enlem ~111 km.
 * Haversine kureyi hesaba katarak dogru sonucu verir.
 */
export function distanceInMeters(lat1, lon1, lat2, lon2) {
  const dLat = toRadians(lat2 - lat1)
  const dLon = toRadians(lon2 - lon1)

  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) ** 2

  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.min(1, Math.sqrt(a)))
}

/**
 * Verilen noktanin yakinindaki HENUZ COZULMEMIS bildirimleri bulur.
 *
 * Cozulmus kayitlar disarida: kapanmis bir sorun mukerrer sayilmaz, ayni yerde
 * tekrar ortaya cikmis olabilir ve yeni bir bildirimi hak eder.
 *
 * KATEGORIYE GORE SUZMUYOR. Onceden suzuyordu ve su hataya yol aciyordu:
 * yapay zeka kategoriyi "cop" tahmin ediyor, yakinlik uyarisi cikiyor,
 * kullanici kategoriyi "cukur" olarak duzeltince uyari kayboluyor ve ayni
 * noktaya ikinci kayit hicbir soru sorulmadan giriyordu. Gerceklesen ornek:
 * 1 metre arayla iki kayit.
 *
 * Kategori bilgisi kayboluyor degil — `sameCategory` bayragi ile geliyor,
 * arayuz "ayni sorun olabilir" ile "ayni noktada baska bir sorun" ayrimini
 * bu bayrakla yapiyor.
 *
 * @param {object} [options]
 * @param {string} [options.category] varsa her sonuca `sameCategory` eklenir
 * @returns {Array} en yakindan uzaga sirali, `distance` ve `sameCategory` ekli
 */
export function findNearbyReports(
  reports,
  { latitude, longitude },
  { category, radiusMeters = NEARBY_RADIUS_METERS, excludeId = null } = {},
) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return []

  return reports
    .filter(
      (report) =>
        report.id !== excludeId &&
        report.status !== 'cozuldu' &&
        Number.isFinite(report.latitude) &&
        Number.isFinite(report.longitude),
    )
    .map((report) => ({
      ...report,
      distance: distanceInMeters(
        latitude,
        longitude,
        report.latitude,
        report.longitude,
      ),
      sameCategory: Boolean(category) && report.category === category,
    }))
    .filter((report) => report.distance <= radiusMeters)
    // Ayni kategoridekiler once: mukerrer olma ihtimali en yuksek olanlar
    // listenin basinda gorunsun.
    .sort(
      (a, b) =>
        Number(b.sameCategory) - Number(a.sameCategory) ||
        a.distance - b.distance,
    )
}

/** 0-999 m arasi metre, uzerini km olarak yazar. */
export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '—'
  if (meters < 1000) return `${Math.round(meters)} m`
  return `${(meters / 1000).toFixed(1)} km`
}

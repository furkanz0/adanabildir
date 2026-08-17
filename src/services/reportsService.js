import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import { DEFAULT_STATUS, STATUSES } from '../constants'
import { suggestDistrict } from '../utils/district'

export const REPORTS_COLLECTION = 'reports'

function toMillis(createdAt) {
  if (!createdAt) return 0
  // Firestore Timestamp
  if (typeof createdAt.toMillis === 'function') return createdAt.toMillis()
  // Elle girilmis ISO string veya sayi olma ihtimaline karsi
  const parsed = new Date(createdAt).getTime()
  return Number.isNaN(parsed) ? 0 : parsed
}

function normalize(docSnapshot) {
  const data = docSnapshot.data()
  const createdAtMillis = toMillis(data.createdAt)
  const stamps = data.statusTimestamps ?? {}

  const latitude = Number(data.latitude)
  const longitude = Number(data.longitude)

  // Ilce alani bu ozellik eklenmeden onceki kayitlarda YOK. Bos birakirsak o
  // kayitlar hicbir ilce suzgecinde gorunmez. Bu yuzden alan yoksa koordinattan
  // turetiyoruz — zaten form da tam olarak bunu yapip kaydediyor.
  // `districtStored` ham degeri saklar: turetilmis mi kayitli mi ayirt edilsin.
  const storedDistrict = data.district ?? ''
  const district = storedDistrict || suggestDistrict(latitude, longitude) || ''

  return {
    id: docSnapshot.id,
    userId: data.userId ?? '',
    category: data.category ?? 'diger',
    district,
    districtStored: storedDistrict,
    description: data.description ?? '',
    imageUrl: data.imageUrl ?? '',
    latitude,
    longitude,
    status: data.status ?? 'bekliyor',
    createdAt: data.createdAt ?? null,
    createdAtMillis,
    // Bu alan eklenmeden onceki kayitlarda yok; sayi degilse null.
    damageDensity: Number.isFinite(data.damageDensity)
      ? data.damageDensity
      : null,
    // Belediye tarafindan yazilan aciklama — "ne yapildi" bilgisi
    adminNote: data.adminNote ?? '',
    adminNoteAtMillis: toMillis(data.adminNoteAt),
    // Her durumun ne zaman girildigi. "bekliyor" bildirimin olusturuldugu
    // andir, o yuzden damgasi yoksa createdAt'e dusuyor — eski kayitlar da
    // dogru gorunsun diye.
    statusTimestamps: {
      bekliyor: toMillis(stamps.bekliyor) || createdAtMillis,
      inceleniyor: toMillis(stamps.inceleniyor),
      cozuldu: toMillis(stamps.cozuldu),
    },
  }
}

/**
 * `reports` koleksiyonunu gercek zamanli dinler.
 *
 * Siralama sorguda degil, istemci tarafinda yapiliyor: Firestore'da
 * orderBy('createdAt') kullansaydik, Console'dan elle eklenen ve `createdAt`
 * alani olmayan test belgeleri sonuca hic dahil edilmezdi. Boylece eksik
 * alanli belgeler de haritada gorunur ve ek index gerekmez.
 *
 * @param {(reports: Array) => void} onData
 * @param {(error: Error) => void} [onError]
 * @returns {() => void} dinlemeyi birakmak icin cagrilacak fonksiyon
 */
export function subscribeToReports(onData, onError) {
  if (!db) {
    onError?.(new Error('Firebase yapilandirilmamis. .env dosyasini doldurun.'))
    return () => {}
  }

  // Ilce suzmesi bilerek SUNUCUDA yapilmiyor. Firestore'un
  // `where('district','==',x)` sorgusu, o alani hic tasimayan belgeleri
  // dondurmez — bu ozellik eklenmeden once olusturulmus butun kayitlar
  // suzgecte kaybolurdu. Suzme istemcide, normalize() icinde koordinattan
  // turetilen ilce uzerinden yapiliyor; boylece eski kayitlar da dogru
  // ilcede gorunuyor ve veri gocune gerek kalmiyor.
  return onSnapshot(
    collection(db, REPORTS_COLLECTION),
    (snapshot) => {
      const reports = snapshot.docs
        .map(normalize)
        .filter(
          (r) => Number.isFinite(r.latitude) && Number.isFinite(r.longitude),
        )
        .sort((a, b) => b.createdAtMillis - a.createdAtMillis)

      onData(reports)
    },
    (error) => {
      console.error('[reports] dinleme hatasi:', error)
      onError?.(error)
    },
  )
}

/**
 * Yeni bir bildirim olusturur.
 *
 * createdAt icin serverTimestamp() kullaniliyor: kullanicinin bilgisayar saati
 * yanlis olsa bile kayit zamani tutarli kalir.
 *
 * @returns {Promise<string>} olusturulan belgenin kimligi
 */
export async function createReport({
  userId,
  category,
  district,
  description,
  imageUrl,
  latitude,
  longitude,
  damageDensity = null,
}) {
  if (!db) {
    throw new Error('Firebase yapılandırılmamış. .env dosyasını doldurun.')
  }

  const docRef = await addDoc(collection(db, REPORTS_COLLECTION), {
    userId,
    category,
    district,
    description: description.trim(),
    imageUrl,
    latitude: Number(latitude),
    longitude: Number(longitude),
    // OpenCV.js analizi. CDN inmezse veya hesaplama basarisiz olursa null
    // gidiyor — bildirim yine olusuyor, alan bos kaliyor.
    damageDensity: Number.isFinite(damageDensity) ? damageDensity : null,
    status: DEFAULT_STATUS,
    createdAt: serverTimestamp(),
    // Ilk durumun damgasi da bastan yaziliyor ki zaman cizelgesi tutarli olsun
    statusTimestamps: { [DEFAULT_STATUS]: serverTimestamp() },
  })

  return docRef.id
}

/**
 * Tek bir bildirimi getirir.
 * @returns {Promise<object|null>} belge yoksa null
 */
export async function getReport(reportId) {
  if (!db) {
    throw new Error('Firebase yapılandırılmamış. .env dosyasını doldurun.')
  }

  const snapshot = await getDoc(doc(db, REPORTS_COLLECTION, reportId))
  if (!snapshot.exists()) return null

  return normalize(snapshot)
}

/**
 * Belirli bir kullanicinin bildirimlerini gercek zamanli dinler.
 *
 * DIKKAT: where + orderBy birlikte kullanildigi icin Firestore bu sorgu icin
 * bir bilesik (composite) index ister. Index yoksa hata 'failed-precondition'
 * kodu ve olusturma baglantisi iceren bir mesajla gelir; extractIndexUrl()
 * bu baglantiyi cikarip kullaniciya gosterilebilir hale getirir.
 */
export function subscribeToUserReports(userId, onData, onError) {
  if (!db) {
    onError?.(new Error('Firebase yapılandırılmamış. .env dosyasını doldurun.'))
    return () => {}
  }

  const userReportsQuery = query(
    collection(db, REPORTS_COLLECTION),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc'),
  )

  return onSnapshot(
    userReportsQuery,
    (snapshot) => onData(snapshot.docs.map(normalize)),
    (error) => {
      console.error('[reports] kullanici sorgusu hatasi:', error)
      onError?.(error)
    },
  )
}

/**
 * Bildirimin durumunu gunceller (admin paneli kullanir).
 *
 * Durumla birlikte o duruma gecis zamanini da yaziyoruz; vatandas her
 * asamanin ne zaman gerceklestigini gorebilsin. Nokta notasyonu (`a.b`)
 * yalnizca ilgili alt alani gunceller, haritanin tamamini ezmez.
 *
 * DIKKAT: Firestore kurali bu iki alana birden izin vermeli:
 *   affectedKeys().hasOnly(['status', 'statusTimestamps'])
 */
export async function updateReportStatus(reportId, status) {
  if (!db) {
    throw new Error('Firebase yapılandırılmamış. .env dosyasını doldurun.')
  }

  if (!STATUSES[status]) {
    throw new Error(`Geçersiz durum değeri: ${status}`)
  }

  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    status,
    [`statusTimestamps.${status}`]: serverTimestamp(),
  })
}

/**
 * Belediye aciklamasini yazar veya gunceller (admin paneli kullanir).
 *
 * Zaman cizelgesi bildirimin ne zaman cozuldugunu soyluyor ama NE YAPILDIGINI
 * soylemiyordu. Vatandas acisindan eksik olan buydu: gercekten onarildi mi,
 * yoksa "ilgisiz" diye mi kapatildi?
 *
 * DIKKAT: Firestore kurali bu alanlara da izin vermeli:
 *   affectedKeys().hasOnly(['status','statusTimestamps','adminNote','adminNoteAt'])
 */
export async function updateReportNote(reportId, note) {
  if (!db) {
    throw new Error('Firebase yapılandırılmamış. .env dosyasını doldurun.')
  }

  const trimmed = String(note ?? '').trim()

  await updateDoc(doc(db, REPORTS_COLLECTION, reportId), {
    adminNote: trimmed,
    // Not silindiyse zaman damgasi da anlamini yitiriyor
    adminNoteAt: trimmed ? serverTimestamp() : null,
  })
}

/**
 * Bildirimi siler.
 *
 * Yetki kontrolu burada yapilmiyor — yapilamaz da, cunku tarayicidaki her
 * sey degistirilebilir. Gercek kontrol Firestore kurallarinda:
 * admin her kaydi, kullanici yalnizca kendi kaydini silebilir. Arayuzdeki
 * canDeleteReport() yalnizca butonu kime gosterecegimizi belirler.
 *
 * NOT: Cloudinary'deki gorsel silinmiyor. Imzasiz yukleme anahtariyla
 * tarayicidan silme yapilamaz; silme API secret gerektirir ve o anahtar
 * istemciye konulamaz. Gorsel Cloudinary'de oksuz kalir.
 */
export async function deleteReport(reportId) {
  if (!db) {
    throw new Error('Firebase yapılandırılmamış. .env dosyasını doldurun.')
  }

  await deleteDoc(doc(db, REPORTS_COLLECTION, reportId))
}

/**
 * Firestore'un "index gerekli" hatasi, index'i olusturacak Console
 * baglantisini mesajin icine gomer. Kullaniciyi konsola bakmaya zorlamamak
 * icin o baglantiyi cikariyoruz.
 */
export function extractIndexUrl(error) {
  const match = /https:\/\/console\.firebase\.google\.com\S+/.exec(
    error?.message ?? '',
  )
  if (!match) return null

  // Mesaj sonundaki noktalama baglantiya yapismis olabilir.
  return match[0].replace(/[).,;]+$/, '')
}

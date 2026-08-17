import { isAdminEmail } from './admin'

/**
 * Bir bildirimi kim silebilir?
 *   - admin her bildirimi
 *   - kullanici yalnizca kendi olusturdugunu
 *
 * Bu yalnizca ARAYUZ kararidir: butonun gosterilip gosterilmeyecegini
 * belirler. Gercek yetkilendirme Firestore kurallarindadir; tarayicidan
 * dogrudan silme denemesi kural tarafindan reddedilir.
 */
export function canDeleteReport(user, report) {
  if (!user || !report) return false
  if (isAdminEmail(user.email)) return true
  return Boolean(report.userId) && report.userId === user.uid
}

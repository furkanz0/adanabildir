// Admin yetkisi .env'deki tek bir e-posta adresiyle belirleniyor.
//
// ONEMLI: Bu yalnizca arayuz seviyesinde bir kontrol. Tarayicida calisan her
// sey degistirilebilir, dolayisiyla gercek koruma Firestore Security Rules
// tarafinda olmali (bkz. README). Buradaki kontrol "admin olmayan kullaniciya
// paneli gostermemek" icindir, "admin olmayan kullaniciyi engellemek" icin
// degil.

const ADMIN_EMAIL = (import.meta.env.VITE_ADMIN_EMAIL ?? '').trim().toLowerCase()

export const isAdminConfigured = ADMIN_EMAIL !== ''

export function isAdminEmail(email) {
  if (!isAdminConfigured || !email) return false
  // E-posta adresleri buyuk/kucuk harf duyarsizdir; karsilastirmayi da oyle yap.
  return email.trim().toLowerCase() === ADMIN_EMAIL
}

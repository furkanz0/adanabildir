// Firebase Authentication hata kodlarini kullaniciya gosterilebilir
// Turkce mesajlara cevirir.
const ERROR_MESSAGES = {
  'auth/invalid-email': 'Geçersiz e-posta adresi.',
  'auth/user-disabled': 'Bu hesap devre dışı bırakılmış.',
  'auth/user-not-found': 'Bu e-posta ile kayıtlı bir hesap bulunamadı.',
  'auth/wrong-password': 'E-posta veya şifre hatalı.',
  'auth/invalid-credential': 'E-posta veya şifre hatalı.',
  'auth/missing-password': 'Lütfen şifrenizi girin.',
  'auth/email-already-in-use': 'Bu e-posta adresi zaten kayıtlı.',
  'auth/weak-password': 'Şifre çok zayıf. En az 6 karakter kullanın.',
  'auth/too-many-requests':
    'Çok fazla deneme yapıldı. Lütfen biraz sonra tekrar deneyin.',
  'auth/network-request-failed':
    'Ağ hatası. İnternet bağlantınızı kontrol edin.',
  'auth/operation-not-allowed':
    'E-posta/şifre yöntemi etkin değil. Firebase Console > Authentication > Sign-in method bölümünden etkinleştirin.',
  'auth/api-key-not-valid':
    'Firebase API anahtarı geçersiz. .env dosyasını kontrol edin.',
}

export function getAuthErrorMessage(error) {
  const code = error?.code ?? ''
  if (ERROR_MESSAGES[code]) return ERROR_MESSAGES[code]

  // Bazi SDK surumleri kodu ayri bir alan yerine mesajin icine gomuyor.
  const match = Object.keys(ERROR_MESSAGES).find((key) =>
    String(error?.message ?? '').includes(key),
  )
  if (match) return ERROR_MESSAGES[match]

  return 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.'
}

const DATE_TIME = new Intl.DateTimeFormat('tr-TR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const DATE_ONLY = new Intl.DateTimeFormat('tr-TR', { dateStyle: 'medium' })

/**
 * Bildirimin olusturulma zamanini okunabilir bicime cevirir.
 *
 * serverTimestamp() ile yazilan bir belge, sunucudan onay gelene kadar kisa
 * bir sure null createdAt ile gelir; o durumda tarih yerine bilgilendirici bir
 * metin donuyoruz.
 */
export function formatDateTime(millis) {
  if (!millis) return 'Tarih yok'
  return DATE_TIME.format(new Date(millis))
}

export function formatDate(millis) {
  if (!millis) return 'Tarih yok'
  return DATE_ONLY.format(new Date(millis))
}

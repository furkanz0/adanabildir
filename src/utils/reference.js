/**
 * Firestore'un otomatik urettigi belge kimligini (or.
 * "FsLCrpP0I8IEnrptMkmE") vatandasa gosterilebilecek kisa bir basvuru
 * numarasina cevirir: "BLD-PTM-KME".
 *
 * Ham kimlik veritabani ici bir tanimlayicidir; 20 karakter, buyuk/kucuk harf
 * karisik ve telefonda okunamaz. Bu kisa bicim yalnizca GORUNTULEME icindir —
 * kaydin gercek ve benzersiz kimligi hala belge kimligidir ve adres
 * cubugunda (/report/:id) durur.
 *
 * Not: kisaltma son 6 karakteri aldigi icin teorik olarak iki bildirimin ayni
 * kodu almasi mumkundur. Firestore kimlikleri rastgele oldugundan bu ihtimal
 * bu olcekte ihmal edilebilir; kesin ayrim gerektiginde belge kimligi
 * kullanilmalidir.
 */
export function referenceCode(id) {
  if (!id) return '—'

  const compact = String(id).replace(/[^a-zA-Z0-9]/g, '').toUpperCase()
  if (compact.length < 6) return `BLD-${compact}`

  const tail = compact.slice(-6)
  return `BLD-${tail.slice(0, 3)}-${tail.slice(3)}`
}

import {
  CircleCheckBig,
  Clock,
  Ellipsis,
  Search,
  Trash2,
  TriangleAlert,
} from 'lucide-react'

// Bildirim kategorileri. Firestore'daki `category` alani bu anahtarlardan
// birini tutar. `Icon` React tarafinda kullanilir; harita isaretcileri icin
// gereken ham SVG karsiliklari src/utils/mapIcons.js icindedir.
//
// Uc kategori var, cunku model yalnizca cukur ve cop siniflarini biliyor;
// 'diger' modelin emin olamadigi durumlar icin (bkz. aiService.js
// CONFIDENCE_THRESHOLD). Onceki 'aydinlatma' kategorisi kaldirildi — modelde
// karsiligi yoktu ve Firestore'da o kategoride hic kayit bulunmuyordu.
// getCategory() taninmayan anahtari 'diger'e dusurdugu icin, elle girilmis
// eski bir kayit cikarsa da arayuz kirilmaz.
export const CATEGORIES = {
  cukur: { label: 'Çukur', Icon: TriangleAlert },
  cop: { label: 'Çöp', Icon: Trash2 },
  diger: { label: 'Diğer', Icon: Ellipsis },
}

export const DEFAULT_CATEGORY = 'diger'

export function getCategory(key) {
  return CATEGORIES[key] ?? CATEGORIES[DEFAULT_CATEGORY]
}

// Bildirim durumlari.
//
// Renk burada tek kaynaktan yonetiliyor: hem rozetler, hem harita
// isaretcileri, hem detay sayfasindaki zaman cizelgesi ayni degeri okuyor.
// Boylece bir renk uygulamanin her yerinde ayni seyi soyluyor.
//
// `order` alani zaman cizelgesinin adim sirasini belirler.
// Trafik lambasi mantigi: kirmizi = el atilmadi, sari = uzerinde calisiliyor,
// yesil = bitti.
//
// Her durumun UC rengi var, cunku ayni ton her yerde ise yaramiyor:
//   hex  - dolgu rengi (harita pini, dolu rozet)
//   ink  - dolgunun UZERINDEKI ikon/yazi rengi (sari uzerinde beyaz okunmaz)
//   text - ACIK zemin uzerinde yazi rengi (sarinin kendisi beyazda okunmaz,
//          koyu altin tonuna dusuyoruz)
export const STATUSES = {
  bekliyor: {
    label: 'Bekliyor',
    hex: '#D64545',
    ink: '#ffffff',
    // Yumusak rozet TINTLI bir zemine oturdugunda (or. mukerrer uyarisinin
    // amber kutusu) #b03030 4.19:1'e dusuyordu. Bu ton o zeminde 5.03:1,
    // beyaz kartta 7.60:1 — iki durumda da WCAG AA'yi geciyor.
    text: '#9c2929',
    Icon: Clock,
    order: 0,
    hint: 'Bildirim ekiplere iletildi, henüz incelenmedi.',
  },
  inceleniyor: {
    label: 'İnceleniyor',
    hex: '#ebb01a',
    ink: '#16231f',
    text: '#8a6300',
    Icon: Search,
    order: 1,
    hint: 'Ekipler sorunu yerinde değerlendiriyor.',
  },
  cozuldu: {
    label: 'Çözüldü',
    hex: '#2f9e62',
    ink: '#ffffff',
    text: '#1f7a49',
    Icon: CircleCheckBig,
    order: 2,
    hint: 'Sorun giderildi.',
  },
}

export const DEFAULT_STATUS = 'bekliyor'

export function getStatus(key) {
  return STATUSES[key] ?? STATUSES[DEFAULT_STATUS]
}

/** Zaman cizelgesi icin durumlari sirali dizi olarak verir. */
export const STATUS_STEPS = Object.entries(STATUSES)
  .map(([key, value]) => ({ key, ...value }))
  .sort((a, b) => a.order - b.order)

// Harita varsayilan merkezi: Adana, Türkiye
export const MAP_CENTER = [37.0, 35.3213]
export const MAP_ZOOM = 12

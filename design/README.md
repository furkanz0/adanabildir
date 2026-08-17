# Tasarım kaynak dosyaları

Bu klasör **derlemeye ve yayına dahil edilmez** — Vite yalnızca `public/`
içeriğini `dist/`e kopyalar. Kaynak dosyalar burada durur, siteye gitmez.

## logo-source.jpg

AdanaBildir logosunun orijinali (404×404, turuncu zeminli). `public/` altındaki
üç dosya bundan türetildi:

| Türetilen | Nasıl |
| --- | --- |
| `public/favicon.png` | 64×64'e küçültüldü (672 KB → 1 KB) |
| `public/apple-touch-icon.png` | 180×180, iOS ana ekran için |
| `public/logo-mark.png` | Turuncu zemin şeffafa çevrildi, yalnızca işaret kaldı |

`logo-mark.png` arayüzde `<img>` olarak değil **CSS maskesi** olarak
kullanılıyor (`src/index.css` → `.logo__mark`). Maske yalnızca şekli alır,
rengi `currentColor` belirler — bu sayede tek dosya koyu navbar'da beyaz,
açık kartta petrol yeşili görünür.

Logo değişirse: yeni dosyayı buraya koyup üç türevi yeniden üretmek gerekir.

<img src="public/favicon.png" alt="AdanaBildir logosu" width="72" align="left" hspace="12" />

# AdanaBildir

Vatandaşların şehirdeki sorunları (yol çukuru, çöp yığını) fotoğraflayıp
konumuyla birlikte bildirdiği, bildirimlerin harita üzerinde gerçek zamanlı
görüntülendiği web uygulaması. Yüklenen fotoğraf tarayıcıda iki ayrı görüntü
işleme adımından geçiyor: TensorFlow.js ile kategori tahmini, OpenCV.js ile
hasar yoğunluğu ölçümü ve netlik kontrolü.

Adana Büyükşehir Belediyesi stajı kapsamında geliştirilen demo/portföy
projesidir. **Resmî bir belediye hizmeti değildir.**

## Özellikler

**Vatandaş**

- E-posta/şifre ile kayıt ve giriş
- Tüm bildirimlerin harita üzerinde gerçek zamanlı gösterimi (`onSnapshot`)
- Fotoğraf + konum + açıklama ile bildirim oluşturma
- Fotoğraf seçilir seçilmez TensorFlow.js ile otomatik kategori tahmini
- Çukur bildirimlerinde OpenCV.js ile **hasar yoğunluğu** ölçümü; ölçülen bölge
  detay sayfasında ve harita panelinde çerçeveyle gösteriliyor
- **Netlik kontrolü** — bulanık fotoğrafta tekrar çekme önerisi (engellemez)
- Konum otomatik alınır; alınamazsa haritadan seçilebilir
- İlçe otomatik önerilir (koordinattan), kullanıcı değiştirebilir
- Yakında bildirim varsa gönderim öncesi **onay sorusu**
- İlçe / durum / kategori / tarih olmak üzere dört süzgeç
- Üst üste binen işaretçiler tek sayaçta toplanır, tıklayınca dağılır
- Bildirimin hangi aşamaya ne zaman geçtiğini gösteren zaman çizelgesi
- Kendi bildirimlerini listeleme ve silme

**Yönetim**

- E-posta ile kısıtlı admin paneli
- Durum güncelleme (bekliyor / inceleniyor / çözüldü)
- Vatandaşa görünen "belediye açıklaması" yazma
- Her bildirimi silebilme
- İlçe / kategori / durum süzgeçleri ve ilçe başına bildirim sayıları
- Canlı istatistik: anlık durum dağılımı, bu ayın akışı, çözüm oranı

## Teknoloji yığını

| Katman | Kullanılan |
| --- | --- |
| Arayüz | React 19 + Vite |
| Yönlendirme | react-router-dom (rota bazlı `React.lazy`) |
| Kimlik doğrulama | Firebase Authentication (e-posta/şifre) |
| Veritabanı | Cloud Firestore |
| Görsel depolama | Cloudinary (unsigned upload) |
| Harita | react-leaflet + OpenStreetMap |
| İkonlar | lucide-react |
| Görüntü sınıflandırma | TensorFlow.js + Teachable Machine |
| Görüntü işleme | OpenCV.js 4.9 (CDN, WASM) |
| Kod kalitesi | oxlint |
| Yayın | Firebase Hosting |

Sürümler [`package.json`](package.json) içinde: React 19, Vite 8,
react-router-dom 7, react-leaflet 5, firebase 12, `@tensorflow/tfjs` 4.

Proje baştan sona **hiçbir ücret ödemeden** çalışacak şekilde tasarlandı:
Firebase Spark planı, Cloudinary ücretsiz planı, OpenStreetMap (API anahtarı
gerektirmez), tarayıcıda çalışan TensorFlow.js ve OpenCV.js. Sunucu tarafında
hiçbir işlem yok — bütün görüntü işleme kullanıcının cihazında.

### Mimari

```text
        ┌─────────────┐
        │  Kullanıcı  │  (tarayıcı, mobil veya masaüstü)
        └──────┬──────┘
               │
    ┌──────────▼───────────┐
    │   React 19 + Vite    │   rota bazlı React.lazy
    │  (tek sayfa uygulama)│
    └─┬────┬────┬────┬─────┘
      │    │    │    │
      │    │    │    └──────────────► OpenStreetMap ──► harita döşemeleri
      │    │    │                     (anahtarsız)
      │    │    │
      │    │    └── TARAYICIDA ÇALIŞAN GÖRÜNTÜ İŞLEME
      │    │        ├─ TensorFlow.js  ──► public/model/  (kategori tahmini)
      │    │        └─ OpenCV.js      ──► CDN, WASM      (yoğunluk + netlik)
      │    │            İkisi de fotoğraf seçilince, ağa çıkmadan çalışır.
      │    │
      │    └── Cloudinary  ──► imzasız yükleme ──► görsel URL'i
      │
      └── Firebase
          ├─ Authentication  (e-posta/şifre)
          └─ Cloud Firestore ──► reports/{id}
                                 onSnapshot ile canlı dinleme
                                        │
                    ┌───────────────────┴───────────────────┐
                    ▼                                       ▼
              Harita + süzgeçler                  Detay / Bildirimlerim
              (işaretçi, kümeleme)                / Admin paneli
```

Akış: kullanıcı fotoğraf seçer → iki analiz paralel başlar → Cloudinary'e
yükleme → Firestore'a kayıt (`damageDensity` dahil) → `onSnapshot` bütün açık
istemcilerde haritayı anında günceller.

### Neden Firebase Storage değil?

30 Ekim 2024'ten sonra oluşturulan Firebase projelerinde Cloud Storage'ı
etkinleştirmek Blaze planına (kredi kartı bağlamaya) geçmeyi gerektiriyor. Bu
proje hiçbir ücret harcanmadan çalışacak şekilde tasarlandığı için görsel
depolama Cloudinary'nin ücretsiz planına taşındı.

Yükleme mantığı tek bir dosyada izole:
[`src/services/storageService.js`](src/services/storageService.js). Sağlayıcı
değiştirmek istersen yalnızca o dosyanın içi değişir; çağıran taraf
`uploadReportImage(file, userId)` imzasını görmeye devam eder.

---

## Kurulum

### 1. Gereksinimler

- Node.js 20 veya üzeri ([nodejs.org](https://nodejs.org))
- Bir Firebase projesi (ücretsiz Spark planı yeterli)
- Bir Cloudinary hesabı (ücretsiz plan yeterli)

### 2. Bağımlılıkları kur

```bash
npm install
```

### 3. Ortam değişkenlerini ayarla

`.env.example` dosyasını `.env` olarak kopyala ve değerleri doldur:

```bash
cp .env.example .env
```

```env
# Firebase Console > Proje Ayarları (⚙) > Genel > Uygulamalarınız > Web
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

# Cloudinary
VITE_CLOUDINARY_CLOUD_NAME=
VITE_CLOUDINARY_UPLOAD_PRESET=

# Admin panelini (/admin) görebilecek tek e-posta adresi
VITE_ADMIN_EMAIL=
```

> `.env` dosyası `.gitignore` içindedir, repoya gönderilmez.
> Değerleri değiştirdikten sonra dev sunucusunu **yeniden başlat** — Vite ortam
> değişkenlerini yalnızca açılışta okur.

`VITE_FIREBASE_STORAGE_BUCKET` bu projede kullanılmıyor ama Firebase config
nesnesinin bir parçası olduğu için Console'da göründüğü şekilde doldurulmalı.

`.env` doldurulmadan uygulama açılırsa çökmek yerine ne yapılması gerektiğini
anlatan bir kurulum ekranı gösterilir.

### 4. Firebase Console ayarları

1. **Authentication** → Get started → Sign-in method → **Email/Password** →
   Enable → Save
2. **Firestore Database** → Create database → konum `eur3 (europe-west)`
3. **Firestore → Rules** → [aşağıdaki kuralları](#firestore-güvenlik-kuralları)
   yayınla
4. **Firestore → Indexes** → ["Bildirimlerim" için gereken bileşik
   index](#bileşik-index)

### 5. Cloudinary ayarları

1. [cloudinary.com](https://cloudinary.com) üzerinden ücretsiz hesap aç
   (kredi kartı istemez)
2. **Dashboard** → `Cloud name` değerini `VITE_CLOUDINARY_CLOUD_NAME`'e yaz
3. **Settings → Upload** → varsa **Unsigned uploading** anahtarını aç
4. **Upload presets → Add upload preset**
   - **Signing Mode: Unsigned** seç (tarayıcıdan doğrudan yükleme için şart)
   - Preset adını `VITE_CLOUDINARY_UPLOAD_PRESET`'e yaz

> Unsigned preset adı tarayıcıda görünür; bu beklenen bir durumdur. Kötüye
> kullanımı sınırlamak için Cloudinary ayarlarından dosya boyutu ve format
> kısıtı tanımlayabilirsin.

### 6. Admin hesabı

1. `.env` içindeki `VITE_ADMIN_EMAIL` değerine admin olacak adresi yaz
2. Uygulamada **Kayıt Ol**'dan aynı adresle bir hesap oluştur
3. Aynı adresi Firestore güvenlik kurallarındaki `isAdmin()` fonksiyonuna da yaz

> Güvenlik kuralları `.env` dosyasını okuyamaz, bu yüzden admin adresi iki
> yerde tutulur. Adres değişirse **ikisini birden** güncelle.

---

## Firestore güvenlik kuralları

Aşağıdaki kuralları Firebase Console → Firestore Database → Rules bölümüne
yapıştır. `isAdmin()` içindeki adresi **kendi admin e-postanla** değiştir ve
`.env` dosyasındaki `VITE_ADMIN_EMAIL` ile aynı olmasına dikkat et — ikisi iki
ayrı yerde tanımlı, biri değişip diğeri unutulursa panel açılır ama hiçbir
güncelleme çalışmaz.

```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isAdmin() {
      return request.auth != null
        && request.auth.token.email == 'ADMIN_EPOSTA_ADRESINIZ';
    }

    match /reports/{reportId} {
      // Harita herkese açık, giriş yapmayan da görebilmeli
      allow read: if true;

      // Sadece giriş yapmış kullanıcı, sadece kendi adına bildirim oluşturabilir
      allow create: if request.auth != null
        && request.auth.uid == request.resource.data.userId;

      // Admin yalnızca durumu, durum zaman damgalarını ve açıklamayı
      // değiştirebilir — açıklama, fotoğraf ve konuma dokunamaz
      allow update: if isAdmin()
        && request.resource.data.diff(resource.data)
             .affectedKeys().hasOnly([
               'status', 'statusTimestamps', 'adminNote', 'adminNoteAt'
             ]);

      // Admin her bildirimi, kullanıcı yalnızca kendi bildirimini silebilir
      allow delete: if isAdmin()
        || (request.auth != null
            && request.auth.uid == resource.data.userId);
    }
  }
}
```

Tasarım notları:

- `AdminRoute` ve `canDeleteReport()` **arayüz seviyesinde** kontrollerdir;
  tarayıcıda çalışan her şey değiştirilebilir. Gerçek yetkilendirme bu
  kurallardadır. Biri konsoldan elle `deleteDoc` çağırsa bile başkasının
  kaydını silemez.
- `affectedKeys().hasOnly([...])` sayesinde admin hesabı ele geçirilse bile
  bildirimin açıklaması, fotoğrafı veya konumu değiştirilemez.
- `delete` için `resource.data.userId` kullanılır (`request.resource` değil):
  silinen kaydın **mevcut** sahibine bakılıyor.

> Firestore'u "test mode" ile açtıysan o kuralların ~30 günlük bir süresi
> vardır ve dolduğunda tüm okuma/yazma reddedilir. Yukarıdaki sürüm kalıcıdır.

## Bileşik index

"Bildirimlerim" sayfası `where("userId","==",uid)` ve
`orderBy("createdAt","desc")` filtrelerini birlikte kullanır. Firestore bu
kombinasyon için bileşik index ister:

| Alan | Sıra |
| --- | --- |
| `userId` | Ascending |
| `createdAt` | Descending |

Index yoksa sayfa hata ekranı gösterir; o ekrandaki **"Index'i oluştur"**
butonu doğrudan Firebase Console'daki oluşturma formuna gider. Hata mesajının
içindeki bağlantı `extractIndexUrl()` ile ayıklanıp butona dönüştürülüyor, ki
kullanıcı konsola bakmak zorunda kalmasın.

Ana sayfadaki harita sorgusu bilerek `orderBy` kullanmaz (sıralama istemcide
yapılır); böylece `createdAt` alanı olmayan, Console'dan elle eklenmiş test
belgeleri de haritada görünür ve ek index gerekmez.

---

## Çalıştırma

```bash
npm run dev      # geliştirme sunucusu  → http://localhost:5173
npm run build    # production derlemesi → dist/
npm run preview  # derlenmiş sürümü önizle
npm run lint     # oxlint
npm run deploy   # derleyip Firebase Hosting'e yayınla
```

> **Windows / PowerShell notu:** `npm run dev` komutu
> `running scripts is disabled on this system` hatası verirse:
> `Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned`

## Yayına alma (Firebase Hosting)

Firebase Hosting ücretsiz Spark planına dahildir ve HTTPS sertifikasını
kendisi sağlar. HTTPS önemli: `navigator.geolocation` yalnızca güvenli
bağlamlarda çalışır, yani konum özelliği ancak yayına alındıktan sonra gerçek
bir telefonda test edilebilir.

Yapılandırma dosyaları repoda hazır (`firebase.json`, `.firebaserc`), yani
`firebase init` çalıştırmaya gerek yok.

**İlk seferde bir kez:**

```bash
npx firebase login
```

**Her yayında:**

```bash
npm run deploy
```

`firebase.json` içindeki iki kural önemli:

- **`rewrites`** — bütün yolları `index.html`'e yönlendirir. Bu olmadan
  `/report/abc123` adresini doğrudan açmak veya o sayfada yenilemek 404
  verirdi; sunucuda o isimde bir dosya yok, yönlendirmeyi React Router yapıyor.
- **`index.html` için `no-cache`** — Firebase varsayılanı `max-age=3600`'dür.
  Tarayıcı `index.html`'i bir saat önbelleğe alınca, deploy yapılmış olsa bile
  eski dosya adlarını okur ve kullanıcı eski sürümü görür. Varlık dosyaları
  (`/assets/**`) ise adlarında içerik özeti taşıdığı için bir yıl önbelleğe
  alınabiliyor.

---

## Görsel kimlik

### Renk paleti

| Token | Değer | Kullanım |
| --- | --- | --- |
| `--color-primary` | `#1B4B43` | Petrol yeşili — navbar, başlık, birincil buton |
| `--color-accent` | `#F2A93B` | Amber — **yalnızca** birincil eylem butonu |
| `--color-ink` | `#16231F` | Gövde metni |
| `--color-background` | `#F4F6F5` | Sayfa zemini |
| `--color-border-strong` | `#767F7C` | Form alanı sınırı (3:1 kontrast) |
| `--color-accent-on-dark` | `#FFC46B` | Amberin koyu zeminde **yazı** tonu — marka amberi navbar'da 3.98:1 kalıyor |
| `--color-analysis` | `#3B7DDB` | Hasar yoğunluğu çerçevesi — durum paletinin **dışında**, bilinçli |
| `--color-analysis-strong` | `#356FC4` | Aynı mavinin yazı zemini tonu (etiket) |

`--color-analysis` neden durum renklerinden ayrı: o çerçeve bildirimin durumu
hakkında hiçbir şey söylemiyor, bir ölçüm alanını işaretliyor. Kırmızı/sarı/yeşil
kullanılsaydı durum bildirdiğini sanmak çok kolay olurdu.

Durum renkleri trafik lambası mantığında ve **her biri üç ton taşır**, çünkü
tek ton her yerde çalışmıyor — sarının üstünde beyaz yazı okunmuyor, beyazın
üstünde sarı yazı da okunmuyor:

| Durum | `hex` (dolgu) | `ink` (dolgu üstü) | `text` (açık zemin üstü) |
| --- | --- | --- | --- |
| Bekliyor | `#D64545` | beyaz | `#9C2929` |
| İnceleniyor | `#EBB01A` | **koyu** | `#8A6300` |
| Çözüldü | `#2F9E62` | beyaz | `#1F7A49` |

Tek kaynak: [`src/constants.js`](src/constants.js) → `STATUSES`. CSS tarafında
dolgu tonları `--color-status-*` olarak, açık zeminde yazı için gereken tek ton
`--color-status-cozuldu-text` olarak aynalanıyor.

### Tipografi

| Font | Kullanım |
| --- | --- |
| Space Grotesk | Yalnızca `h1`/`h2` ve wordmark |
| Public Sans | Tüm gövde metni, form, buton |
| IBM Plex Mono | Veri niteliğindeki her şey: tarih, koordinat, bildirim no, yüzde |

Mono font ayrımı tesadüfi değil — okuyucuya "bu bir ölçüm, bir kayıt" sinyali
veriyor.

### Logo

[`src/components/Logo.jsx`](src/components/Logo.jsx) işareti `<img>` olarak
değil **CSS maskesi** olarak çiziyor: PNG yalnızca şekli veriyor, rengi
`currentColor` belirliyor. Tek dosya koyu navbar'da beyaz, açık kartta petrol
yeşili görünüyor.

Kaynak dosya ve türetme adımları: [`design/README.md`](design/README.md)

---

## Erişilebilirlik

`ui-ux-pro-max` skill'inin UX veritabanına karşı denetlendi; bulgular ölçümle
doğrulandı.

Hedef seviye **WCAG AA**. 7 sayfa × 3 ekran genişliğinde tarayıcıda ölçüldü:

| Ölçüm | Sonuç |
| --- | --- |
| Metin kontrastı | 7 sayfanın tamamında AA (4.5:1) altında kalan çift yok |
| Odak halkası | 3px, koyu ton, 16:1 kontrast |
| İkon-only butonlar | Hepsinde erişilebilir ad var |
| Görseller | Hepsinde `alt` var |
| Form etiketleri | Hepsi gerçek `<label>`'a bağlı; placeholder'a dayanan yok |
| Dokunma hedefleri | Mobilde 44×44 (satır içi metin bağlantıları hariç — WCAG istisnası) |
| Hedefler arası boşluk | ≥8px |
| Yatay taşma | 320 / 390 / 820 / 1440px'de yok |
| Gövde metni | 16px / satır yüksekliği 1.6 |

Ayrıca:

- **Bilgi hiçbir yerde yalnızca renkle iletilmiyor.** Harita işaretçilerinde
  renk durumu gösterirken köşedeki rozet aynı bilgiyi **biçimle** de veriyor
  (saat / büyüteç / onay) — kırmızı-yeşil ayrımı yapamayan kullanıcılar için.
- `role="alert"` + `aria-invalid` + `aria-describedby` ile form hataları ekran
  okuyucuya duyuruluyor. Gönderimde ekran ilk hatalı alana yumuşakça kayıyor ve
  odak oraya geçiyor.
- Harita işaretçileri klavyeyle odaklanabiliyor (`role="button"`, erişilebilir ad
  "Kategori — Durum"). Görünen pin 34px ama dokunma alanı görünmez bir
  pseudo-elemanla 44×44'e çıkarılmış — pin'i büyütmek haritayı kalabalıklaştırırdı.
- **Mobil menü bir çekmece gibi davranıyor:** perde, arka planda `inert`, Tab
  döngüsü menü içinde, Escape kapatıyor ve odağı hamburger butonuna geri veriyor.
  `role="dialog"` bilinçli olarak eklenmedi — bu bir gezinme çekmecesi, `<nav>`
  işareti korunuyor.
- "İçeriğe geç" bağlantısı, klavye kullanıcısının navbar'ı atlamasını sağlıyor.
- Tüm animasyonlar `prefers-reduced-motion` altında kapanıyor.

**Bilinçli olarak AAA (7:1) hedeflenmedi.** Skill'in "Inclusive Design" katmanı
AAA öneriyor; oraya çıkmak paletin çoğunu koyulaştırmak ve belediyenin logo
renklerinden uzaklaşmak demek olurdu.

---

## AI modelini ekleme

Uygulama, model dosyaları **olmadan da çalışır**: `predictCategory()` model
bulamazsa rastgele bir kategori ve düşük bir güven skoru (%40–60) döndürür,
arayüzde bunun örnek bir tahmin olduğu belirtilir.

Gerçek modeli eklemek için:

1. [teachablemachine.withgoogle.com](https://teachablemachine.withgoogle.com)
   adresinde bir **Image Project** oluştur
2. Sınıfları eğit — bu projedeki model `cukur` ve `cop` olmak üzere **iki
   sınıfla** eğitildi. Aynı adları kullanırsan eşleme kendiliğinden çalışır
   (eşleme büyük/küçük harf ve Türkçe karakterden bağımsız)
3. **Export Model → TensorFlow.js → Download** seçeneğiyle indir
   (⚠ "Tensorflow" veya "Tensorflow Lite" değil, **Tensorflow.js**)
4. İnen arşivdeki `model.json`, `metadata.json` ve `weights.bin` dosyalarını
   `public/model/` klasörüne kopyala
5. Sayfayı yenile

Kod değişikliği gerekmez. Sınıf adların farklıysa
[`src/services/aiService.js`](src/services/aiService.js) içindeki
`LABEL_ALIASES` tablosuna ekle.

Ön işleme adımları (merkezden kare kırpma → 224×224 → `div(127).sub(1)`)
Teachable Machine'in kendi kütüphanesiyle birebir aynı tutuldu; böylece
tarayıcıdaki tahminler Teachable Machine arayüzünde görülen sonuçlarla örtüşür.

TensorFlow.js dinamik olarak (`import()`) yüklenir — yaklaşık 1 MB'lık paket
yalnızca kullanıcı fotoğraf seçtiğinde indirilir, haritayı açan ziyaretçi bu
yükü almaz. Model dosyaları yoksa TensorFlow hiç indirilmez bile.

### İki sınıflı model, üç kategori

Uygulamada **üç** kategori var (Çukur, Çöp, Diğer) ama model **iki** sınıf
biliyor. Üçüncüsü modelden gelmiyor: softmax çıkışı her zaman iki skor üretir,
yani modele alakasız bir fotoğraf verilse bile ikisinden birini seçmek zorunda
kalır — "bilmiyorum" diyemez. Bu boşluğu bir güven eşiği dolduruyor:

| En yüksek skor | Sonuç |
| --- | --- |
| ≥ %65 | Modelin dediği kategori (`cukur` veya `cop`) |
| < %65 | Kategori `diger`, arayüz kullanıcıdan elle seçmesini ister |

Eşik tek sabit:
[`src/services/aiService.js`](src/services/aiService.js) içinde
`CONFIDENCE_THRESHOLD`.

---

## Görüntü işleme (OpenCV.js)

Kategori tahmininden **tamamen ayrı** iki adım. O "bu ne?" sorusuna cevap
veriyor; bunlar "bu fotoğraf ne durumda?" sorusuna. Ortak yükleyici:
[`src/services/opencv.js`](src/services/opencv.js).

### Hasar yoğunluğu

Görselin ortasındaki %60'lık bölgede koyu/düzensiz doku oranını ölçer.
Colab'da Python/OpenCV ile geliştirilen hattın tarayıcı karşılığı:

```python
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
h, w = gray.shape
merkez = gray[int(h*0.2):int(h*0.8), int(w*0.2):int(w*0.8)]
blurred = cv2.GaussianBlur(merkez, (7, 7), 0)
thresh = cv2.adaptiveThreshold(blurred, 255, cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
                               cv2.THRESH_BINARY_INV, 21, 5)
oran = np.sum(thresh > 0) / thresh.size
```

Yalnızca **çukur** bildirimlerinde çalışıyor. Algoritma kategori bilmiyor ve
çöp fotoğraflarında da anlamlı değerler üretiyor (ölçüldü: %24–%41), ama "hasar
yoğunluğu" bir çöp yığını için doğru bir ifade değil. Kapsam
`DENSITY_CATEGORY` sabitiyle sınırlı.

**Python'dan tek kasıtlı sapma:** girdi önce en uzun kenarı 800 piksele
indirgeniyor. Sebep, `adaptiveThreshold`'un `blockSize`'ının (21 piksel)
**mutlak** bir değer olması — 4000 piksellik bir telefon fotoğrafında 21 piksel
neredeyse hiçbir şey, 800 piksellikte anlamlı bir komşuluk. Ölçeklemezsek aynı
sorunun fotoğrafı, çeken telefonun çözünürlüğüne göre bambaşka bir yoğunluk
üretir ve kayıtlar karşılaştırılamaz hale gelir. Colab tarafında aynı sonucu
almak için görüntüyü önce aynı kurala göre küçültmek gerekiyor.

Sonuç Firestore'a `damageDensity` alanı olarak (0–1 arası ondalık) yazılıyor ve
detay sayfası ile harita panelinde ölçülen bölgeyi işaretleyen bir çerçeveyle
gösteriliyor. Çerçeve yüzdeyle konumlandığı için hangi boyutta gösterilirse
gösterilsin tam analiz edilen alanı işaretliyor.

### Netlik kontrolü (Laplacian varyansı)

Laplacian operatörü ikinci türevi alır, yani kenarları öne çıkarır. Net bir
fotoğrafta keskin kenarlar çok sayıda büyük değer üretir; bulanık fotoğrafta
kenarlar yayvanlaşır ve değerler sıfıra yaklaşır. Sonucun **varyansı** bu
yayılımın ölçüsü.

Eşik tahmin değil, ölçüm: projenin kendi veri setinden 6 fotoğraf, 800 piksele
indirgenmiş halde, artan Gauss çekirdekleriyle:

| Fotoğraf | net | k=3 | k=5 | k=9 | k=15 | k=25 |
| --- | --- | --- | --- | --- | --- | --- |
| cop-4 | 273.0 | 62.8 | 33.9 | 11.4 | 4.7 | 2.5 |
| cop-5 | 280.3 | 63.9 | 33.7 | 11.1 | 4.5 | 2.3 |
| cop-6 | 1126.5 | 288.4 | 163.2 | 48.8 | 13.3 | 3.9 |
| cukur-1 | 2244.7 | 156.7 | 48.0 | 7.5 | 2.6 | 1.8 |
| cukur-2 | 771.2 | 88.9 | 39.9 | 11.9 | 4.8 | 2.4 |
| cukur-3 | 3273.7 | 241.9 | 76.9 | 11.9 | 3.4 | 2.0 |

İki küme net biçimde ayrılıyor: hafif yumuşak (k=3, hâlâ okunabilir) en düşük
**62.8**; ne olduğu seçilemeyen (k≥9) en yüksek **48.8**. Eşik ikisinin arasına,
**60**'a konuldu — net fotoğrafların hiçbiri uyarı almıyor (en düşüğü 273, 4,5
kat pay), k≥9 olanların tamamı yakalanıyor.

Uyarı **engelleyici değil**. Yöntemin bilinen zayıflığı: varyans sahne dokusuna
da bağlı, düz asfalt gibi az kenarlı bir fotoğraf odağı tam olsa bile düşük
değer üretebilir. Elindeki tek fotoğraf o olabilir.

### EXIF yönlendirme

Telefon fotoğrafları ham pikselleri bir yönde kaydedip "nasıl gösterileceğini"
EXIF `Orientation` etiketinde belirtebiliyor. Canvas'a çizerken bu etiket yok
sayılırsa analiz edilen bölge kullanıcının gördüğünden farklı olur.

Ölçüldü — sorun yok: modern tarayıcılarda CSS `image-orientation`'ın varsayılanı
`from-image` olduğu için `<img>` çözümlemesi EXIF'i uyguluyor,
`naturalWidth/naturalHeight` döndürülmüş boyutları veriyor. Orientation 1/3/6/8
değerlerinin dördü de doğru işlendi (etiketsiz kontrol grubuyla karşılaştırıldı).
Bu yüzden `createImageBitmap` geçişine gerek görülmedi.

---

## Kullanılan veri setleri

Model Teachable Machine üzerinde iki sınıflı bir görüntü sınıflandırıcı olarak
eğitildi. **Sınıf başına 250 görsel, toplam 500** — sınıflar bilinçli olarak
dengelendi.

| Sınıf | Görsel | Kaynak |
| --- | --- | --- |
| `cukur` | 250 | **Annotated Potholes Image Dataset** — chitholian, Kaggle<br>[kaggle.com/datasets/chitholian/annotated-potholes-dataset](https://www.kaggle.com/datasets/chitholian/annotated-potholes-dataset) |
| `cop` | 250 | **garbage_detection** (v9) — garbage-detection-czeg5, Roboflow Universe<br>[universe.roboflow.com/garbage-detection-czeg5/garbage_detection-wvzwv](https://universe.roboflow.com/garbage-detection-czeg5/garbage_detection-wvzwv) |

**Yöntem notu:** iki kaynak da özünde **nesne tespiti** (object detection) veri
seti — kutu işaretlemeleri (bounding box) içeriyor. Bu projede sınıflandırma
yapıldığı için işaretlemeler kullanılmadı, yalnızca görseller alındı. Yani veri
setleri asıl amacından farklı bir görev için yeniden kullanıldı; modelin çıktısı
da bu yüzden "nerede" değil "ne" sorusuna cevap veriyor.

Lisans ve atıf koşulları yukarıdaki kaynak sayfalarında yer alıyor; yeniden
dağıtım öncesinde kontrol edilmeli. Bu depoda veri setlerinin kendisi
**bulunmuyor** — yalnızca eğitilmiş model dosyaları (`public/model/`).

---

---

## Klasör yapısı

```text
design/               Tasarım kaynakları (derlemeye dahil DEĞİL)
public/
  model/              AI model dosyaları (Teachable Machine export)
  logo-mark.png       Şeffaf işaret (CSS maskesi olarak kullanılır)
  favicon.png         64×64 sekme ikonu
src/
  components/         AdminNoteEditor, AdminRoute, CategoryBadge,
                      DeleteReportButton, Footer, LocationPicker, Logo,
                      MapFilters, Navbar, ProtectedRoute, ReportPanel,
                      ReportsMap, SetupNotice, Spinner, StatusBadge,
                      StatusTimeline
  context/            AuthContext (provider), useAuth (context + hook)
  firebase/           config, authErrors
  pages/              Home, Login, Register, NewReport, ReportDetail,
                      MyReports, Admin
  services/           reportsService, storageService, aiService,
                      opencv (ortak yükleyici),
                      damageDensityService, imageQualityService
  utils/              admin, date, district, formFocus, geo, mapIcons,
                      markerClusters, permissions, reference
  constants.js        kategoriler, durumlar, harita merkezi
  constants/
    districts.js      4 merkez ilçe: etiket, sınır dikdörtgeni, harita odağı
    dateRanges.js     tarih süzgeci aralıkları
```

## Veri modeli

`reports/{reportId}`

| Alan | Tip | Açıklama |
| --- | --- | --- |
| `userId` | string | Bildirimi oluşturan kullanıcının Firebase UID'i |
| `category` | string | `cukur` \| `cop` \| `diger` |
| `description` | string | Kullanıcının açıklaması |
| `imageUrl` | string | Cloudinary görsel URL'i |
| `latitude` | number | Enlem |
| `longitude` | number | Boylam |
| `district` | string | `seyhan` \| `yuregir` \| `cukurova` \| `saricam` |
| `damageDensity` | number \| null | OpenCV.js yoğunluk ölçümü (0–1). Yalnızca çukur bildirimlerinde; hesaplanamazsa `null` |
| `status` | string | `bekliyor` \| `inceleniyor` \| `cozuldu` |
| `createdAt` | timestamp | `serverTimestamp()` ile yazılır |
| `statusTimestamps` | map | Her duruma ne zaman geçildiği: `{ bekliyor, inceleniyor, cozuldu }` |
| `adminNote` | string | Belediye açıklaması (boş olabilir) |
| `adminNoteAt` | timestamp | Açıklamanın yazıldığı an |

Vatandaşa gösterilen **bildirim numarası** belge kimliğinden türetiliyor
(`BLD-PTM-KME` gibi) — ham Firestore kimliği telefonda okunamaz.
Bkz. [`src/utils/reference.js`](src/utils/reference.js)

## Sayfalar

| Route | Erişim | Açıklama |
| --- | --- | --- |
| `/` | Herkes | Harita, süzgeç, canlı istatistik |
| `/login` | Herkes | E-posta/şifre ile giriş |
| `/register` | Herkes | Kayıt |
| `/report/:id` | Herkes | Detay, durum zaman çizelgesi, konum haritası |
| `/new-report` | Giriş gerekli | Yeni bildirim oluşturma |
| `/my-reports` | Giriş gerekli | Kullanıcının kendi bildirimleri |
| `/admin` | `VITE_ADMIN_EMAIL` | Tüm bildirimler, durum + açıklama + silme |

Ana sayfa dışındaki tüm rotalar `React.lazy` ile talep üzerine yükleniyor;
haritaya bakan bir ziyaretçi admin panelinin kodunu indirmiyor.

---

## Tasarım kararları

### Harita üzerinde tek katman kuralı

Leaflet'in `Popup` bileşeni kullanılmıyor. Popup işaretçiye çıpalanır, yani
konumu marker'ın nerede olduğuna göre değişir ve er ya da geç haritanın sabit
katmanlarıyla (istatistik paneli, açıklama kutusu, alt bilgi) çarpışır.

Yerine konumu sabit bir **detay paneli** var: masaüstünde ekranın ortasında,
mobilde alttan yükselen sayfa olarak. Çakışma matematiksel olarak mümkün değil.
Harita, seçilen işaretçiyi panelin örtmediği üst banda kaydırıyor.

### Harita işaretçileri

| Görsel öğe | Anlamı |
| --- | --- |
| Pin **rengi** | Durum — 🔴 Bekliyor, 🟡 İnceleniyor, 🟢 Çözüldü |
| Pin **simgesi** | Kategori — Çukur, Çöp, Diğer |
| Köşedeki **rozet** | Durum, biçim olarak — saat / büyüteç / onay |

Rozet erişilebilirlik gereği: renk körü kullanıcı için durum bilgisi renkten
bağımsız olarak da okunabilir olmalı.

### Üst üste binen işaretçiler

Aynı binanın önündeki iki bildirim en yüksek zoom seviyesinde bile aynı
pikselde durabiliyor — yakınlaştırmak çözüm değil. Ekranda 26 pikselden yakın
işaretçiler nötr renkli bir sayaçta toplanıyor; tıklanınca bir çember üzerine
dağılıp her biri gerçek konumuna ince bir çizgiyle bağlanıyor.

Sayaç bilerek nötr renkte: bu tasarımda renk yalnızca durumu anlatıyor, karışık
durumlu bir kümeyi tek renge indirmek yanlış bilgi verirdi.

Gruplama geometrisi Leaflet'ten bağımsız saf fonksiyonlar olarak
[`src/utils/markerClusters.js`](src/utils/markerClusters.js) içinde.

### İlçe belirleme

Dört merkez ilçe destekleniyor: **Seyhan, Yüreğir, Çukurova, Sarıçam**. Diğer
11 ilçe kapsam dışı.

İlçe koordinattan kaba dikdörtgen sınırlarla tahmin ediliyor
([`src/constants/districts.js`](src/constants/districts.js)). Bunlar gerçek
idari sınırlar **değil** — gerçek sınırlar düzensiz poligonlar. Amaç hassas
coğrafi doğruluk değil, kullanıcıya makul bir ön seçim sunmak; yanlışsa
dropdown'dan değiştirilebiliyor. Dikdörtgenler kaçınılmaz olarak çakışıyor
(Seyhan/Yüreğir'de nehir hattı, Çukurova/Sarıçam'da üniversite bölgesi);
çakışmada merkeze en yakın ilçe seçiliyor.

Her ilçenin iki noktası var ve bunlar bilerek ayrı: `center` çakışma çözümü
için geometrik referans, `focus` ilçe seçilince haritanın uçacağı nokta.
Yüreğir'in dikdörtgeni güneyde kırsal kesime kadar indiği için geometrik
merkezi yerleşim alanının dışında kalıyordu.

| İlçe | minLat | maxLat | minLon | maxLon |
| --- | --- | --- | --- | --- |
| Seyhan | 36.900 | 37.015 | 35.220 | 35.345 |
| Yüreğir | 36.850 | 37.010 | 35.335 | 35.405 |
| Çukurova | 37.005 | 37.100 | 35.240 | 35.345 |
| Sarıçam | 36.960 | 37.150 | 35.345 | 35.580 |

İlçe süzmesi **istemcide** yapılıyor. Bir ara sunucuda (`where('district')`)
deneyip geri alındı: Firestore o alanı taşımayan belgeleri döndürmüyor, yani
alan eklenmeden önce oluşturulmuş bütün kayıtlar süzgeçte kayboluyordu. Şimdi
alan yoksa koordinattan türetiliyor.

### Konum belirleme

Bildirim formu konumu iki yoldan alır:

1. **Otomatik** — `navigator.geolocation.getCurrentPosition()`
2. **Haritadan seçme** — otomatik konum başarısız olursa harita kendiliğinden
   açılır; GPS çalışırken de "Haritadan düzelt" olarak kullanılabilir

İkincisi bir yedek değil gerekli bir özellik: kurumsal cihazlarda konum
servisi yönetici tarafından kapatılmış olabilir, kullanıcı izin vermeyebilir,
ya da sayfa HTTPS olmayan bir adresten açılmış olabilir.

### Mükerrer bildirim onayı

Konum seçildiğinde **60 metre** içindeki çözülmemiş bildirimler listeleniyor.
Gönder'e basıldığında akış duruyor ve açık bir soru soruluyor: "Yine de yeni bir
bildirim oluşturulsun mu?"

Tarayıcının `confirm()` penceresi yerine satır içi onay kullanılıyor: kullanıcının
karar verebilmesi için yakındaki kayıtları (referans numarası, kategori, durum,
kaç metre uzakta, ne zaman) **görmesi** gerekiyor ve bir iletişim kutusu tam da
onları örterdi. Silme onayında da aynı gerekçeyle bu desen var.

Kontrol **kategoriden bağımsız**. Önce kategoriye göre süzüyordu ve şu hataya yol
açıyordu: yapay zeka kategoriyi "çöp" tahmin ediyor, uyarı çıkıyor, kullanıcı
kategoriyi "çukur" olarak düzeltince uyarı kayboluyor ve aynı noktaya ikinci
kayıt hiçbir soru sorulmadan giriyordu. Gerçekleşen örnek: 1 metre arayla iki
kayıt. Kategori bilgisi kaybolmuyor — listede rozetle gösteriliyor ve aynı
kategoridekiler başa alınıyor.

Mesafe haversine formülüyle hesaplanıyor
([`src/utils/geo.js`](src/utils/geo.js)) — düz Öklid mesafesi kullanılamaz,
çünkü enlem ve boylam dereceleri eşit uzunlukta değil (Adana enleminde 1°
boylam ≈ 89 km, 1° enlem ≈ 111 km).

Firestore yarıçap sorgusu yapamadığı için (geohash gerekir) kayıtlar çekilip
mesafe istemcide hesaplanıyor. Bu ölçekte sorun değil; binlerce kayda çıkarsa
geohash tabanlı bir sorguya geçmek gerekir.

---

## Bilinen sınırlamalar

**Yapay zeka modeli**

- **İki sınıflı** (`cukur`, `cop`). Üçüncü kategori (`diger`) modelden değil,
  güven eşiğinden geliyor.
- **Model aşırı kendinden emin.** Ölçüldü: düz renk, rastgele gürültü ve dama
  tahtası görüntülerinin hepsine ~%100 "cop" dedi; eğitim setindeki gerçek
  görsellerde de %100. İki sınıflı ve görece küçük bir veri setiyle eğitilmiş
  modellerde beklenen bir kalibrasyon sorunu. Pratik sonucu: güven eşiği nadiren
  tetikleniyor, model alakasız bir fotoğrafa da yüksek güvenle etiket yapıştırıyor.
  Çözüm eşiği yükseltmek değil; üçüncü bir "negatif" sınıf eklemek ya da daha
  çeşitli veriyle eğitmek gerekir.
- Confusion matrix / precision-recall ölçümü **yapılmadı**.

**Görüntü işleme**

- Hasar yoğunluğu **sabit bir merkez bölge** varsayımına dayanıyor (görselin
  ortasındaki %20–%80). Sorunun kadrajın ortasında olduğunu varsayıyor; kenarda
  kalan bir çukur ölçüme girmez.
- **Piksel hassas kontur tespiti yok.** Ölçülen şey bir alan/nesne değil, o
  bölgedeki koyu/düzensiz piksel **oranı**. "Çukurun kaç cm²" olduğunu
  söylemiyor.
- Netlik eşiği sahne dokusuna duyarlı: düz asfalt gibi az kenarlı bir fotoğraf
  odağı tam olsa bile "bulanık" uyarısı alabilir.
- OpenCV.js CDN'den `<script async>` ile geliyor ve **her sayfa açılışında**
  iniyor (~9 MB WASM, soğuk önbellekle ölçülen süre 12,5 sn). Haritaya bakıp
  hiç fotoğraf yüklemeyen ziyaretçi de bu yükü alıyor. Talep üzerine yüklemeye
  çevrilebilir.

**Kapsam**

- Yalnızca **4 merkez ilçe** (Seyhan, Yüreğir, Çukurova, Sarıçam). İlçe sınırları
  gerçek idari poligonlar değil, kaba dikdörtgenler.
- **Cloudinary'deki fotoğraf silinmiyor.** Bildirim silindiğinde yalnızca
  Firestore kaydı gider; imzasız yükleme anahtarıyla tarayıcıdan silme
  yapılamıyor (silme API secret gerektirir, o da istemciye konulamaz). Gerçek
  bir sistemde bunu bir Cloud Function yapardı — o da Blaze planı gerektirdiği
  için kapsam dışı.
- **Durum bildirimi (e-posta/push) yok.** Cloud Functions gerektirir → Blaze
  planı → ücret. Bilinçli olarak kapsam dışı bırakıldı.
- **Uzun listelerde sanallaştırma yok.** 100+ bildirimde `react-window` gibi
  bir çözüm gerekir. Mevcut ölçekte gerek yok.
- Firestore'dan bütün kayıtlar tek seferde çekiliyor; sayfalama yok.

**Veri**

- `district` ve `damageDensity` alanları sonradan eklendi. İlçe, alanı olmayan
  eski kayıtlarda koordinattan türetiliyor; `damageDensity` ise `null` kalıyor
  (o kayıtlarda çerçeve gösterilmiyor).
- Bu alanların eklenmesinden önce durumu değiştirilmiş kayıtlarda
  `statusTimestamps` boş olabilir; zaman çizelgesi o adımlar için "tarih kaydı
  yok" gösterir.

---

## Ekran görüntüleri

[Ekran görüntüleri buraya eklenecek]

Önerilen kareler: harita + süzgeç çubuğu, bildirim formu (yapay zeka tahmini +
hasar yoğunluğu birlikte), detay sayfası (mavi analiz çerçevesi), admin paneli,
mobil görünüm (açık menü).

---

## Canlı demo

[Deploy edildikten sonra link buraya eklenecek]

```bash
npm run deploy   # vite build + firebase deploy --only hosting
```

---

## Katkıda bulunan

**[Ad Soyad]** — [GitHub / LinkedIn bağlantısı]

Adana Büyükşehir Belediyesi **[birim adı]** stajı kapsamında geliştirilmiştir.

Bu bir demo/portföy projesidir, resmî bir belediye hizmeti değildir.

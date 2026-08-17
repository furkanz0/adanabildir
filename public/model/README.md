# AI model dosyaları

Bu klasörde Teachable Machine ile eğitilmiş görsel sınıflandırma modeli
duruyor. Uygulama bu dosyaları tarayıcıda TensorFlow.js ile çalıştırıyor —
sunucu tarafında hiçbir işlem yok, dolayısıyla ek maliyet de yok.

```
public/model/
  model.json       ~90 KB   ağ mimarisi
  metadata.json    ~250 B   sınıf adları
  weights.bin      ~2 MB    ağırlıklar (538.508 parametre)
```

## Model iki sınıf biliyor, uygulama üç kategori gösteriyor

`metadata.json` içindeki etiketler:

```json
"labels": ["cop", "cukur"]
```

Uygulamadaki kategoriler ise **Çukur, Çöp, Diğer**. Üçüncü kategori modelden
gelmiyor — güven eşiğinden üretiliyor.

Sebep: model bir softmax çıkışı üretiyor, yani iki skorun toplamı her zaman
1. Modele bir sokak lambası fotoğrafı verirsen "bilmiyorum" diyemez, ikisinden
birini seçmek zorunda kalır. Eşik bu boşluğu dolduruyor.

| En yüksek skor | Sonuç |
|---|---|
| ≥ %65 | Modelin dediği kategori (`cukur` veya `cop`) |
| < %65 | Kategori `diger`, arayüz kullanıcıdan elle seçmesini ister |

Eşik [`src/services/aiService.js`](../../src/services/aiService.js) dosyasının
başında tek sabit:

```js
const CONFIDENCE_THRESHOLD = 0.65
```

Yükseltirsen model daha az konuşur (daha çok "Diğer"), düşürürsen daha çok
konuşur ama yanılma payı artar. Eğitim setin büyüdükçe düşürebilirsin.

Servis ayrıca `lowConfidence` bayrağı döndürüyor. Arayüz kategoriye değil bu
bayrağa bakıyor; ileride dört sınıflı bir model gelirse yüksek güvenle
üretilmiş gerçek bir "Diğer" tahminiyle karışmasın diye.

## Modeli yenilemek

1. [teachablemachine.withgoogle.com](https://teachablemachine.withgoogle.com)
   → **Image Project**
2. Sınıfları eğitin. Sınıf adları `cukur` ve `cop` olursa eşleme kendiliğinden
   çalışır. Farklı adlar kullanırsanız (`Çukur`, `pothole`, `Yol Çukuru` …)
   `aiService.js` içindeki `LABEL_ALIASES` tablosuna ekleyin — tablo Türkçe
   karakterleri ve boşlukları zaten normalize ediyor.
3. **Export Model** → **TensorFlow.js** sekmesi → **Download**
   (⚠ "Tensorflow" veya "Tensorflow Lite" değil, **Tensorflow.js**)
4. İnen arşivdeki üç dosyayı buraya, mevcutların üzerine çıkarın
5. `npm run build` alın (dosyalar `dist/model/` altına kopyalanır) ve tarayıcıda
   sayfayı yenileyin

Sınıf sayısını değiştirmek kod değişikliği gerektirmez: servis etiketleri
`metadata.json`'dan indeksle okuyor. Yeni bir sınıf eklerseniz yalnızca
`LABEL_ALIASES` ve `src/constants.js` içindeki `CATEGORIES` tablosuna karşılık
gelen girdiyi eklemeniz yeter.

## Dosyalar yoksa ne olur

Uygulama hata vermez. `predictCategory()` önce `HEAD /model/model.json`
isteğiyle dosyaların sunulup sunulmadığına bakar; yoksa rastgele bir kategori
ve %40–60 arası güven skoru döndürür, arayüzde bunun örnek bir tahmin olduğu
yazar. Böylece form model olmadan da uçtan uca test edilebilir.

## Performans

TensorFlow.js dinamik `import()` ile yükleniyor, yani paketi (~1 MB) yalnızca
gerçekten tahmin yapılacağında iniyor. Haritayı açan ziyaretçi indirmiyor.

İlk tahmin yavaş (backend kurulumu + ağırlıkların yüklenmesi), sonrakiler
hızlı. Ölçüm (headless Chromium, GPU yok):

```
1. tahmin: ~5000 ms
2. tahmin:  ~294 ms
3. tahmin:  ~291 ms
```

Gerçek tarayıcıda WebGL devrede olduğu için bu süreler daha da düşer.

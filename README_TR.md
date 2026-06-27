# TBH Helper

> **Task Bar Hero** için gelişmiş bir yardımcı uygulama — envanterinizi görüntüleyin, item değerlerini takip edin ve Steam Pazarı fiyatlarını anlık olarak izleyin.

---

## 📷 Ekran Görüntüleri

| Ana Panel | Eşya Detayları & Geçmişi |
|---|---|
| ![Ana Panel](./screenshots/main_dashboard.png) | ![Eşya Detayları](./screenshots/item_detail.png) |

| Analitik Paneli | İstek Listesi & Uyarılar |
|---|---|
| ![Analitik](./screenshots/analytics.png) | ![İstek Listesi](./screenshots/wishlist.png) |

---

## ⬇️ İndirme & Kurulum

**Herhangi bir kodlama veya kurulum bilgisi gerektirmez.** Sadece yükleyiciyi indirin ve çalıştırın.

👉 **[En Son Sürümü İndir](https://github.com/selimlendiniz/tbh-helper/releases/latest)**

1. En son sürüm sayfasındaki Assets (Varlıklar) bölümünden `TBH_Helper_Update_Setup.exe` veya `TBH Helper_X.Y.Z_x64-setup.exe` dosyasını indirin.
2. Yükleyiciyi çalıştırın.
3. Başlat Menüsü veya Masaüstü kısayolundan **TBH Helper**'ı başlatın.

> ⚠️ **Sadece Windows:** Bu uygulama, oyunun yerel save dosyasını okuduğu için yalnızca Windows işletim sisteminde çalışır.

---

## ✨ Özellikler

- 🗂️ **Envanter Görüntüleyici** — Envanter, Depo (Stash), Pazar listeleri ve Kuşanılmış (Equipped) eşyalarınızı görün.
- 💰 **Steam Pazarı Fiyatları** — Steam Community Market'ten güncel fiyatları otomatik olarak çeker.
- 📊 **Analitik Paneli** — Eşyalarınızın nadirlik dağılımını, en değerli itemlerinizi ve zaman içindeki portföy değerinizi inceleyin.
- 🛒 **Pazar Gezgini** — Oyundaki tüm satılabilir itemleri ve güncel pazar fiyatlarını arayın.
- 🔴 **Gerçek Zamanlı Senkronizasyon** — Oyunu oynarken save dosyanızı otomatik izler ve arayüzü anlık günceller.
- 🔐 **Steam Hesap Entegrasyonu** — Hız sınırı (429 Too Many Requests) sorunlarını aşmak için uygulama içinden güvenle Steam girişi yapın.
- 📬 **Telegram Bildirimleri** — Değerli eşya düşürdüğünüzde veya fiyat değişimlerinde anlık mobil bildirimleri doğrudan Telegram uygulamanızdan alın.
- 🔔 **Yüksek Değerli Eşya Uyarıları** — Belirlediğiniz fiyat eşiğinin üzerinde nadir veya değerli eşyalar düştüğünde masaüstü bildirimleri alın.
- ⚙️ **Arka Planda Çalışma (Sistem Tepsisi / Tray)** — Pencereyi kapatsanız bile uygulamanın arka planda çalışmaya devam etmesini ve bildirim göndermesini sağlayın.

---

## 🚀 Nasıl Kullanılır ve Yapılandırılır?

### 1. Kayıt Dosyası Senkronizasyonu
Uygulama, oyunun save dosyasını varsayılan olarak şu konumdan otomatik bulur:
`%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3`

- Farklı bir save kullanmak veya yedek yüklemek isterseniz, Ayarlar'dan **Select Save File (Kayıt Dosyası Seç)** butonunu kullanabilirsiniz.
- Anlık olarak save dosyasını yeniden yüklemek için **Manual Reload (Manuel Yeniden Yükle)** butonuna basabilirsiniz.

### 2. Steam Bağlantısı (Önemle Tavsiye Edilir)
Steam girişi yapmadığınızda, Steam Market isteklerinizi kısa süre sonra engeller (`429 Too Many Requests` hatası).
- Sağ üstteki veya Ayarlar'daki **Connect Steam (Steam'e Bağlan)** butonuna tıklayın.
- Güvenli Steam giriş penceresinde normal şekilde giriş yapın.
- Giriş başarılı olduğunda uygulama çerezleri kaydeder ve pencereyi otomatik kapatır.
- **Şifreniz veya bilgileriniz asla kaydedilmez ya da paylaşılmaz.** Tüm istekler sadece yerel bilgisayarınızdan yapılır.

### 3. Yüksek Değerli Eşya Uyarıları (High-Value Item Alerts)
Nadir veya değerli bir eşya elde ettiğinizde yerel masaüstü ve Telegram bildirimleri alın:
- TBH Helper'da Ayarlar penceresini açın.
- **Min Price Threshold ($)** (Minimum Fiyat Eşiği) kısmına uyarılmak istediğiniz eşyalar için minimum değeri girin (örneğin `5` veya `10`).
- Bu uyarıları tamamen devre dışı bırakmak için değeri `0` yapabilirsiniz.
- Oyun save dosyanızı güncelleyip bu değerden daha yüksek fiyatlı yeni bir eşya algıladığında bir uyarı tetiklenir.

### 4. Telegram Bildirim Kurulumu (Tamamen Ücretsiz)
Değerli itemler düştüğünde telefonunuza anında bildirim gelmesini sağlayın:
1. Telegram'da `@BotFather` kullanıcısına mesaj atıp `/newbot` yazarak kendi botunuzu oluşturun ve size verilen **Bot Token** değerini alın.
2. Kendi chat ID'nizi öğrenmek için Telegram'da `@GetIDBot` kullanıcısına mesaj gönderin ve **Chat ID** değerinizi alın.
3. Telegram'da kendi botunuzun adını aratın ve bota girip **Başlat (Start)** butonuna basın.
4. TBH Helper Ayarlar penceresine girip **Enable Telegram Alerts (Telegram Bildirimlerini Etkinleştir)** kutusunu işaretleyin, token ve chat ID alanlarını doldurup **Test Connection** butonuna tıklayın.

### 5. Kapanışta Sistem Tepsisinde Çalışma (Tray) Ayarı
- Varsayılan olarak, uygulamanın penceresini kapattığınızda uygulama tamamen kapanmaz. Sağ alttaki **Sistem Tepsisi'ne (Tray)** küçülür ve arka planda fiyatları izlemeye, bildirim göndermeye devam eder.
- Uygulamayı tekrar açmak için **tray ikonuna sol tıklayın** veya sağ tıklayıp **Show App** deyin.
- Uygulamayı tamamen kapatmak için tray ikonuna sağ tıklayıp **Quit** seçeneğini seçin.
- Pencere kapatıldığında uygulamanın doğrudan çıkış yapmasını istiyorsanız, **Settings** (Ayarlar) panelinden **Close to Tray** seçeneğindeki işareti kaldırın.

---

## 🔒 Gizlilik ve Güvenlik

- **Yerel İşlem:** Save dosyanız ve Steam oturum çerezleriniz asla cihazınızın dışına çıkmaz.
- **İzleme Yoktur:** Herhangi bir analitik kod, reklam yazılımı veya üçüncü taraf sunucu bağlantısı bulunmamaktadır.
- **Güvenli Giriş:** Steam girişi doğrudan resmi Steam sayfası üzerinden yapılır. Helper uygulaması bu oturumu yalnızca yerel market isteklerinde rate-limit aşmak için kullanır.

---

## Sorumluluk Reddi (Disclaimer)

Bu uygulama **resmi olmayan** bir üçüncü taraf araçtır. TesseractStudio veya Valve Corporation ile hiçbir bağlantısı yoktur ve bunlar tarafından onaylanmamıştır. Kullanım riski size aittir.

---

## Lisans

MIT Lisansı.

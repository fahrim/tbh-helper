# TBH Helper — Ajan Kılavuzu

## Mimari

Tauri v2 uygulaması: **React + TypeScript** ön yüz (`src/`) + **Rust** arka uç (`src-tauri/`). Tek uygulama, monorepo değil.

Ön yüz girişi: `src/main.tsx` → `src/App.tsx`. Rust girişi: `src-tauri/src/main.rs` → `src-tauri/src/lib.rs`.

## Geliştirme Komutları

| Komut | Amaç |
|---------|-------|
| `npm run dev` | Vite dev sunucusu **1420** portunda (sabit, değişmez) |
| `npm run build` | `tsc && vite build` |
| `npm run tauri` | Tauri CLI geçişi |
| `npm run tauri dev` | Masaüstü uygulamasını hot-reload ile başlat |
| `npm run tauri build` | Üretim kurulum paketini oluştur |

**Sıra**: Tauri dev için önce Vite sunucusu çalışıyor olmalı (`npm run dev` / Tauri'nin `beforeDevCommand` ile halledilir).

## Önemli Tauri Arka Uç Komutları (Rust, JS'den `@tauri-apps/api/core` ile çağrılır)

- `decrypt_save_file` — oyun kaydını okur + `%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3` yolundan çözer
- `start_save_watcher` — arka plan Rust iş parçacığı her 1.5 sn'de kontrol eder, `save_updated` olayı yayar
- `fetch_url` — proxy'li HTTP(S) isteği, opsiyonel Steam çerezleri ile
- `get_steam_cookies` — WebviewWindow'dan çerezleri alır (Steam girişi için)
- `install_update` — GitHub sürüm kurulum dosyasını indirir, çalıştırır, uygulamadan çıkar
- `select_custom_save_file` — `.es3` dosyaları için yerel dosya seçici (`rfd` ile)
- Tepsi ikonu: sol tık pencereyi açar; sağ tık menüsünde "Show App" / "Quit"

## Kayıt Dosyası (Save File)

Şifreli **EasySave3 (ES3)** formatı. Şifre çözme:
- PBKDF2-SHA1, 100 iterasyon, 128-bit anahtar
- AES-128-CBC, IV = ilk 16 bayt = salt
- Opsiyonel Gzip açma (sihirli baytlar `0x1f 0x8b`)
- Kod içinde sabit parola: `emuMqG3bLYJ938ZDCfieWJ` (`src-tauri/src/lib.rs:69`)

## Ön Yüz Kuralları

- **Durum yönetimi**: özel `useSaveData` hook (Zustand benzeri, manuel `useState`/`useEffect`/`useRef` ile)
- **Yönlendirme**: sekme tabanlı (`all`, `stash`, `inventory`, `equipped`, `market`, `analytics`, `wishlist`), React Router yok
- **i18n**: `react-i18next` ile `en`/`tr` dilleri `src/locales/` altında. Dil `localStorage`'da `tbh_language` anahtarında
- **Kalıcılık**: tüm kullanıcı ayarları `localStorage`'da — istek listesi, Telegram yapılandırması, yenileme aralığı, fiyat önbelleği, portföy geçmişi, tepsiye küçültme, uyarı eşiği
- **Oyun verisi**: `src/tbh_data.json` (İngilizce eşya veritabanı), `src/tbh_data_tr.json` (Türkçe isimler), `src/constants/item_gold_values.json`
- **Steam market hash adı kuralı**: ekipman eşyaları `"{Adı} ({Nadirlik}) A"`, malzemeler `"{Adı}"`
- **TypeScript strict**: `noUnusedLocals`, `noUnusedParameters`, `noImplicitReturns`, `noFallthroughCasesInSwitch` — tümü etkin

## Steam Giriş Akışı

1. `https://steamcommunity.com/login/home/?goto=` adresine `WebviewWindow` açar
2. Her 3 sn'de bir `get_steam_cookies` komutunu yoklayarak `steamLoginSecure` çerezini arar
3. Başarılı olunca giriş penceresini gizler; çerezler `fetch_url` için Rust global static'inde saklanır

## Fiyat Çekme

- `PriceManager` → `SteamMarketProvider` (`invoke("fetch_url")` ile çeker, Rust HTTP istemcisi `ureq`)
- Steam Market arama sonuçlarında sayfa sayfa gezinir, geri çağrı ile ilerleme bildirir
- Fiyatlar `localStorage`'da `steam_prices_cache` anahtarında önbelleklenir, aralıklarla otomatik yenilenir (min 10 dk)
- 1 saat sonra geçersiz sayılır (`updatedAt` 60 dk'dan eski fiyatlar null kabul edilir)

## Dosya İzleyici (Gerçek Zamanlı Senkronizasyon)

Rust iş parçacığı kayıt dosyasını her 1500 ms'de kontrol eder. Değişiklik algılandığında şifresini çözer ve `save_updated` olayını ön yüze yayar.

## Test, Lint, Format

**Test framework'ü kurulu değil. ESLint, Prettier veya biçimlendirici yapılandırması yok.** Derleme adımındaki TypeScript derleyicisi (`tsc`) tek statik kontrol.

## UI Framework

- Düz CSS (Tailwind veya CSS modülleri yok — `src/App.css`, `src/index.css`, `src/styles/`)
- `@tanstack/react-virtual` sanallaştırılmış eşya ızgaraları için
- `@tauri-apps/plugin-notification` masaüstü bildirimleri için
- Eşya hover ipuçları için özel `GameTooltip` bileşeni

## Veri Akışı

Oyun kaydı (ES3) → Rust şifre çözme → JSON metni → Tauri olayı (`save_updated`) veya `decrypt_save_file` dönüşü → Zustand benzeri durum → memoize edilmiş `parsedSave` → sekmeye, aramaya, nadirliğe, sıralamaya göre filtrelenmiş/sıralanmış → `ItemsGrid` / `EquippedPanel` / `AnalyticsPanel` / vb. ile görüntülenir

## Git

- Açıkça istenmedikçe commit veya push yapma.

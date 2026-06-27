# TBH Helper

> A feature-rich companion app for **Task Bar Hero** — view your inventory, track item values, and monitor Steam Market prices in real time.

[🇹🇷 Türkçe README için tıklayın](./README_TR.md)

---

## 📷 Screenshots

| Main Dashboard | Item Details & History |
|---|---|
| ![Main Dashboard](./screenshots/main_dashboard.png) | ![Item Details](./screenshots/item_detail.png) |

| Analytics Panel | Wishlist & Alerts |
|---|---|
| ![Analytics](./screenshots/analytics.png) | ![Wishlist](./screenshots/wishlist.png) |

---

## ⬇️ Download & Install

**No setup or coding required.** Just download the installer and run it.

👉 **[Download the Latest Release](https://github.com/selimlendiniz/tbh-helper/releases/latest)**

1. Download the `TBH_Helper_Update_Setup.exe` or `TBH Helper_X.Y.Z_x64-setup.exe` from the latest release.
2. Run the installer.
3. Launch **TBH Helper** from your Start Menu or Desktop shortcut.

> ⚠️ **Windows Only:** This application is designed for Windows since it reads the game's local save file.

---

## ✨ Features

- 🗂️ **Inventory Viewer** — Browse all your items across your Inventory, Stash, Market listings, and Equipped slots.
- 💰 **Steam Market Prices** — Automatically fetches live prices from the Steam Community Market.
- 📊 **Analytics Panel** — View breakdown of your holdings by rarity, top-value items, and historical portfolio value.
- 🛒 **Market Explorer** — Search and view the prices of all tradable items in the game.
- 🔴 **Real-Time Sync** — Watches your save file automatically and updates the view live as you play.
- 🔐 **Steam Account Integration** — Log in to Steam securely inside the app to bypass rate limits (429 errors).
- 📬 **Telegram Alerts** — Get instant price alerts and new high-value item notifications directly on your mobile Telegram app.
- 🔔 **High-Value Item Alerts** — Get desktop notifications when you get rare drops exceeding your set price threshold.
- ⚙️ **Close to Tray** — Keep the app running in the system tray in the background to continue watching prices and sending notifications.

---

## 🚀 How to Use & Configure

### 1. Save File Sync
By default, the app automatically finds and monitors your game save at:
`%USERPROFILE%\AppData\LocalLow\TesseractStudio\TaskbarHero\SaveFile_Live.es3`

- If you are playing on a different setup or want to load a backup, click **Select Save File** in the settings.
- Click **Manual Reload** to force an immediate refresh of the save file.

### 2. Connect Steam (Highly Recommended)
Without a Steam login, the Steam Market blocks price requests after a short time (returning `429 Too Many Requests`). 
- Click **Connect Steam** in the top right or settings.
- A secure Steam login window will open. Log in as you normally would.
- Once logged in, the app will capture session cookies to raise your rate limit, and then close the window.
- **Your credentials are never stored or shared.** All requests are read-only and local to your machine.

### 3. High-Value Item Alerts
Get native desktop and Telegram notifications when you obtain a rare or valuable item:
- Open Settings in TBH Helper.
- Under **Min Price Threshold ($)**, set the minimum value (e.g., `5` or `10`) for items you want to get alerts for.
- Set it to `0` to disable these alerts.
- Whenever the game updates your save file with a new item exceeding this price, an alert will be triggered.

### 4. Setup Telegram Notifications (100% Free)
Get notified instantly on your phone when you get high-value drops:
1. Message `@BotFather` on Telegram and send `/newbot` to create your own bot and get a **Bot Token**.
2. Message `@GetIDBot` to get your own **Chat ID**.
3. Search for your bot on Telegram, click **Start**.
4. Open Settings in TBH Helper, check **Enable Telegram Alerts**, enter your token and chat ID, and click **Test Connection**.

### 5. Close to Tray Settings
- By default, closing the app window hides it to the **System Tray** (bottom-right taskbar area) so it can continue watching prices and notifying you.
- To open it again, **left-click the tray icon** or right-click it and choose **Show App**.
- To shut down the app completely, right-click the tray icon and select **Quit**.
- If you prefer the app to exit immediately when closing the window, go to **Settings** and uncheck **Close to Tray**.

---

## 🔒 Privacy & Security

- **Local Processing:** Your save file and Steam cookies never leave your device.
- **No Tracking:** There are no analytical scripts, advertisements, or third-party servers.
- **Safe Steam Connection:** The login uses native Steam pages. The helper only uses the session cookies locally to make anonymous read-only HTTP market requests.

---

## Disclaimer

This is an **unofficial** third-party tool. It is not affiliated with, endorsed by, or connected to TesseractStudio or Valve Corporation. Use at your own risk.

---

## License

MIT License.

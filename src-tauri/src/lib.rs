use aes::cipher::{block_padding::Pkcs7, BlockDecryptMut, KeyIvInit};
use flate2::read::GzDecoder;
use hmac::Hmac;
use pbkdf2::pbkdf2;
use sha1::Sha1;
use std::fs;
use std::io::Read;
use std::path::PathBuf;
use std::sync::atomic::{AtomicBool, Ordering};
use std::thread;
use std::time::{Duration, SystemTime};
use tauri::{
    menu::{MenuBuilder, MenuItemBuilder},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager,
};

type Aes128CbcDec = cbc::Decryptor<aes::Aes128>;

// Atomic flag to ensure we only run one watcher thread
static WATCHER_RUNNING: AtomicBool = AtomicBool::new(false);
static CUSTOM_SAVE_PATH: std::sync::Mutex<Option<PathBuf>> = std::sync::Mutex::new(None);
static STEAM_COOKIES: std::sync::Mutex<Option<String>> = std::sync::Mutex::new(None);
static CLOSE_TO_TRAY: AtomicBool = AtomicBool::new(true);

#[tauri::command]
fn set_close_to_tray(enabled: bool) {
    CLOSE_TO_TRAY.store(enabled, Ordering::Relaxed);
}

fn get_save_path() -> Result<PathBuf, String> {
    if let Ok(guard) = CUSTOM_SAVE_PATH.lock() {
        if let Some(path) = &*guard {
            return Ok(path.clone());
        }
    }

    let home = std::env::var("USERPROFILE")
        .or_else(|_| std::env::var("HOME"))
        .map_err(|_| "Could not find user home directory".to_string())?;

    let path = PathBuf::from(home)
        .join("AppData")
        .join("LocalLow")
        .join("TesseractStudio")
        .join("TaskbarHero")
        .join("SaveFile_Live.es3");

    Ok(path)
}

#[tauri::command]
fn decrypt_save_file() -> Result<String, String> {
    let path = get_save_path()?;
    if !path.exists() {
        return Err("Save file not found at the standard path. Make sure Task Bar Hero is installed and has run.".to_string());
    }

    let bytes = fs::read(&path).map_err(|e| format!("Failed to read save file: {}", e))?;

    if bytes.len() <= 16 {
        return Err("Save file is too short/corrupted.".to_string());
    }

    let salt = &bytes[0..16];
    let iv = salt;
    let ciphertext = &bytes[16..];

    let password = "emuMqG3bLYJ938ZDCfieWJ";

    // Derive key using PBKDF2-SHA1, 100 iterations, 128-bit key
    let mut key = [0u8; 16];
    pbkdf2::<Hmac<Sha1>>(password.as_bytes(), salt, 100, &mut key)
        .map_err(|e| format!("PBKDF2 key derivation failed: {:?}", e))?;

    // Decrypt AES-128-CBC
    let mut ciphertext_copy = ciphertext.to_vec();
    let decryptor = Aes128CbcDec::new_from_slices(&key, iv)
        .map_err(|e| format!("AES decryptor initialization failed: {:?}", e))?;

    let decrypted_bytes = decryptor
        .decrypt_padded_mut::<Pkcs7>(&mut ciphertext_copy)
        .map_err(|e| format!("AES decryption failed (bad padding/key): {:?}", e))?;

    // Decompress if Gzipped (magic bytes 0x1f 0x8b)
    let mut final_bytes = decrypted_bytes;
    let mut decompressed = Vec::new();
    if final_bytes.len() >= 2 && final_bytes[0] == 0x1f && final_bytes[1] == 0x8b {
        let mut decoder = GzDecoder::new(final_bytes);
        decoder
            .read_to_end(&mut decompressed)
            .map_err(|e| format!("Gzip decompression failed: {}", e))?;
        final_bytes = &decompressed;
    }

    let text = String::from_utf8(final_bytes.to_vec())
        .map_err(|e| format!("Failed to decode decrypted bytes to UTF-8: {}", e))?;

    Ok(text)
}

#[tauri::command]
fn start_save_watcher(app_handle: AppHandle) -> Result<(), String> {
    if WATCHER_RUNNING.swap(true, Ordering::Relaxed) {
        return Ok(()); // Already running
    }

    let app_handle_clone = app_handle.clone();
    thread::spawn(move || {
        let mut last_modified = SystemTime::UNIX_EPOCH;

        loop {
            if let Ok(path) = get_save_path() {
                if path.exists() {
                    if let Ok(metadata) = fs::metadata(&path) {
                        if let Ok(modified) = metadata.modified() {
                            if modified > last_modified {
                                last_modified = modified;
                                println!("Save file changed! Decrypting and emitting update...");
                                if let Ok(decrypted_text) = decrypt_save_file() {
                                    let _ = app_handle_clone.emit("save_updated", decrypted_text);
                                }
                            }
                        }
                    }
                }
            }
            thread::sleep(Duration::from_millis(1500));
        }
    });

    Ok(())
}

#[tauri::command]
fn select_custom_save_file() -> Result<String, String> {
    let file = rfd::FileDialog::new()
        .add_filter("EasySave3 File", &["es3"])
        .pick_file();

    match file {
        Some(path_buf) => {
            let path_str = path_buf.to_string_lossy().into_owned();
            if let Ok(mut guard) = CUSTOM_SAVE_PATH.lock() {
                *guard = Some(path_buf);
                Ok(path_str)
            } else {
                Err("Failed to lock custom save path".to_string())
            }
        }
        None => Err("No file selected".to_string()),
    }
}

#[tauri::command]
fn fetch_url(url: String) -> Result<String, String> {
    let mut request = ureq::get(&url).set(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    );

    let mut using_cookies = false;
    if let Ok(guard) = STEAM_COOKIES.lock() {
        if let Some(cookies_str) = &*guard {
            request = request.set("Cookie", cookies_str);
            using_cookies = true;
        }
    }

    if using_cookies {
        println!(
            "DEBUG: fetch_url -> sending request WITH Steam cookies: {}",
            url
        );
    } else {
        println!(
            "DEBUG: fetch_url -> sending request WITHOUT Steam cookies (Guest): {}",
            url
        );
    }

    let response = request
        .call()
        .map_err(|e| format!("Request failed: {}", e))?;

    let body = response
        .into_string()
        .map_err(|e| format!("Failed to read response body: {}", e))?;

    Ok(body)
}

#[tauri::command]
#[allow(deprecated)]
fn open_in_browser(app_handle: AppHandle, url: String) -> Result<(), String> {
    use tauri_plugin_shell::ShellExt;
    app_handle
        .shell()
        .open(&url, None)
        .map_err(|e| format!("Failed to open URL: {}", e))
}

#[tauri::command]
fn is_steam_logged_in() -> Result<bool, String> {
    if let Ok(guard) = STEAM_COOKIES.lock() {
        Ok(guard.is_some())
    } else {
        Err("Failed to lock STEAM_COOKIES".to_string())
    }
}

#[tauri::command]
fn logout_steam() -> Result<(), String> {
    if let Ok(mut guard) = STEAM_COOKIES.lock() {
        *guard = None;
    }
    Ok(())
}

#[tauri::command]
async fn get_steam_cookies(app_handle: tauri::AppHandle, label: String) -> Result<bool, String> {
    use tauri::Manager;
    let window = app_handle
        .get_webview_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;

    let cookies = window.cookies().map_err(|e| e.to_string())?;

    println!(
        "DEBUG: Total cookies found in window {}: {}",
        label,
        cookies.len()
    );
    let mut has_login = false;
    let mut cookie_parts = Vec::new();

    for cookie in &cookies {
        let name = cookie.name();
        let value = cookie.value();
        let domain = cookie.domain().unwrap_or("");
        println!("DEBUG: Cookie found: {} (domain: {})", name, domain);

        if domain.contains("steamcommunity.com") || domain.contains("steampowered.com") {
            cookie_parts.push(format!("{}={}", name, value));
            if name == "steamLoginSecure" {
                has_login = true;
            }
        }
    }

    if has_login {
        let cookies_str = cookie_parts.join("; ");
        if let Ok(mut guard) = STEAM_COOKIES.lock() {
            *guard = Some(cookies_str);
        }
        println!("DEBUG: Successfully found steamLoginSecure! Cookies set.");
        Ok(true)
    } else {
        Ok(false)
    }
}

#[tauri::command]
fn navigate_steam_window(
    app_handle: tauri::AppHandle,
    label: String,
    url: String,
) -> Result<(), String> {
    use tauri::Manager;
    let window = app_handle
        .get_webview_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;

    let script = format!("window.location.href = '{}';", url);
    window.eval(&script).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn show_steam_window(app_handle: tauri::AppHandle, label: String) -> Result<(), String> {
    use tauri::Manager;
    let window = app_handle
        .get_webview_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;
    window.show().map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn extract_steam_data(
    app_handle: tauri::AppHandle,
    label: String,
    start: i32,
) -> Result<(), String> {
    use tauri::Manager;

    let main_window = app_handle
        .get_webview_window("main")
        .or_else(|| {
            app_handle
                .webview_windows()
                .into_iter()
                .find(|(k, _)| k != &label)
                .map(|(_, w)| w)
        })
        .ok_or_else(|| "Main window not found".to_string())?;

    let main_url = main_window.url().map_err(|e| e.to_string())?;
    let scheme = main_url.scheme();
    let host = main_url.host_str().unwrap_or("localhost");
    let base_url = if let Some(port) = main_url.port() {
        format!("{}://{}:{}", scheme, host, port)
    } else {
        format!("{}://{}", scheme, host)
    };

    let window = app_handle
        .get_webview_window(&label)
        .ok_or_else(|| "Window not found".to_string())?;

    let script = format!(
        "const data = document.body.innerText; \
         window.location.href = '{}/?price_page={}&price_data=' + encodeURIComponent(data);",
        base_url, start
    );
    window.eval(&script).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
async fn install_update(url: String) -> Result<(), String> {
    // 1. Get system temp directory
    let temp_dir = std::env::temp_dir();
    let dest_path = temp_dir.join("TBH_Helper_Update_Setup.exe");

    // 2. Download the file using ureq
    println!("Downloading update from {} to {:?}", url, dest_path);
    let response = ureq::get(&url)
        .set(
            "User-Agent",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        )
        .call()
        .map_err(|e| format!("Failed to download update: {}", e))?;

    let mut reader = response.into_reader();
    let mut file = std::fs::File::create(&dest_path)
        .map_err(|e| format!("Failed to create temp file: {}", e))?;

    std::io::copy(&mut reader, &mut file)
        .map_err(|e| format!("Failed to save update file: {}", e))?;

    // 3. Execute the installer
    println!("Launching installer: {:?}", dest_path);

    #[cfg(target_os = "windows")]
    {
        std::process::Command::new(&dest_path)
            .spawn()
            .map_err(|e| format!("Failed to start installer: {}", e))?;
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("open")
            .arg(&dest_path)
            .spawn()
            .map_err(|e| format!("Failed to start installer: {}", e))?;
    }

    // 4. Exit our application so the installer can overwrite it
    std::process::exit(0);
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            decrypt_save_file,
            start_save_watcher,
            select_custom_save_file,
            fetch_url,
            open_in_browser,
            is_steam_logged_in,
            logout_steam,
            get_steam_cookies,
            navigate_steam_window,
            show_steam_window,
            extract_steam_data,
            install_update,
            set_close_to_tray
        ])
        .setup(|app| {
            // Build system tray menu items
            let show_item = MenuItemBuilder::new("Show App").id("show").build(app)?;
            let quit_item = MenuItemBuilder::new("Quit").id("quit").build(app)?;
            let menu = MenuBuilder::new(app)
                .item(&show_item)
                .item(&quit_item)
                .build()?;

            let mut tray_builder = TrayIconBuilder::new().menu(&menu);
            if let Some(icon) = app.default_window_icon() {
                tray_builder = tray_builder.icon(icon.clone());
            }
            let _tray = tray_builder
                .on_menu_event(|app, event| {
                    match event.id().0.as_str() {
                        "show" => {
                            if let Some(window) = app.get_webview_window("main") {
                                let _ = window.show();
                                let _ = window.set_focus();
                            }
                        }
                        "quit" => {
                            app.exit(0);
                        }
                        _ => {}
                    }
                })
                .on_tray_icon_event(|tray, event| match event {
                    TrayIconEvent::Click {
                        button: MouseButton::Left,
                        button_state: MouseButtonState::Up,
                        ..
                    } => {
                        let app = tray.app_handle();
                        if let Some(window) = app.get_webview_window("main") {
                            let _ = window.show();
                            let _ = window.set_focus();
                        }
                    }
                    _ => {}
                })
                .build(app)?;

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                if CLOSE_TO_TRAY.load(Ordering::Relaxed) {
                    api.prevent_close();
                    let _ = window.hide();
                }
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

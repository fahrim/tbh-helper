import { useState, useEffect } from "react";
import { getVersion } from "@tauri-apps/api/app";

// GitHub repo bilgilerini buraya gir
const GITHUB_OWNER = "selimlendiniz";
const GITHUB_REPO = "tbh-helper";

interface Asset {
  name: string;
  browser_download_url: string;
}

interface Release {
  tag_name: string;
  html_url: string;
  name: string;
  body: string;
  published_at: string;
  assets?: Asset[];
}

function parseVersion(v: string): number[] {
  return v.replace(/^v/, "").split(".").map(Number);
}

function isNewer(latest: string, current: string): boolean {
  const l = parseVersion(latest);
  const c = parseVersion(current);
  for (let i = 0; i < 3; i++) {
    if ((l[i] || 0) > (c[i] || 0)) return true;
    if ((l[i] || 0) < (c[i] || 0)) return false;
  }
  return false;
}

export function useUpdateChecker() {
  const [updateAvailable, setUpdateAvailable] = useState<Release | null>(null);

  useEffect(() => {
    // Sadece production'da kontrol et (dev'de disable)
    if ((import.meta as any).env?.DEV) return;

    const check = async () => {
      try {
        const currentVersion = await getVersion();
        const res = await fetch(
          `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/releases/latest`,
          { headers: { Accept: "application/vnd.github+json" } }
        );
        if (!res.ok) return;
        const release: Release = await res.json();
        if (isNewer(release.tag_name, currentVersion)) {
          setUpdateAvailable(release);
        }
      } catch (e) {
        // Network yoksa sessizce geç
        console.warn("Update check failed:", e);
      }
    };

    // 3 saniye sonra kontrol et (uygulama açılış süresi geçsin)
    const t = setTimeout(check, 3000);
    return () => clearTimeout(t);
  }, []);

  return { updateAvailable };
}

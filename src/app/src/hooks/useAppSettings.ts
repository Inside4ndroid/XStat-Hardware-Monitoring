import { useState, useEffect } from 'react'

const SETTINGS_KEY = 'xstat:settings:v1'
const SERVICE_BASE = 'http://localhost:9421'

export interface AppSettings {
  pollIntervalMs: number
}

const DEFAULT_SETTINGS: AppSettings = { pollIntervalMs: 1000 }

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) as Partial<AppSettings> }
  } catch { /* ignore */ }
  return DEFAULT_SETTINGS
}

export function useAppSettings() {
  const [settings, setSettings] = useState<AppSettings>(loadSettings)

  // Persist and push to service on every change.
  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    fetch(`${SERVICE_BASE}/api/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pollIntervalMs: settings.pollIntervalMs }),
    }).catch(() => { /* service may not be running yet */ })
  }, [settings])

  function setPollIntervalMs(ms: number) {
    setSettings(s => ({ ...s, pollIntervalMs: ms }))
  }

  return { settings, setPollIntervalMs }
}

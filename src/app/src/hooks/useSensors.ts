import { useEffect, useRef, useState, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import type { HardwareSnapshot } from '@/types/sensors'

const SERVICE_URL = 'http://localhost:9421'

export function useSensors() {
  const [snapshot, setSnapshot] = useState<HardwareSnapshot | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const hubRef      = useRef<signalR.HubConnection | null>(null)
  // Tracks whether the effect cleanup ran — lets us distinguish a
  // StrictMode-caused stop() from a genuine connection failure.
  const cleanedUpRef = useRef(false)

  const connect = useCallback(async () => {
    if (hubRef.current) return
    cleanedUpRef.current = false

    const hub = new signalR.HubConnectionBuilder()
      .withUrl(`${SERVICE_URL}/hubs/sensors`)
      .withAutomaticReconnect([0, 1000, 3000, 5000])
      .configureLogging(signalR.LogLevel.None)
      .build()

    hub.on('SensorSnapshot', (data: HardwareSnapshot) => {
      setSnapshot(data)
      setError(null)
    })

    // The service broadcasts LayoutUpdated to all connected clients.
    // The Electron app doesn't need it (only the LAN panel page does),
    // but we must register a handler to silence the SignalR "no method found" warning.
    hub.on('LayoutUpdated', () => {})

    hub.onreconnected(() => setConnected(true))
    hub.onclose(() => setConnected(false))

    hubRef.current = hub

    try {
      await hub.start()
      if (!cleanedUpRef.current) {
        setConnected(true)
        setError(null)
      }
    } catch {
      // If cleanup ran before start() resolved, the stop() call caused this
      // failure — it is not a real error (React StrictMode dev artifact).
      if (hubRef.current === hub) hubRef.current = null
      if (!cleanedUpRef.current) {
        setConnected(false)
        setError('Cannot reach XStat service. Make sure it is running.')
      }
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      cleanedUpRef.current = true
      const h = hubRef.current
      hubRef.current = null
      h?.stop()
    }
  }, [connect])

  return { snapshot, connected, error, reconnect: connect }
}

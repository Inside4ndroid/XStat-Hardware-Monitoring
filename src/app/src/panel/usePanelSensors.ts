import { useEffect, useRef, useState, useCallback } from 'react'
import * as signalR from '@microsoft/signalr'
import type { HardwareSnapshot } from '@/types/sensors'

/**
 * Variant of useSensors that derives the hub URL from window.location.origin
 * so the panel works on any device that opens http://{lan-ip}:9421/
 */
export function usePanelSensors() {
  const [snapshot, setSnapshot]   = useState<HardwareSnapshot | null>(null)
  const [connected, setConnected] = useState(false)
  const [error, setError]         = useState<string | null>(null)
  const [layoutJson, setLayoutJson] = useState<string | null>(null)
  const hubRef       = useRef<signalR.HubConnection | null>(null)
  const cleanedUpRef = useRef(false)

  // Fetch the panel layout once on mount so the LAN panel shows the right view at load.
  useEffect(() => {
    fetch(`${window.location.origin}/api/panel-layout`)
      .then(r => (r.status === 204 ? null : r.text()))
      .then(json => { if (json) setLayoutJson(json) })
      .catch(() => {})
  }, [])

  const connect = useCallback(async () => {
    if (hubRef.current) return
    cleanedUpRef.current = false

    const hubUrl = `${window.location.origin}/hubs/sensors`

    const hub = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl)
      .withAutomaticReconnect([0, 1000, 3000, 5000])
      .configureLogging(signalR.LogLevel.Warning)
      .build()

    hub.on('SensorSnapshot', (data: HardwareSnapshot) => {
      setSnapshot(data)
      setError(null)
    })

    hub.on('LayoutUpdated', (json: string) => {
      setLayoutJson(json)
    })

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
      if (hubRef.current === hub) hubRef.current = null
      if (!cleanedUpRef.current) {
        setConnected(false)
        setError('Cannot reach XStat service.')
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

  return { snapshot, connected, error, layoutJson }
}

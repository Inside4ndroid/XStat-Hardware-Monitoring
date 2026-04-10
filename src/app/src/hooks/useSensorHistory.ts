import { useRef, useState, useEffect } from 'react'
import type { HardwareSnapshot, SensorReading } from '@/types/sensors'

export interface HistoryPoint {
  t: number   // timestamp ms
  v: number   // sensor value
}

const HISTORY_LENGTH = 60  // 60 seconds of 1-second samples

/**
 * Maintains a rolling 60-point history buffer per sensor id.
 * Returns a map of { sensorId -> HistoryPoint[] }
 */
export function useSensorHistory(snapshot: HardwareSnapshot | null) {
  const historyRef = useRef<Map<string, HistoryPoint[]>>(new Map())
  const [history, setHistory] = useState<Map<string, HistoryPoint[]>>(new Map())

  useEffect(() => {
    if (!snapshot) return

    const map = historyRef.current
    for (const sensor of snapshot.sensors) {
      if (sensor.value === null) continue
      const existing = map.get(sensor.id) ?? []
      const point = { t: snapshot.timestampMs, v: sensor.value }
      // Always create a new array — existing arrays may be frozen by React state sharing
      const buf = existing.length >= HISTORY_LENGTH
        ? [...existing.slice(1), point]
        : [...existing, point]
      map.set(sensor.id, buf)
    }

    // Shallow-copy the map so React re-renders
    setHistory(new Map(map))
  }, [snapshot])

  return history
}

/**
 * Helper: get a named sensor from a snapshot by partial name + category.
 */
export function findSensor(
  sensors: SensorReading[],
  category: string,
  type: string,
  nameFragment: string
): SensorReading | undefined {
  return sensors.find(
    (s) =>
      s.category === category &&
      s.type === type &&
      s.name.toLowerCase().includes(nameFragment.toLowerCase())
  )
}

/**
 * Helper: get all sensors matching category + type, sorted by name.
 */
export function filterSensors(
  sensors: SensorReading[],
  category: string,
  type: string
): SensorReading[] {
  return sensors
    .filter((s) => s.category === category && s.type === type)
    .sort((a, b) => a.name.localeCompare(b.name))
}

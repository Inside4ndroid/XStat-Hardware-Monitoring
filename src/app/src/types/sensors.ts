// Sensor data types matching the .NET backend models
export interface SensorReading {
  id: string
  name: string
  category: string
  type: string
  value: number | null
  unit: string
  hardwareName: string
}

export interface HardwareSnapshot {
  timestampMs: number
  sensors: SensorReading[]
}

export type SensorCategory =
  | 'CPU'
  | 'GPU'
  | 'RAM'
  | 'Motherboard'
  | 'Storage'
  | 'Network'
  | 'Battery'
  | 'PSU'
  | 'EC'
  | 'Other'

export type SensorType =
  | 'Temperature'
  | 'Clock'
  | 'Load'
  | 'Voltage'
  | 'Power'
  | 'Fan'
  | 'Flow'
  | 'Data'
  | 'SmallData'
  | 'Throughput'
  | 'Control'
  | 'Level'
  | 'Factor'
  | 'TimeSpan'
  | 'Energy'
  | 'Noise'
  | 'Humidity'

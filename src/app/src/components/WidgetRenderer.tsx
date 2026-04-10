import React from 'react'
import type { PanelWidget } from '@/types/panel'
import type { HardwareSnapshot } from '@/types/sensors'
import type { HistoryPoint } from '@/hooks/useSensorHistory'
import { SensorValueWidget }     from './widgets/SensorValueWidget'
import { SensorBarWidget }       from './widgets/SensorBarWidget'
import { SensorSparklineWidget } from './widgets/SensorSparklineWidget'
import { SensorGaugeWidget }     from './widgets/SensorGaugeWidget'
import { ClockWidget }           from './widgets/ClockWidget'
import { TextWidget }            from './widgets/TextWidget'
import { CustomWidget }          from './widgets/CustomWidget'
import { ImageWidget }           from './widgets/ImageWidget'

interface Props {
  widget: PanelWidget
  snapshot: HardwareSnapshot | null
  history: Map<string, HistoryPoint[]>
}

export const WidgetRenderer: React.FC<Props> = ({ widget, snapshot, history }) => {
  switch (widget.type) {
    case 'SensorValue':
      return <SensorValueWidget widget={widget} snapshot={snapshot} />
    case 'SensorBar':
      return <SensorBarWidget widget={widget} snapshot={snapshot} />
    case 'SensorSparkline':
      return <SensorSparklineWidget widget={widget} snapshot={snapshot} history={history} />
    case 'SensorGauge':
      return <SensorGaugeWidget widget={widget} snapshot={snapshot} />
    case 'Clock':
      return <ClockWidget widget={widget} />
    case 'Text':
      return <TextWidget widget={widget} />
    case 'Custom':
      return <CustomWidget widget={widget} snapshot={snapshot} />
    case 'Image':
      return <ImageWidget widget={widget} />
    default:
      return null
  }
}

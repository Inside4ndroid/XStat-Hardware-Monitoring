# Widget Reference

XStat provides eight built-in widget types for the panel editor. All widgets can be:

- Dragged and resized on the canvas
- Renamed (click the name in the Properties panel)
- Layered (z-index ordering via Send to Back / Bring to Front controls)
- Styled with per-element colour, font, size, bold, and italic options

---

## Common Properties

Every widget shares these base properties:

| Property | Type | Description |
|---|---|---|
| `id` | string | Auto-generated unique ID |
| `type` | WidgetType | Widget type (see below) |
| `widgetName` | string? | User-defined display name shown in the selector dropdown |
| `zIndex` | number? | Layer order (higher = on top). Default: 0 |
| `x`, `y` | number | Grid position |
| `w`, `h` | number | Grid size (in grid units) |

---

## Sensor Value (`SensorValue`)

Displays a single sensor reading as a large number with optional label and unit.

**Best for:** CPU temperature, GPU load, RAM usage, fan speeds.

| Property | Description |
|---|---|
| `sensorId` | Sensor to bind |
| `label` | Override label text |
| `unit` | Override unit text |
| `color` | Value text colour |
| `fontSize` | Value font size (px) |
| `labelColor`, `labelFontSize` | Label styling |
| `unitColor`, `unitFontSize` | Unit styling |
| `showLabel` / `showValue` / `showUnit` | Toggle each element on/off |

---

## Sensor Bar (`SensorBar`)

A horizontal progress bar showing a sensor value relative to a min/max range.

| Property | Description |
|---|---|
| `sensorId` | Sensor to bind |
| `min`, `max` | Value range (default 0–100) |
| `accentColor` | Bar fill colour |
| `showAccent` | Toggle the bar fill on/off |
| `showLabel` / `showValue` | Toggle elements |
| All text styling properties | Same as SensorValue |

---

## Sensor Sparkline (`SensorSparkline`)

An area chart showing the recent history of a sensor value as a smooth line with gradient fill.

| Property | Description |
|---|---|
| `sensorId` | Sensor to bind |
| `accentColor` | Line stroke and gradient colour |
| `showAccent` | Toggle the line/gradient on/off |
| `showLabel` / `showValue` | Toggle elements |
| All text styling properties | Same as SensorValue |

> History depth is controlled by `useSensorHistory` (default: last 60 data points).

---

## Sensor Gauge (`SensorGauge`)

A circular arc gauge showing a sensor value as a filled arc over a track arc.

| Property | Description |
|---|---|
| `sensorId` | Sensor to bind |
| `min`, `max` | Value range (default 0–100) |
| `accentColor` | Arc fill colour |
| `showAccent` | Toggle the value fill arc on/off |
| `showLabel` / `showValue` / `showUnit` | Toggle elements |
| All text styling properties | Same as SensorValue |

---

## Clock (`Clock`)

Displays the current local time. Updates every second.

| Property | Description |
|---|---|
| `format` | Time format string (e.g. `HH:mm`, `HH:mm:ss`, `hh:mm a`) |
| `color` | Text colour |
| `fontSize` | Font size |
| `bold`, `fontFamily`, `italic` | Text styling |

---

## Text (`Text`)

Static text label. Useful for headings, section dividers, or decorative labels.

| Property | Description |
|---|---|
| `text` | The text content |
| `color` | Text colour |
| `fontSize` | Font size |
| `bold`, `fontFamily`, `italic` | Text styling |
| `align` | Text alignment (`left` / `center` / `right`) |

---

## Image (`Image`)

Displays an image from a data URL. Upload any image file directly in the Properties panel.

| Property | Description |
|---|---|
| `imageDataUrl` | Base64 data URL of the image |
| `imageObjectFit` | CSS `object-fit` value (`cover`, `contain`, `fill`) |
| `imageOpacity` | Opacity 0–1 |

---

## Custom (`Custom`)

A fully programmable widget. Write HTML, CSS, and JavaScript in the built-in Monaco editor. Sensor data is injected into the widget via `postMessage`.

### Sensor data API

The panel broadcasts sensor updates to each Custom widget via `window.addEventListener('message', e => { ... })`:

```js
window.addEventListener('message', e => {
  const { sensors } = e.data   // array of { id, name, value, unit, type }
  const cpu = sensors.find(s => s.id === 'my-sensor-id')
  document.getElementById('value').textContent = cpu?.value.toFixed(1)
})
```

### Custom widget HTML template

```html
<!DOCTYPE html>
<html><head><meta charset="UTF-8"><style>
* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  background: transparent;
  font-family: Inter, sans-serif;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100vh;
}
#value { font-size: 36px; font-weight: 700; color: #03dac6; }
</style></head><body>
<span id="value">—</span>
<script>
window.addEventListener('message', e => {
  const sensors = e.data?.sensors ?? []
  const s = sensors.find(s => s.id === 'YOUR_SENSOR_ID')
  if (s) document.getElementById('value').textContent =
    s.value.toFixed(1) + ' ' + (s.unit ?? '')
})
</script>
</body></html>
```

### Using the Custom Widget Editor

1. Select a **Custom** widget on the canvas and click the **`</>`** button in the Properties panel.
2. The widget editor window opens with the full Monaco code editor.
3. The **Sensors** button (top right) opens a sensor picker to help find sensor IDs.
4. The **Live Preview** pane on the right shows the rendered widget in real time.
5. Click **Save** to write the HTML back to the widget.

---

## Widget Type Quick Reference

| Widget | Use Case | Has Sensor | Has Accent |
|---|---|---|---|
| SensorValue | Single number readout | ✅ | ❌ |
| SensorBar | Progress / utilisation bar | ✅ | ✅ |
| SensorSparkline | Historical graph | ✅ | ✅ |
| SensorGauge | Arc gauge | ✅ | ✅ |
| Clock | Local time display | ❌ | ❌ |
| Text | Static label | ❌ | ❌ |
| Image | Logo / background image | ❌ | ❌ |
| Custom | Full HTML/CSS/JS | via postMessage | via CSS |

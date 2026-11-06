import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
const { chromium } = createRequire(import.meta.url)('playwright')
const root = new URL('../../XStat.Service/wwwroot/', import.meta.url)
const panel = (width = 800, height = 600) => ({
  id: 'test', name: 'Test', canvasWidth: width, canvasHeight: height,
  canvasBackground: '#123456', canvasShowGrid: false,
  widgets: ['tl', 'tr', 'bl', 'br', 'outside', 'custom'].map(id => ({ id,
    type: id === 'custom' ? 'Custom' : 'Text', text: id,
    customHtml: '<script>parent.postMessage({fixtureLoaded:true},"*");onmessage=e=>{if(e.data.sensors?.length)parent.postMessage({fixtureValue:e.data.sensors[0].value},"*")}</script>' })),
  layout: [
    { i: 'tl', x: 0, y: 0, w: 60, h: 40 },
    { i: 'tr', x: width - 60, y: 0, w: 60, h: 40 },
    { i: 'bl', x: 0, y: height - 40, w: 60, h: 40 },
    { i: 'br', x: width - 60, y: height - 40, w: 60, h: 40 },
    { i: 'outside', x: -150, y: -90, w: 70, h: 60 },
    { i: 'custom', x: width + 40, y: height + 30, w: 80, h: 50 },
  ],
})
let current = panel()
const server = createServer(async (req, res) => {
  if (req.url === '/api/panel-layout') return res.end(JSON.stringify(current))
  if (req.url.startsWith('/hubs/sensors/negotiate')) {
    res.setHeader('Content-Type', 'application/json')
    return res.end(JSON.stringify({ negotiateVersion: 1, connectionId: 'test',
      connectionToken: 'test', availableTransports: [{ transport: 'WebSockets', transferFormats: ['Text'] }] }))
  }
  try {
    const path = req.url === '/' ? 'index.html' : req.url.slice(1)
    const data = await readFile(new URL(path, root))
    res.setHeader('Content-Type', path.endsWith('.js') ? 'text/javascript' : 'text/html')
    res.end(data)
  } catch { res.writeHead(404).end() }
})
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
const browser = await chromium.launch({ headless: true, ...(process.env.PANEL_BROWSER ? { executablePath: process.env.PANEL_BROWSER } : {}) })
try {
  for (const legacy of [false, true]) {
    const page = await browser.newPage({ viewport: { width: 360, height: 800 }, deviceScaleFactor: legacy ? 1 : 3 })
    const errors = []
    page.on('pageerror', error => errors.push(error.message))
    await page.addInitScript(legacy => {
      if (legacy) window.ResizeObserver = undefined
      window.fixtureLoads = 0
      window.addEventListener('message', e => {
        if (e.data?.fixtureLoaded) window.fixtureLoads++
        if (e.data?.fixtureValue !== undefined) window.fixtureValue = e.data.fixtureValue
      })
    }, legacy)
    await page.route('https://fonts.googleapis.com/**', route => route.abort())
    let socket
    await page.routeWebSocket('**/hubs/sensors?**', ws => {
      socket = ws
      ws.onMessage(message => { if (String(message).includes('protocol')) ws.send('{}\x1e') })
    })
    await page.goto(`http://127.0.0.1:${server.address().port}/`)
    await page.waitForSelector('#xw-custom')
    await page.waitForFunction(() => window.fixtureLoads === 1)
    async function measure() {
      return page.evaluate(() => {
        const viewport = document.querySelector('[data-panel-viewport]')
        const canvas = document.querySelector('[id^="xw-"]').parentElement
        const rect = el => { const r = el.getBoundingClientRect(); return { left:r.left, top:r.top, right:r.right, bottom:r.bottom, width:r.width, height:r.height } }
        return { viewport: rect(viewport), boxes: [canvas, ...canvas.querySelectorAll('[id^="xw-"]')].map(rect),
          scroll: [viewport.scrollWidth, viewport.scrollHeight, document.documentElement.scrollWidth, document.documentElement.scrollHeight],
          scale: new DOMMatrix(canvas.parentElement.style.transform).a }
      })
    }
    async function check(label, expected = current) {
      await page.waitForTimeout(80)
      const result = await measure(), v = result.viewport
      for (const b of result.boxes) {
        assert.ok(b.left >= v.left - 0.1 && b.top >= v.top - 0.1 && b.right <= v.right + 0.1 && b.bottom <= v.bottom + 0.1, `${label}: outside ${JSON.stringify(result)}`)
      }
      assert.ok(result.scale > 0 && result.scale <= 1)
      assert.ok(Math.abs(result.boxes[0].width / result.boxes[0].height - expected.canvasWidth / expected.canvasHeight) < 0.001)
      assert.ok(result.scroll[0] <= v.width + 1 && result.scroll[1] <= v.height + 1, `${label}: residual scroll ${JSON.stringify(result)}`)
      assert.ok(result.scroll[2] <= page.viewportSize().width && result.scroll[3] <= page.viewportSize().height, `${label}: document overflow`)
      const left = Math.min(...result.boxes.map(b => b.left)), right = Math.max(...result.boxes.map(b => b.right))
      const top = Math.min(...result.boxes.map(b => b.top)), bottom = Math.max(...result.boxes.map(b => b.bottom))
      assert.ok(Math.abs((left + right) / 2 - (v.left + v.right) / 2) < 0.1)
      assert.ok(Math.abs((top + bottom) / 2 - (v.top + v.bottom) / 2) < 0.1)
      console.log(`PASS ${legacy ? 'resize fallback' : 'ResizeObserver'} ${label}: ${v.width}x${v.height}, scale=${result.scale}`)
      return result
    }
    async function update(next) {
      current = next
      socket.send(JSON.stringify({ type: 1, target: 'LayoutUpdated', arguments: [JSON.stringify(next)] }) + '\x1e')
      await page.waitForTimeout(80)
    }
    await check('initial portrait')
    for (const [width, height] of [[800,360], [320,320], [1600,900], [360,800]]) {
      await page.setViewportSize({width,height}); await check('rotation/aspect ratio')
    }
    if (!legacy) {
      await page.locator('[data-panel-viewport]').evaluate(el => { el.style.right = '70px'; el.style.bottom = '120px' })
      await check('container-only resize')
      await page.locator('[data-panel-viewport]').evaluate(el => { el.style.right = '100%'; el.style.bottom = '100%' })
      await page.waitForTimeout(80)
      assert.equal((await measure()).scale, 0)
      await page.locator('[data-panel-viewport]').evaluate(el => { el.style.right = '0'; el.style.bottom = '0' })
      await check('zero-size recovery')
    }
    await update({ ...panel(80,80), id: 'small' })
    const small = await check('small panel keeps 100%')
    assert.equal(small.scale, 1)
    await update({ ...panel(1920,1080), id: 'large' }); await check('panel switch')
    await update(panel(600,1600)); await check('canvas dimensions')
    current.layout[0] = { i:'tl', x:-400, y:1800, w:300, h:200 }
    await update(current); await check('widget geometry update')
    await page.evaluate(layout => {
      for (const item of layout) {
        const el = document.getElementById(`xw-${item.i}`)
        if (el.offsetLeft !== item.x || el.offsetTop !== item.y || el.offsetWidth !== item.w || el.offsetHeight !== item.h) throw new Error('Original widget geometry changed')
      }
    }, current.layout)
    const before = await measure()
    await page.evaluate(() => { window.savedWidget = document.querySelector('#xw-custom'); window.savedFrame = window.savedWidget.firstChild; window.savedLoads = window.fixtureLoads })
    for (let n = 0; n < 12; n++) {
      socket.send(JSON.stringify({ type:1, target:'SensorSnapshot', arguments:[{ timestampMs:Date.now(), sensors:[{ id:'cpu', value:n }] }] }) + '\x1e')
      await page.waitForTimeout(20)
    }
    await page.waitForFunction(() => window.fixtureValue === 11)
    assert.deepEqual(await measure(), before)
    assert.ok(await page.evaluate(() => window.savedWidget === document.querySelector('#xw-custom') && window.savedFrame === window.savedWidget.firstChild && window.savedLoads === window.fixtureLoads))
    console.log('PASS sensor updates: stable geometry, widget and iframe; no iframe reload')
    const invalid = panel()
    invalid.layout[0].w = -10; invalid.layout[1].x = null; invalid.layout[2].x = 1e308; invalid.layout[2].w = 1e308
    await update(invalid)
    assert.equal(await page.locator('#xw-tl,#xw-tr,#xw-bl').count(), 0)
    await check('invalid geometry ignored')
    await update({ ...panel(), canvasWidth: null, canvasHeight: -1 })
    assert.ok(Number.isFinite((await measure()).scale))
    await update({ ...panel(), widgets: [], layout: [] })
    await page.getByText('No panel configured', { exact:true }).waitFor()
    await update(panel()); await check('empty panel recovery')
    assert.deepEqual(errors, [])
    await page.close()
  }
} finally { await browser.close(); await new Promise(resolve => server.close(resolve)) }

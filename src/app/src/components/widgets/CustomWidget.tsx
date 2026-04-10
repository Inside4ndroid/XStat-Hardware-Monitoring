import React, { useRef, useEffect } from 'react'
import type { PanelWidget } from '@/types/panel'
import type { HardwareSnapshot } from '@/types/sensors'

interface Props {
  widget: PanelWidget
  snapshot: HardwareSnapshot | null
}

/**
 * Replace static ./data/{filename} occurrences with their data URLs, and inject
 * a tiny bootstrap so window.__xstatFiles is populated at runtime via postMessage
 * (avoids embedding megabytes of base64 directly in srcDoc).
 */
function applyFiles(html: string, files?: Record<string, string>): string {
  const entries = Object.entries(files ?? {})
  if (entries.length === 0) return html

  // 1. Replace static ./data/{filename} references (CSS background-image, img src, etc.)
  let result = html
  for (const [name, dataUrl] of entries) {
    result = result.split(`./data/${name}`).join(dataUrl)
  }

  // 2. Inject bootstrap: patches img.src + style.backgroundImage setters so ./data/ paths
  //    resolve transparently at runtime. Uses no regex — template literals strip backslashes.
  //    window.__xstatFiles is populated via postMessage after the iframe loads.
  const bootstrap = '<script>(function(){'
    + 'window.__xstatFiles={};'
    + 'try{'
    +   'var sd=Object.getOwnPropertyDescriptor(HTMLImageElement.prototype,"src");'
    +   'if(sd&&sd.set){'
    +     'Object.defineProperty(HTMLImageElement.prototype,"src",{'
    +       'get:sd.get,'
    +       'set:function(v){'
    +         'if(typeof v==="string"&&v.indexOf("./data/")===0){var f=window.__xstatFiles[v.slice(7)];if(f){sd.set.call(this,f);return;}}'
    +         'sd.set.call(this,v);'
    +       '},configurable:true'
    +     '});'
    +   '}'
    + '}catch(e){}'
    + 'try{'
    +   'var bd=Object.getOwnPropertyDescriptor(CSSStyleDeclaration.prototype,"backgroundImage");'
    +   'if(bd&&bd.set){'
    +     'Object.defineProperty(CSSStyleDeclaration.prototype,"backgroundImage",{'
    +       'get:bd.get,'
    +       'set:function(v){'
    +         'if(typeof v==="string"&&v.indexOf("./data/")!==-1){'
    +           'var i=v.indexOf("./data/"),e,fn,f;'
    +           'while(i!==-1){'
    +             'e=v.indexOf(")",i);if(e===-1)break;'
    +             'fn=v.slice(i+7,e).split(\'"\').join("").split("\'").join("").trim();'
    +             'f=window.__xstatFiles[fn];'
    +             'if(f){v=v.slice(0,i)+f+v.slice(e);}'
    +             'i=v.indexOf("./data/",i+(f?f.length:1));'
    +           '}'
    +         '}'
    +         'bd.set.call(this,v);'
    +       '},configurable:true'
    +     '});'
    +   '}'
    + '}catch(e){}'
    + 'window.addEventListener("message",function(e){if(e.data&&e.data.files)Object.assign(window.__xstatFiles,e.data.files);},false);'
    + '})();<\/script>'
  if (result.includes('</head>')) {
    result = result.replace('</head>', bootstrap + '</head>')
  } else if (result.includes('<body')) {
    result = result.replace(/<body[^>]*>/, m => m + bootstrap)
  } else {
    result = bootstrap + result
  }

  return result
}

/**
 * Renders user-authored HTML/CSS/JS inside a sandboxed iframe.
 * XStat posts the current sensor snapshot to the iframe via window.postMessage
 * on every poll tick so the user's script can reactively update the UI.
 *
 * Security: sandbox="allow-scripts" — no allow-same-origin, so the iframe
 * cannot access parent DOM, localStorage, cookies, or run elevated code.
 */
export const CustomWidget: React.FC<Props> = ({ widget, snapshot }) => {
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Forward sensor data into the iframe whenever the snapshot changes.
  useEffect(() => {
    const win = iframeRef.current?.contentWindow
    if (!win || !snapshot) return
    win.postMessage({ sensors: snapshot.sensors }, '*')  // no files here — sent once on onLoad
  }, [snapshot])

  const processedHtml = applyFiles(widget.customHtml ?? '', widget.customFiles)
  // Remount the iframe when the file list itself changes (handles the case where
  // customHtml has no static ./data/ references so srcDoc wouldn't change otherwise)
  const fileKey = Object.keys(widget.customFiles ?? {}).sort().join('|')

  return (
    <iframe
      ref={iframeRef}
      key={fileKey}
      sandbox="allow-scripts"
      srcDoc={processedHtml}
      onLoad={() => {
        const win = iframeRef.current?.contentWindow
        if (!win) return
        // Send files ONCE on load so window.__xstatFiles is populated;
        // subsequent sensor updates skip files to keep messages small.
        win.postMessage({ sensors: snapshot?.sensors ?? [], files: widget.customFiles ?? {} }, '*')
      }}
      style={{
        width: '100%',
        height: '100%',
        border: 'none',
        display: 'block',
        background: 'transparent',
      }}
      title="xstat-custom-widget"
    />
  )
}

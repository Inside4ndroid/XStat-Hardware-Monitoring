// Configure Monaco Editor to use locally bundled workers instead of CDN.
// This is required for Electron / offline environments.
// Import *before* any <Editor> renders.
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

import editorWorker from 'monaco-editor/esm/vs/editor/editor.worker?worker'
import htmlWorker from 'monaco-editor/esm/vs/language/html/html.worker?worker'
import cssWorker from 'monaco-editor/esm/vs/language/css/css.worker?worker'
import tsWorker from 'monaco-editor/esm/vs/language/typescript/ts.worker?worker'

// Tell Vite-bundled Monaco which worker to use for each language
window.MonacoEnvironment = {
  getWorker(_: unknown, label: string) {
    if (label === 'html' || label === 'handlebars' || label === 'razor') return new htmlWorker()
    if (label === 'css' || label === 'scss' || label === 'less') return new cssWorker()
    if (label === 'typescript' || label === 'javascript') return new tsWorker()
    return new editorWorker()
  }
}

// Tell @monaco-editor/react to reuse the locally bundled instance (skip CDN loader)
loader.config({ monaco })

import { contextBridge, ipcRenderer } from 'electron'

// Expose a safe, typed bridge between the renderer and main process.
// Never expose ipcRenderer directly — this keeps the renderer sandboxed.
contextBridge.exposeInMainWorld('xstat', {
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    maximize: () => ipcRenderer.invoke('window:maximize'),
    close:    () => ipcRenderer.invoke('window:close'),
    quit:     () => ipcRenderer.invoke('app:quit'),
  },
  service: {
    getUrl:      (): Promise<string> => ipcRenderer.invoke('service:url'),
    getPanelUrl: (): Promise<string> => ipcRenderer.invoke('service:panelUrl'),
    getPort:     (): Promise<number> => ipcRenderer.invoke('service:getPort'),
    setPort:     (port: number): Promise<number> => ipcRenderer.invoke('service:setPort', port),
  },
  widgetEditor: {
    /** Open the editor window for a widget (or focus + reinit if already open) */
    open:     (widget: unknown) => ipcRenderer.invoke('widget-editor:open', widget),
    /** Fetch the widget data stored when the window was opened */
    getData:  (): Promise<unknown> => ipcRenderer.invoke('widget-editor:get-data'),
    /** Send save result back to main window, then close */
    save:     (html: string, files: Record<string, string>) => ipcRenderer.invoke('widget-editor:save', html, files),
    close:    () => ipcRenderer.invoke('widget-editor:close'),
    minimize: () => ipcRenderer.invoke('widget-editor:minimize'),
    maximize: () => ipcRenderer.invoke('widget-editor:maximize'),
    /** Register a callback on the MAIN window to receive saves from the editor window */
    onSaved: (cb: (data: { widgetId: string; html: string; files: Record<string, string> }) => void) => {
      ipcRenderer.removeAllListeners('widget-editor:saved')
      ipcRenderer.on('widget-editor:saved', (_e, data) => cb(data as { widgetId: string; html: string; files: Record<string, string> }))
    },
    offSaved: () => ipcRenderer.removeAllListeners('widget-editor:saved'),
    /** Register a callback on the EDITOR window to receive new widget data on re-init */
    onInit: (cb: (widget: unknown) => void) => {
      ipcRenderer.removeAllListeners('widget-editor:init')
      ipcRenderer.on('widget-editor:init', (_e, widget) => cb(widget))
    },
    offInit: () => ipcRenderer.removeAllListeners('widget-editor:init'),
  },
})

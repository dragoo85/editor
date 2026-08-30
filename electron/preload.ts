import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => {
    ipcRenderer.send('window:minimize');
  },
  toggleMaximize: () => {
    ipcRenderer.send('window:toggle-maximize');
  },
  maximize: () => {
    ipcRenderer.send('window:toggle-maximize');
  },
  close: () => {
    ipcRenderer.send('window:close');
  },
  isMaximized: async (): Promise<boolean> => {
    return await ipcRenderer.invoke('window:is-maximized');
  },
  onMaximizedChange: (callback: (isMaximized: boolean) => void) => {
    const subscription = (_: any, isMaximized: boolean) => callback(isMaximized);
    ipcRenderer.on('window:maximized-change', subscription);
    return () => {
      ipcRenderer.removeListener('window:maximized-change', subscription);
    };
  },
  openDirectory: async (): Promise<string | null> => {
    return await ipcRenderer.invoke('dialog:openDirectory');
  }
});

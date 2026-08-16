const { contextBridge, ipcRenderer } = require('electron');

function subscribe(channel, callback) {
  const listener = (_event, payload) => callback(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
}

contextBridge.exposeInMainWorld('launcher', {
  // Reglages
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setMemory: (minGb, maxGb) => ipcRenderer.invoke('settings:set-memory', { minGb, maxGb }),

  // Authentification
  loginMicrosoft: () => ipcRenderer.invoke('auth:login-microsoft'),
  loginOffline: (username) => ipcRenderer.invoke('auth:login-offline', username),
  logout: () => ipcRenderer.invoke('auth:logout'),
  getAccount: () => ipcRenderer.invoke('auth:get-account'),

  // Skin
  pickSkinFile: () => ipcRenderer.invoke('skin:pick-file'),
  setSkinFromUsername: (username) => ipcRenderer.invoke('skin:set-from-username', username),
  getSkin: () => ipcRenderer.invoke('skin:get'),
  clearSkin: () => ipcRenderer.invoke('skin:clear'),

  // Jeu
  play: (mode) => ipcRenderer.invoke('game:play', mode),
  openInstanceFolder: () => ipcRenderer.invoke('game:open-instance-folder'),

  // Evenements (main -> renderer)
  onState: (cb) => subscribe('game:state', cb),
  onProgress: (cb) => subscribe('game:progress', cb),
  onLog: (cb) => subscribe('game:log', cb)
});

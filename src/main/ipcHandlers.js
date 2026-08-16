const { ipcMain, shell } = require('electron');
const config = require('./config');
const store = require('./store');
const offlineAuth = require('./auth/offline');
const microsoftAuth = require('./auth/microsoft');
const { syncMods } = require('./mods/sync');
const { launchGame } = require('./game/launch');
const skinManager = require('./skins/skinManager');
const { checkForLauncherUpdate } = require('./updateCheck');

let isPlaying = false;
let lastKnownUpdate = null;

function registerIpcHandlers(mainWindow) {
  const send = (channel, payload) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(channel, payload);
    }
  };
  const sendState = (state, extra = {}) => send('game:state', { state, ...extra });
  const sendProgress = (payload) => send('game:progress', payload);
  const sendLog = (line) => send('game:log', line);

  ipcMain.handle('app:check-update', async () => {
    lastKnownUpdate = await checkForLauncherUpdate();
    return lastKnownUpdate;
  });

  ipcMain.handle('app:open-update-link', async () => {
    if (lastKnownUpdate) await shell.openExternal(lastKnownUpdate.url);
    return { ok: true };
  });

  ipcMain.handle('settings:get', () => {
    const settings = store.getAll();
    return {
      account: settings.account,
      memoryMinGb: settings.memoryMinGb,
      memoryMaxGb: settings.memoryMaxGb,
      manifestUrl: settings.manifestUrl || config.DEFAULT_MANIFEST_URL
    };
  });

  ipcMain.handle('settings:set-memory', (_event, { minGb, maxGb }) => {
    const min = Math.max(1, Math.min(32, Math.round(minGb)));
    const max = Math.max(min, Math.min(32, Math.round(maxGb)));
    store.setMany({ memoryMinGb: min, memoryMaxGb: max });
    return { minGb: min, maxGb: max };
  });

  ipcMain.handle('auth:login-microsoft', async () => {
    try {
      const account = await microsoftAuth.loginMicrosoft();
      return { ok: true, account };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('auth:login-offline', async (_event, username) => {
    try {
      const auth = offlineAuth.getOfflineAuth(username);
      const account = { type: 'offline', username: auth.name, uuid: auth.uuid };
      store.setMany({ account, msmcToken: null });
      return { ok: true, account };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('auth:logout', () => {
    store.setMany({ account: null, msmcToken: null });
    return { ok: true };
  });

  ipcMain.handle('auth:get-account', () => store.get('account'));

  ipcMain.handle('skin:pick-file', async () => {
    try {
      const result = await skinManager.pickSkinFile();
      if (!result) return { ok: false, cancelled: true };
      store.set('skin', { source: result.source });
      return { ok: true, previewDataUrl: result.previewDataUrl };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('skin:set-from-username', async (_event, username) => {
    try {
      const result = await skinManager.setSkinFromUsername(username);
      store.set('skin', { source: result.source, sourceUsername: result.sourceUsername });
      return { ok: true, previewDataUrl: result.previewDataUrl };
    } catch (err) {
      return { ok: false, error: err.message || String(err) };
    }
  });

  ipcMain.handle('skin:get', async () => {
    const preview = await skinManager.getSkinPreview();
    return { ...store.get('skin'), previewDataUrl: preview ? preview.previewDataUrl : null };
  });

  ipcMain.handle('skin:clear', async () => {
    await skinManager.clearSkin();
    store.set('skin', null);
    return { ok: true };
  });

  ipcMain.handle('game:open-instance-folder', async () => {
    await shell.openPath(config.getInstanceDir());
    return { ok: true };
  });

  ipcMain.handle('game:play', async (_event, mode) => {
    if (isPlaying) return { ok: false, error: 'Le jeu est deja en cours de lancement.' };
    const solo = mode === 'solo';

    const account = store.get('account');
    if (!account) {
      return { ok: false, error: 'Aucun compte selectionne.' };
    }

    isPlaying = true;
    try {
      const manifestUrl = store.get('manifestUrl') || config.DEFAULT_MANIFEST_URL;

      sendState('checking');
      const { manifest } = await syncMods(manifestUrl, (payload) => {
        sendState('updating');
        sendProgress(payload);
      });

      sendState('authenticating');
      let authorization;
      if (account.type === 'microsoft') {
        const fresh = await microsoftAuth.getFreshAuthorization();
        authorization = fresh.authorization;
      } else {
        authorization = offlineAuth.getOfflineAuth(account.username);
      }

      await skinManager.syncSkinToInstance(authorization.name);

      sendState('preparing');
      const { minGb, maxGb } = { minGb: store.get('memoryMinGb'), maxGb: store.get('memoryMaxGb') };
      const { process: gameProcess } = await launchGame({
        manifest,
        authorization,
        memoryMinGb: minGb,
        memoryMaxGb: maxGb,
        onProgress: sendProgress,
        onLog: sendLog,
        solo
      });

      sendState('playing');

      gameProcess.on('close', () => {
        isPlaying = false;
        sendState('idle');
      });

      return { ok: true };
    } catch (err) {
      isPlaying = false;
      sendState('error', { message: err.message || String(err) });
      return { ok: false, error: err.message || String(err) };
    }
  });
}

module.exports = { registerIpcHandlers };

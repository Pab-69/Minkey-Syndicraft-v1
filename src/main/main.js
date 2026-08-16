const path = require('path');
const { app, BrowserWindow, screen } = require('electron');
const { registerIpcHandlers } = require('./ipcHandlers');
const store = require('./store');

let mainWindow = null;

const DEFAULT_WIDTH = 1180;
const DEFAULT_HEIGHT = 760;
const MIN_WIDTH = 820;
const MIN_HEIGHT = 560;

// Reprend la derniere position/taille de fenetre, sauf si l'ecran sur
// lequel elle se trouvait n'est plus branche (ex: PC portable debranche
// d'un second ecran), auquel cas on repart sur la position par defaut.
function getSavedBounds() {
  const bounds = store.get('windowBounds');
  if (!bounds) return null;

  const fitsOnScreen = screen.getAllDisplays().some((display) => {
    const area = display.workArea;
    return (
      bounds.x + bounds.width > area.x &&
      bounds.x < area.x + area.width &&
      bounds.y + bounds.height > area.y &&
      bounds.y < area.y + area.height
    );
  });

  return fitsOnScreen ? bounds : null;
}

function saveWindowState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const isMaximized = mainWindow.isMaximized();
  store.set('windowMaximized', isMaximized);
  if (!isMaximized) {
    store.set('windowBounds', mainWindow.getBounds());
  }
}

function createWindow() {
  const savedBounds = getSavedBounds();
  const wasMaximized = store.get('windowMaximized');

  mainWindow = new BrowserWindow({
    width: savedBounds ? savedBounds.width : DEFAULT_WIDTH,
    height: savedBounds ? savedBounds.height : DEFAULT_HEIGHT,
    x: savedBounds ? savedBounds.x : undefined,
    y: savedBounds ? savedBounds.y : undefined,
    minWidth: MIN_WIDTH,
    minHeight: MIN_HEIGHT,
    backgroundColor: '#14151f',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'renderer', 'assets', 'logo.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  if (wasMaximized) mainWindow.maximize();

  mainWindow.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));

  let saveTimeout = null;
  const scheduleSave = () => {
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(saveWindowState, 400);
  };
  mainWindow.on('resize', scheduleSave);
  mainWindow.on('move', scheduleSave);
  mainWindow.on('close', saveWindowState);

  registerIpcHandlers(mainWindow);
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

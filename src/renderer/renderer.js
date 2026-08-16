const BLANK_IMG =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAAC0lEQVR4nGNgAAIAAAUAAXpeqz8AAAAASUVORK5CYII=';

const el = (id) => document.getElementById(id);

const screens = {
  login: el('screen-login'),
  skin: el('screen-skin'),
  home: el('screen-home')
};

const state = {
  account: null,
  memoryMinGb: 2,
  memoryMaxGb: 4
};

function showScreen(name) {
  Object.values(screens).forEach((s) => s.classList.remove('active'));
  screens[name].classList.add('active');
}

function showError(elementId, message) {
  const node = el(elementId);
  node.textContent = message;
  node.classList.remove('hidden');
}

function clearError(elementId) {
  el(elementId).classList.add('hidden');
}

function setButtonBusy(button, busy, busyLabel) {
  button.disabled = busy;
  if (busy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyLabel || 'Patiente...';
  } else if (button.dataset.originalText) {
    button.textContent = button.dataset.originalText;
  }
}

// --- Ecran de connexion ---

el('btn-login-microsoft').addEventListener('click', async () => {
  clearError('login-error');
  const button = el('btn-login-microsoft');
  setButtonBusy(button, true, 'Connexion en cours...');
  const result = await window.launcher.loginMicrosoft();
  setButtonBusy(button, false);

  if (!result.ok) {
    showError('login-error', result.error);
    return;
  }
  state.account = result.account;
  goToSkinScreen();
});

el('btn-login-offline').addEventListener('click', async () => {
  clearError('login-error');
  const username = el('input-offline-username').value.trim();
  const result = await window.launcher.loginOffline(username);

  if (!result.ok) {
    showError('login-error', result.error);
    return;
  }
  state.account = result.account;
  goToSkinScreen();
});

el('input-offline-username').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') el('btn-login-offline').click();
});

// --- Ecran de skin ---

async function goToSkinScreen() {
  clearError('skin-error');
  const skin = await window.launcher.getSkin();
  el('skin-preview-img').src = skin.previewDataUrl || BLANK_IMG;
  showScreen('skin');
}

el('btn-skin-upload').addEventListener('click', async () => {
  clearError('skin-error');
  const result = await window.launcher.pickSkinFile();
  if (!result) return;
  if (!result.ok) {
    if (!result.cancelled) showError('skin-error', result.error);
    return;
  }
  el('skin-preview-img').src = result.previewDataUrl;
});

el('btn-skin-username').addEventListener('click', async () => {
  clearError('skin-error');
  const username = el('input-skin-username').value.trim();
  if (!username) return;

  const button = el('btn-skin-username');
  setButtonBusy(button, true, '...');
  const result = await window.launcher.setSkinFromUsername(username);
  setButtonBusy(button, false);

  if (!result.ok) {
    showError('skin-error', result.error);
    return;
  }
  el('skin-preview-img').src = result.previewDataUrl;
});

el('btn-skin-skip').addEventListener('click', () => goToHomeScreen());
el('btn-skin-continue').addEventListener('click', () => goToHomeScreen());

// --- Ecran principal ---

async function goToHomeScreen() {
  await refreshAccountBadge();
  showScreen('home');
  resetPlayButton();
}

async function refreshAccountBadge() {
  const account = state.account || (await window.launcher.getAccount());
  state.account = account;
  if (!account) {
    showScreen('login');
    return;
  }

  el('account-name').textContent = account.username;
  el('account-type').textContent = account.type === 'microsoft' ? 'Compte Microsoft' : 'Pseudo (sans compte)';

  const skin = await window.launcher.getSkin();
  el('account-avatar').src = skin.previewDataUrl || BLANK_IMG;
}

el('btn-open-settings').addEventListener('click', () => {
  el('settings-panel').classList.toggle('hidden');
  el('info-panel').classList.add('hidden');
});

el('btn-change-skin').addEventListener('click', () => {
  el('settings-panel').classList.add('hidden');
  goToSkinScreen();
});

el('btn-open-folder').addEventListener('click', () => {
  window.launcher.openInstanceFolder();
});

el('btn-logout').addEventListener('click', async () => {
  await window.launcher.logout();
  state.account = null;
  el('settings-panel').classList.add('hidden');
  el('input-offline-username').value = '';
  showScreen('login');
});

const memorySlider = el('memory-slider');
memorySlider.addEventListener('change', async () => {
  const maxGb = parseInt(memorySlider.value, 10);
  const minGb = Math.min(2, maxGb);
  const result = await window.launcher.setMemory(minGb, maxGb);
  state.memoryMinGb = result.minGb;
  state.memoryMaxGb = result.maxGb;
});
memorySlider.addEventListener('input', () => {
  el('memory-value').textContent = memorySlider.value;
});

// --- Lancement du jeu ---

const STATE_LABELS = {
  checking: 'Vérification des mises à jour...',
  updating: 'Téléchargement des mods...',
  authenticating: 'Connexion du compte...',
  preparing: 'Préparation du jeu...',
  playing: 'Minecraft est lancé, amuse-toi bien !',
  idle: '',
  error: 'Une erreur est survenue.'
};

let currentPlayMode = 'server';

function resetPlayButton() {
  el('btn-play').disabled = false;
  el('btn-play-solo').disabled = false;
  el('btn-play-label').textContent = 'REJOINDRE LE SERVEUR';
  el('status-text').textContent = '';
  el('progress-fill').style.width = '0%';
  el('progress-fill').classList.remove('error');
}

async function startPlay(mode) {
  currentPlayMode = mode;
  el('btn-play').disabled = true;
  el('btn-play-solo').disabled = true;
  el('btn-play-label').textContent = mode === 'solo' ? 'LANCEMENT DU SOLO...' : 'LANCEMENT...';
  el('progress-fill').classList.remove('error');

  const result = await window.launcher.play(mode);
  if (!result.ok) {
    // L'etat "error" a deja ete envoye via les evenements, rien a faire ici.
    return;
  }
}

el('btn-play').addEventListener('click', () => startPlay('server'));
el('btn-play-solo').addEventListener('click', () => startPlay('solo'));

window.launcher.onState((payload) => {
  const { state: gameState, message } = payload;

  if (gameState === 'idle') {
    resetPlayButton();
    return;
  }

  if (gameState === 'playing') {
    el('btn-play-label').textContent = currentPlayMode === 'solo' ? 'EN JEU (SOLO)' : 'EN JEU';
    el('status-text').textContent = STATE_LABELS.playing;
    el('progress-fill').style.width = '100%';
    return;
  }

  if (gameState === 'error') {
    el('btn-play').disabled = false;
    el('btn-play-solo').disabled = false;
    el('btn-play-label').textContent = 'REJOINDRE LE SERVEUR';
    el('status-text').textContent = message || STATE_LABELS.error;
    el('progress-fill').classList.add('error');
    el('progress-fill').style.width = '100%';
    return;
  }

  el('btn-play-label').textContent = currentPlayMode === 'solo' ? 'LANCEMENT DU SOLO...' : 'LANCEMENT...';
  el('status-text').textContent = STATE_LABELS[gameState] || gameState;
});

window.launcher.onProgress((payload) => {
  const statusText = el('status-text');
  const fill = el('progress-fill');

  if (payload.phase === 'mods' && payload.total) {
    statusText.textContent = `Téléchargement : ${payload.name} (${payload.index}/${payload.total})`;
    fill.style.width = `${Math.round((payload.index / payload.total) * 100)}%`;
  } else if (payload.phase === 'download' && payload.total) {
    statusText.textContent = `Installation des fichiers du jeu (${payload.task})...`;
    fill.style.width = `${Math.round((payload.current / payload.total) * 100)}%`;
  } else if (payload.message) {
    statusText.textContent = payload.message;
  }
});

const logContent = el('log-content');
window.launcher.onLog((line) => {
  logContent.textContent += `${line}\n`;
  logContent.scrollTop = logContent.scrollHeight;
});

// --- Mise a jour du launcher ---

el('btn-update-download').addEventListener('click', () => {
  window.launcher.openUpdateLink();
});

el('btn-update-dismiss').addEventListener('click', () => {
  el('update-banner').classList.add('hidden');
});

async function checkForUpdate() {
  const update = await window.launcher.checkUpdate();
  if (!update) return;
  el('update-banner-text').textContent = `Nouvelle version du launcher disponible : ${update.version}`;
  el('update-banner').classList.remove('hidden');
}

// --- Infos du serveur ---

el('btn-open-info').addEventListener('click', () => {
  el('info-panel').classList.toggle('hidden');
  el('settings-panel').classList.add('hidden');
});

el('btn-close-info').addEventListener('click', () => {
  el('info-panel').classList.add('hidden');
});

async function loadInfo() {
  const result = await window.launcher.getInfo();
  if (!result || !result.text) {
    el('btn-open-info').classList.add('hidden');
    return;
  }
  el('info-text').textContent = result.text;
  el('btn-open-info').classList.remove('hidden');
}

// --- Initialisation ---

async function init() {
  const settings = await window.launcher.getSettings();
  state.memoryMinGb = settings.memoryMinGb;
  state.memoryMaxGb = settings.memoryMaxGb;
  memorySlider.value = settings.memoryMaxGb;
  el('memory-value').textContent = settings.memoryMaxGb;

  if (settings.account) {
    state.account = settings.account;
    await goToHomeScreen();
  } else {
    showScreen('login');
  }

  checkForUpdate();
  loadInfo();
}

init();

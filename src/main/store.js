const fs = require('fs');
const os = require('os');
const path = require('path');
const { getSettingsPath } = require('./config');

// Memoire par defaut basee sur la RAM reellement disponible sur la machine,
// pour eviter qu'un reglage pense pour un PC puissant fasse planter Java
// sur un PC plus modeste. Max = la moitie de la RAM (au moins 2 Go).
function defaultMemoryGb() {
  const totalGb = Math.floor(os.totalmem() / 1024 ** 3);
  const max = Math.max(2, Math.min(8, Math.floor(totalGb / 2)));
  const min = Math.min(2, max);
  return { memoryMinGb: min, memoryMaxGb: max };
}

function baseDefaults() {
  return {
    account: null, // { type: 'microsoft' | 'offline', username, uuid, avatarDataUrl }
    msmcToken: null, // token de rafraichissement msmc (compte Microsoft), string
    skin: null, // { source: 'upload' | 'username', localPath, sourceUsername }
    manifestUrl: null, // si null, on utilise DEFAULT_MANIFEST_URL
    windowBounds: null, // { width, height, x, y } - derniere taille/position de fenetre
    windowMaximized: false,
    ...defaultMemoryGb()
  };
}

let cache = null;

function load() {
  if (cache) return cache;
  const file = getSettingsPath();
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    cache = { ...baseDefaults(), ...JSON.parse(raw) };
  } catch {
    cache = baseDefaults();
  }
  return cache;
}

function save() {
  const file = getSettingsPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(cache, null, 2), 'utf-8');
}

function get(key) {
  load();
  return cache[key];
}

function getAll() {
  load();
  return { ...cache };
}

function set(key, value) {
  load();
  cache[key] = value;
  save();
}

function setMany(values) {
  load();
  Object.assign(cache, values);
  save();
}

module.exports = { get, getAll, set, setMany };

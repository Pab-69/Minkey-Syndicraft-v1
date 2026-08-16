const fs = require('fs');
const path = require('path');
const { getSettingsPath } = require('./config');

const DEFAULTS = {
  account: null, // { type: 'microsoft' | 'offline', username, uuid, avatarDataUrl }
  msmcToken: null, // token de rafraichissement msmc (compte Microsoft), string
  skin: null, // { source: 'upload' | 'username', localPath, sourceUsername }
  memoryMinGb: 2,
  memoryMaxGb: 4,
  manifestUrl: null // si null, on utilise DEFAULT_MANIFEST_URL
};

let cache = null;

function load() {
  if (cache) return cache;
  const file = getSettingsPath();
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    cache = { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    cache = { ...DEFAULTS };
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

const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const config = require('../config');

// Recupere le manifest distant (mods, version de Minecraft, adresse du serveur).
// C'est le seul fichier que l'hote a besoin de modifier pour mettre a jour
// tout le monde : il suffit de le pousser sur GitHub (ou n'importe quel serveur web).
async function fetchManifest(manifestUrl) {
  const res = await fetch(manifestUrl, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`Impossible de recuperer le manifest (HTTP ${res.status}).`);
  }
  const manifest = await res.json();
  if (!manifest || !Array.isArray(manifest.files) || !manifest.minecraft || !manifest.minecraft.version) {
    throw new Error('Le manifest recupere est invalide ou incomplet.');
  }
  return manifest;
}

function sha1File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha1');
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

async function fileNeedsDownload(filePath, expectedSha1) {
  if (!fs.existsSync(filePath)) return true;
  if (!expectedSha1) return false;
  try {
    const actual = await sha1File(filePath);
    return actual.toLowerCase() !== expectedSha1.toLowerCase();
  } catch {
    return true;
  }
}

async function downloadFile(url, destPath) {
  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  const tmpPath = `${destPath}.download`;

  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Echec du telechargement (HTTP ${res.status}) : ${url}`);
  }

  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmpPath));
  await fsp.rename(tmpPath, destPath);
}

function readLock() {
  try {
    const raw = fs.readFileSync(config.getInstalledFilesLockPath(), 'utf-8');
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

function writeLock(paths) {
  const lockPath = config.getInstalledFilesLockPath();
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  fs.writeFileSync(lockPath, JSON.stringify(paths, null, 2), 'utf-8');
}

// Synchronise le dossier de l'instance avec le manifest : telecharge les
// fichiers manquants/modifies (mods, configs, resourcepacks...) et supprime
// ceux qui ne sont plus references, sans jamais toucher aux fichiers que le
// joueur aurait ajoutes lui-meme (mondes sauvegardes, options.txt, etc.)
// puisqu'on ne supprime que ce que le launcher a lui-meme installe.
async function syncMods(manifestUrl, onProgress) {
  const report = (payload) => {
    if (onProgress) onProgress(payload);
  };

  report({ phase: 'manifest', message: 'Recuperation de la liste des mods...' });
  const manifest = await fetchManifest(manifestUrl);

  const instanceDir = config.getInstanceDir();
  const previousInstalled = readLock();
  const currentPaths = manifest.files.map((f) => f.path);

  const toRemove = previousInstalled.filter((p) => !currentPaths.includes(p));
  for (const relPath of toRemove) {
    await fsp.rm(path.join(instanceDir, relPath), { force: true });
  }

  const toDownload = [];
  for (const file of manifest.files) {
    const abs = path.join(instanceDir, file.path);
    if (await fileNeedsDownload(abs, file.sha1)) {
      toDownload.push(file);
    }
  }

  const total = toDownload.length;
  for (let i = 0; i < total; i++) {
    const file = toDownload[i];
    const abs = path.join(instanceDir, file.path);
    report({
      phase: 'mods',
      index: i + 1,
      total,
      name: file.name || path.basename(file.path)
    });

    await downloadFile(file.url, abs);

    if (file.sha1) {
      const actual = await sha1File(abs);
      if (actual.toLowerCase() !== file.sha1.toLowerCase()) {
        throw new Error(`Fichier corrompu apres telechargement : ${file.name || file.path}`);
      }
    }
  }

  writeLock(currentPaths);

  return { manifest, updated: total, removed: toRemove.length };
}

module.exports = { fetchManifest, syncMods, sha1File };

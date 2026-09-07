const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const crypto = require('crypto');
const os = require('os');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const extractZip = require('extract-zip');
const config = require('../config');

// Recupere le manifest distant (mods, version de Minecraft, adresse du serveur).
// C'est le seul fichier que l'hote a besoin de modifier pour mettre a jour
// tout le monde : il suffit de le pousser sur GitHub (ou n'importe quel serveur web).
async function fetchManifest(manifestUrl) {
  // Un timestamp en parametre garantit une URL toujours differente, pour
  // eviter qu'un cache intermediaire (proxy reseau, CDN...) ne serve une
  // version perimee du manifest malgre "cache: no-store".
  const separator = manifestUrl.includes('?') ? '&' : '?';
  const bustedUrl = `${manifestUrl}${separator}_=${Date.now()}`;

  const res = await fetch(bustedUrl, { cache: 'no-store' });
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

// Verrou separe pour les archives (dossiers entiers comme config/ ou kubejs/,
// trop nombreux en fichiers individuels pour etre distribues un par un) :
// associe le dossier de destination au sha1 de l'archive installee, pour
// savoir s'il faut re-telecharger/re-extraire sans avoir a tout re-hasher.
function getInstalledArchivesLockPath() {
  return path.join(config.getInstanceDir(), '.launcher', 'installed-archives.json');
}

function readArchiveLock() {
  try {
    const raw = fs.readFileSync(getInstalledArchivesLockPath(), 'utf-8');
    const data = JSON.parse(raw);
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

function writeArchiveLock(map) {
  const lockPath = getInstalledArchivesLockPath();
  fs.mkdirSync(path.dirname(lockPath), { recursive: true });
  fs.writeFileSync(lockPath, JSON.stringify(map, null, 2), 'utf-8');
}

// Telecharge une archive .zip (config/, kubejs/...) et l'extrait dans le
// dossier de destination, en remplacant entierement son contenu precedent :
// plus simple et plus sur qu'un merge fichier par fichier pour un dossier
// gere entierement par l'hote (comme les mods).
async function syncArchive(archive, instanceDir) {
  const destDir = path.join(instanceDir, archive.path);
  const tmpZip = path.join(os.tmpdir(), `minkey-archive-${crypto.randomUUID()}.zip`);

  await downloadFile(archive.url, tmpZip);

  if (archive.sha1) {
    const actual = await sha1File(tmpZip);
    if (actual.toLowerCase() !== archive.sha1.toLowerCase()) {
      await fsp.rm(tmpZip, { force: true });
      throw new Error(`Archive corrompue apres telechargement : ${archive.name || archive.path}`);
    }
  }

  await fsp.rm(destDir, { recursive: true, force: true });
  await fsp.mkdir(destDir, { recursive: true });
  await extractZip(tmpZip, { dir: destDir });
  await fsp.rm(tmpZip, { force: true });
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

  // Archives (config/, kubejs/...) : dossiers entiers geres a part des
  // fichiers individuels, trop nombreux pour etre distribues un par un.
  const archives = manifest.archives || [];
  const previousArchives = readArchiveLock();
  const currentArchivePaths = archives.map((a) => a.path);

  for (const oldPath of Object.keys(previousArchives)) {
    if (!currentArchivePaths.includes(oldPath)) {
      await fsp.rm(path.join(instanceDir, oldPath), { recursive: true, force: true });
    }
  }

  const archivesToSync = archives.filter((a) => previousArchives[a.path] !== a.sha1);
  for (let i = 0; i < archivesToSync.length; i++) {
    const archive = archivesToSync[i];
    report({
      phase: 'archives',
      index: i + 1,
      total: archivesToSync.length,
      name: archive.name || archive.path
    });
    await syncArchive(archive, instanceDir);
  }

  const newArchiveLock = {};
  for (const archive of archives) {
    newArchiveLock[archive.path] = archive.sha1;
  }
  writeArchiveLock(newArchiveLock);

  return { manifest, updated: total, removed: toRemove.length };
}

module.exports = { fetchManifest, syncMods, sha1File };

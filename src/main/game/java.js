const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const os = require('os');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const extractZip = require('extract-zip');
const tar = require('tar');
const config = require('../config');

// Le launcher gere son propre Java portable (comme le vrai launcher Mojang)
// pour que les copains n'aient RIEN a installer eux-memes, quelle que soit
// la version de Java deja presente (ou absente) sur leur machine.

function adoptiumOs() {
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'darwin') return 'mac';
  return 'linux';
}

function adoptiumArch() {
  if (process.arch === 'arm64') return 'aarch64';
  if (process.arch === 'ia32') return 'x86';
  return 'x64';
}

// Determine la version de Java requise en fonction de la version de Minecraft.
function requiredJavaFeatureVersion(mcVersion) {
  const [major, minor] = mcVersion.split('.').map((n) => parseInt(n, 10));
  if (major === 1 && minor <= 16) return 8;
  if (major === 1 && minor <= 20) return 17;
  return 21;
}

function javaBinaryName() {
  return process.platform === 'win32' ? 'java.exe' : 'java';
}

async function findJavaBinary(rootDir) {
  const entries = await fsp.readdir(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(rootDir, entry.name);
    if (entry.isDirectory()) {
      const binPath = path.join(full, 'bin', javaBinaryName());
      if (fs.existsSync(binPath)) return binPath;
      const nested = await findJavaBinary(full).catch(() => null);
      if (nested) return nested;
    }
  }
  return null;
}

async function downloadToFile(url, destPath) {
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Echec du telechargement de Java (HTTP ${res.status}).`);
  }
  await fsp.mkdir(path.dirname(destPath), { recursive: true });
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(destPath));
}

async function extractArchive(archivePath, destDir) {
  await fsp.mkdir(destDir, { recursive: true });
  if (archivePath.endsWith('.zip')) {
    await extractZip(archivePath, { dir: destDir });
  } else {
    await tar.x({ file: archivePath, cwd: destDir });
  }
}

// Retourne le chemin vers l'executable java pour la version de Minecraft
// demandee, en le telechargeant (Eclipse Temurin / Adoptium) si necessaire.
async function ensureJava(mcVersion, onProgress) {
  const report = (payload) => {
    if (onProgress) onProgress(payload);
  };

  const featureVersion = requiredJavaFeatureVersion(mcVersion);
  const targetDir = path.join(config.getJavaDir(), `jre-${featureVersion}`);

  if (fs.existsSync(targetDir)) {
    const existing = await findJavaBinary(targetDir);
    if (existing) return existing;
  }

  report({ phase: 'java', message: `Telechargement de Java ${featureVersion}...` });

  const apiUrl =
    `https://api.adoptium.net/v3/assets/latest/${featureVersion}/hotspot` +
    `?architecture=${adoptiumArch()}&image_type=jre&os=${adoptiumOs()}&vendor=eclipse`;

  const res = await fetch(apiUrl);
  if (!res.ok) {
    throw new Error(`Impossible de recuperer Java ${featureVersion} (HTTP ${res.status}).`);
  }
  const assets = await res.json();
  const asset = Array.isArray(assets) ? assets[0] : null;
  const link = asset && asset.binary && asset.binary.package && asset.binary.package.link;
  if (!link) {
    throw new Error(`Aucune version de Java ${featureVersion} disponible pour cette plateforme.`);
  }

  const archivePath = path.join(os.tmpdir(), `minkey-jre-${featureVersion}${link.endsWith('.zip') ? '.zip' : '.tar.gz'}`);
  await downloadToFile(link, archivePath);

  report({ phase: 'java', message: 'Installation de Java...' });
  await extractArchive(archivePath, targetDir);
  await fsp.rm(archivePath, { force: true });

  const javaBin = await findJavaBinary(targetDir);
  if (!javaBin) {
    throw new Error("Java a ete telecharge mais l'executable est introuvable.");
  }
  if (process.platform !== 'win32') {
    await fsp.chmod(javaBin, 0o755);
  }
  return javaBin;
}

module.exports = { ensureJava, requiredJavaFeatureVersion };

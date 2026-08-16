const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { app, dialog, nativeImage } = require('electron');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const config = require('../config');

// Le skin choisi est stocke une seule fois ici, puis recopie (a chaque
// lancement) dans le dossier que lit le mod CustomSkinLoader, avec le nom du
// pseudo actuel. Ca marche aussi bien pour un compte Microsoft que pour un
// pseudo hors-ligne, et ca suit automatiquement un changement de pseudo.
function currentSkinPath() {
  return path.join(app.getPath('userData'), 'skins', 'current.png');
}

function readPngSize(filePath) {
  const fd = fs.openSync(filePath, 'r');
  try {
    const buffer = Buffer.alloc(24);
    fs.readSync(fd, buffer, 0, 24, 0);
    const isPng = buffer.toString('hex', 0, 8) === '89504e470d0a1a0a';
    if (!isPng) return null;
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
  } finally {
    fs.closeSync(fd);
  }
}

function assertValidSkin(filePath) {
  const size = readPngSize(filePath);
  if (!size) {
    throw new Error("Le fichier choisi n'est pas une image PNG valide.");
  }
  const validSizes = ['64x64', '64x32'];
  const key = `${size.width}x${size.height}`;
  if (!validSizes.includes(key)) {
    throw new Error(
      `Ce skin fait ${size.width}x${size.height}, il faut une image 64x64 (ou 64x32 pour l'ancien format).`
    );
  }
}

async function pickSkinFile() {
  const result = await dialog.showOpenDialog({
    title: 'Choisir un skin (image PNG)',
    filters: [{ name: 'Skin Minecraft (PNG)', extensions: ['png'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths[0]) return null;

  const sourcePath = result.filePaths[0];
  assertValidSkin(sourcePath);

  const dest = currentSkinPath();
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  await fsp.copyFile(sourcePath, dest);

  return { previewDataUrl: await toHeadDataUrl(dest), source: 'upload' };
}

async function setSkinFromUsername(username) {
  const url = `https://minotar.net/skin/${encodeURIComponent(username)}`;
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(`Impossible de recuperer le skin de "${username}".`);
  }

  const dest = currentSkinPath();
  await fsp.mkdir(path.dirname(dest), { recursive: true });
  const tmp = `${dest}.download`;
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmp));
  await fsp.rename(tmp, dest);

  return { previewDataUrl: await toHeadDataUrl(dest), source: 'username', sourceUsername: username };
}

// Recadre uniquement la tete (face avant, 8x8px) depuis la feuille de skin,
// pour l'afficher comme petite icone a cote du pseudo plutot que le skin
// entier a plat. La mise a l'echelle "pixelisee" se fait cote CSS.
async function toHeadDataUrl(filePath) {
  const buffer = await fsp.readFile(filePath);
  const image = nativeImage.createFromBuffer(buffer);
  const head = image.crop({ x: 8, y: 8, width: 8, height: 8 });
  return head.toDataURL();
}

async function getSkinPreview() {
  const dest = currentSkinPath();
  if (!fs.existsSync(dest)) return null;
  return { previewDataUrl: await toHeadDataUrl(dest) };
}

async function clearSkin() {
  await fsp.rm(currentSkinPath(), { force: true });
}

// A appeler juste avant de lancer le jeu : copie le skin choisi dans le
// dossier local du mod CustomSkinLoader, sous le nom du pseudo actuel.
async function syncSkinToInstance(username) {
  const source = currentSkinPath();
  if (!fs.existsSync(source)) return false;

  const targetDir = path.join(config.getInstanceDir(), 'CustomSkinLoader', 'LocalSkin');
  await fsp.mkdir(targetDir, { recursive: true });
  await fsp.copyFile(source, path.join(targetDir, `${username}.png`));
  return true;
}

module.exports = { pickSkinFile, setSkinFromUsername, getSkinPreview, clearSkin, syncSkinToInstance };

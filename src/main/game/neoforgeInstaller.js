const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const config = require('../config');

// Telecharge l'installeur officiel de NeoForge pour la version demandee.
// Contrairement a Forge, le numero de version NeoForge est autonome (ex:
// "21.1.249") et n'a pas besoin d'etre prefixe par la version de Minecraft.
// minecraft-launcher-core traite ensuite ce jar exactement comme un
// installeur Forge moderne (meme mecanisme ForgeWrapper en interne).
async function ensureNeoForgeInstaller(neoforgeVersion) {
  if (!neoforgeVersion) {
    throw new Error(
      "La version de NeoForge n'est pas precisee dans le manifest (champ minecraft.loaderVersion)."
    );
  }

  const fileName = `neoforge-${neoforgeVersion}-installer.jar`;
  const url = `https://maven.neoforged.net/releases/net/neoforged/neoforge/${neoforgeVersion}/${fileName}`;

  const cacheDir = path.join(config.getInstanceDir(), 'cache', 'neoforge-installers');
  const destPath = path.join(cacheDir, fileName);

  if (fs.existsSync(destPath)) {
    return destPath;
  }

  await fsp.mkdir(cacheDir, { recursive: true });
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(
      `Impossible de telecharger l'installeur NeoForge ${neoforgeVersion} (HTTP ${res.status}).`
    );
  }

  const tmpPath = `${destPath}.download`;
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmpPath));
  await fsp.rename(tmpPath, destPath);

  return destPath;
}

module.exports = { ensureNeoForgeInstaller };

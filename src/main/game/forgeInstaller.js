const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { Readable } = require('stream');
const { pipeline } = require('stream/promises');
const config = require('../config');

// Telecharge l'installeur officiel de Forge pour la version demandee.
// minecraft-launcher-core sait ensuite lire ce jar directement (via
// ForgeWrapper) pour finir l'installation, donc on n'a pas besoin de Java
// pour "executer" l'installeur nous-memes.
async function ensureForgeInstaller(mcVersion, forgeVersion) {
  if (!forgeVersion) {
    throw new Error(
      "La version de Forge n'est pas precisee dans le manifest (champ minecraft.loaderVersion)."
    );
  }

  const fullVersion = `${mcVersion}-${forgeVersion}`;
  const fileName = `forge-${fullVersion}-installer.jar`;
  const url = `https://maven.minecraftforge.net/net/minecraftforge/forge/${fullVersion}/${fileName}`;

  const cacheDir = path.join(config.getInstanceDir(), 'cache', 'forge-installers');
  const destPath = path.join(cacheDir, fileName);

  if (fs.existsSync(destPath)) {
    return destPath;
  }

  await fsp.mkdir(cacheDir, { recursive: true });
  const res = await fetch(url);
  if (!res.ok || !res.body) {
    throw new Error(
      `Impossible de telecharger l'installeur Forge ${fullVersion} (HTTP ${res.status}).`
    );
  }

  const tmpPath = `${destPath}.download`;
  await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmpPath));
  await fsp.rename(tmpPath, destPath);

  return destPath;
}

module.exports = { ensureForgeInstaller };

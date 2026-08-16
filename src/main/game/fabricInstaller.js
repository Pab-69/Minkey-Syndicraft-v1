const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const config = require('../config');

// Installe Fabric Loader sans passer par l'installeur graphique officiel :
// l'API meta de Fabric fournit directement le "profil" (JSON) dont a besoin
// minecraft-launcher-core pour lancer le jeu, exactement comme si l'installeur
// avait tourne en local.
async function ensureFabric(mcVersion, loaderVersion) {
  let resolvedLoaderVersion = loaderVersion;

  if (!resolvedLoaderVersion || resolvedLoaderVersion === 'latest') {
    const res = await fetch(`https://meta.fabricmc.net/v2/versions/loader/${mcVersion}`);
    if (!res.ok) {
      throw new Error(`Impossible de recuperer les versions de Fabric Loader (HTTP ${res.status}).`);
    }
    const loaders = await res.json();
    const stable = loaders.find((l) => l.loader && l.loader.stable) || loaders[0];
    if (!stable) {
      throw new Error(`Aucune version de Fabric Loader disponible pour Minecraft ${mcVersion}.`);
    }
    resolvedLoaderVersion = stable.loader.version;
  }

  const profileUrl = `https://meta.fabricmc.net/v2/versions/loader/${mcVersion}/${resolvedLoaderVersion}/profile/json`;
  const res = await fetch(profileUrl);
  if (!res.ok) {
    throw new Error(
      `Impossible d'installer Fabric ${resolvedLoaderVersion} pour Minecraft ${mcVersion} (HTTP ${res.status}).`
    );
  }
  const profile = await res.json();

  const versionsDir = path.join(config.getInstanceDir(), 'versions', profile.id);
  await fsp.mkdir(versionsDir, { recursive: true });
  await fsp.writeFile(path.join(versionsDir, `${profile.id}.json`), JSON.stringify(profile, null, 2));

  return { customId: profile.id, loaderVersion: resolvedLoaderVersion };
}

module.exports = { ensureFabric };

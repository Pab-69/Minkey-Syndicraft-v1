const { app } = require('electron');

const REPO = 'Pab-69/Minkey-Syndicraft-v1';

function parseVersion(v) {
  return String(v)
    .replace(/^v/i, '')
    .split('.')
    .map((n) => parseInt(n, 10) || 0);
}

function isNewer(remoteVersion, localVersion) {
  const remote = parseVersion(remoteVersion);
  const local = parseVersion(localVersion);
  for (let i = 0; i < Math.max(remote.length, local.length); i++) {
    const r = remote[i] || 0;
    const l = local[i] || 0;
    if (r > l) return true;
    if (r < l) return false;
  }
  return false;
}

// Verifie si une version plus recente du LAUNCHER lui-meme (pas des mods)
// a ete publiee sur GitHub. Utilise l'API publique (le depot est public,
// aucune authentification requise). Ne fait jamais planter l'appli si ca
// echoue (pas de connexion, limite de taux GitHub, etc.).
async function checkForLauncherUpdate() {
  try {
    const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
      headers: { Accept: 'application/vnd.github+json' }
    });
    if (!res.ok) return null;

    const release = await res.json();
    const currentVersion = app.getVersion();

    if (release.tag_name && isNewer(release.tag_name, currentVersion)) {
      return {
        version: release.tag_name,
        url: release.html_url || `https://github.com/${REPO}/releases/latest`
      };
    }
    return null;
  } catch {
    return null;
  }
}

module.exports = { checkForLauncherUpdate };

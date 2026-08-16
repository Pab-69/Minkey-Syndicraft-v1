const { Client } = require('minecraft-launcher-core');
const config = require('../config');
const { ensureJava } = require('./java');
const { ensureFabric } = require('./fabricInstaller');
const { ensureForgeInstaller } = require('./forgeInstaller');

// Prepare (Java, Fabric/Forge) puis lance Minecraft. Ne connecte pas
// automatiquement a un serveur : chacun ajoute le serveur lui-meme depuis
// le menu multijoueur de Minecraft. Retourne le processus enfant.
async function launchGame({
  manifest,
  authorization,
  memoryMinGb,
  memoryMaxGb,
  gameWindowWidth,
  gameWindowHeight,
  gameWindowFullscreen,
  onProgress,
  onLog
}) {
  const report = (payload) => {
    if (onProgress) onProgress(payload);
  };
  const log = (line) => {
    if (onLog) onLog(line);
  };

  const mc = manifest.minecraft;
  const mcVersion = mc.version;
  const modLoader = (mc.modLoader || 'vanilla').toLowerCase();

  report({ phase: 'java', message: 'Verification de Java...' });
  const javaPath = await ensureJava(mcVersion, report);

  let versionCustom;
  let forgeInstallerPath;

  if (modLoader === 'fabric') {
    report({ phase: 'loader', message: 'Installation de Fabric...' });
    const { customId } = await ensureFabric(mcVersion, mc.loaderVersion);
    versionCustom = customId;
  } else if (modLoader === 'forge') {
    report({ phase: 'loader', message: 'Installation de Forge...' });
    forgeInstallerPath = await ensureForgeInstaller(mcVersion, mc.loaderVersion);
  }

  report({ phase: 'launch', message: 'Preparation du lancement...' });

  const launcher = new Client();
  const recentLogs = [];

  launcher.on('debug', (e) => {
    const line = String(e);
    recentLogs.push(line);
    if (recentLogs.length > 40) recentLogs.shift();
    log(line);
  });
  launcher.on('data', (e) => log(String(e)));
  launcher.on('progress', (e) => {
    report({ phase: 'download', task: e.type, current: e.task, total: e.total });
  });

  const opts = {
    authorization,
    root: config.getInstanceDir(),
    javaPath,
    version: {
      number: mcVersion,
      type: mc.type || 'release',
      custom: versionCustom
    },
    memory: {
      min: `${memoryMinGb}G`,
      max: `${memoryMaxGb}G`
    },
    forge: forgeInstallerPath,
    window: gameWindowFullscreen
      ? { fullscreen: true }
      : { width: gameWindowWidth || 1280, height: gameWindowHeight || 720 },
    overrides: {
      detached: true
    }
  };

  const proc = await launcher.launch(opts);
  if (!proc) {
    const detail = recentLogs.slice(-5).join('\n');
    throw new Error(
      `Le lancement de Minecraft a echoue.${detail ? `\nDerniers messages :\n${detail}` : ''}`
    );
  }

  return { process: proc, launcher };
}

module.exports = { launchGame };

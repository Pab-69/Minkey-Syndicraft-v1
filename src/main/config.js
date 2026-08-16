const path = require('path');
const { app } = require('electron');

// URL par defaut du manifest qui decrit les mods, la version de Minecraft
// et l'adresse du serveur. C'est le SEUL fichier que l'hote du serveur a besoin
// de modifier + pousser sur GitHub pour que tous les launchers des copains
// se mettent a jour automatiquement au prochain lancement.
const DEFAULT_MANIFEST_URL =
  'https://raw.githubusercontent.com/Pab-69/Minkey-Syndicraft-v1/main/manifest/manifest.json';

// Dossier racine ou tout est installe (Minecraft, mods, java portable, comptes...)
function getInstanceDir() {
  return path.join(app.getPath('userData'), 'instance');
}

function getJavaDir() {
  return path.join(app.getPath('userData'), 'java-runtime');
}

function getSettingsPath() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function getInstalledFilesLockPath() {
  return path.join(getInstanceDir(), '.launcher', 'installed-files.json');
}

module.exports = {
  DEFAULT_MANIFEST_URL,
  getInstanceDir,
  getJavaDir,
  getSettingsPath,
  getInstalledFilesLockPath
};

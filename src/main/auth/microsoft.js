const { Auth } = require('msmc');
const store = require('../store');

function toAccount(minecraft) {
  const skins = (minecraft.profile && minecraft.profile.skins) || [];
  const activeSkin = skins.find((s) => s.state === 'ACTIVE') || skins[0];

  return {
    type: 'microsoft',
    username: minecraft.profile.name,
    uuid: minecraft.profile.id,
    skinUrl: activeSkin ? activeSkin.url : null
  };
}

// Ouvre la fenetre de connexion Microsoft officielle (popup geree par msmc/electron).
// Retourne le compte (pseudo + uuid) et sauvegarde un jeton de rafraichissement
// pour eviter de redemander le mot de passe a chaque lancement.
async function loginMicrosoft() {
  const authManager = new Auth('select_account');
  const xboxManager = await authManager.launch('electron', { width: 520, height: 720 });
  const minecraft = await xboxManager.getMinecraft();

  const account = toAccount(minecraft);
  store.setMany({
    account,
    msmcToken: xboxManager.save()
  });

  return account;
}

// Utilise le jeton sauvegarde pour obtenir un jeton d'autorisation FRAIS,
// pret pour minecraft-launcher-core. A appeler juste avant chaque lancement
// du jeu car les jetons Minecraft n'ont qu'une duree de vie de ~24h.
async function getFreshAuthorization() {
  const savedToken = store.get('msmcToken');
  if (!savedToken) {
    throw new Error('Aucun compte Microsoft connecte. Merci de te reconnecter.');
  }

  const authManager = new Auth('select_account');
  const xboxManager = await authManager.refresh(savedToken);
  const minecraft = await xboxManager.getMinecraft();

  const account = toAccount(minecraft);
  store.setMany({
    account,
    msmcToken: xboxManager.save()
  });

  return { account, authorization: minecraft.mclc() };
}

module.exports = { loginMicrosoft, getFreshAuthorization };

const crypto = require('crypto');

const USERNAME_REGEX = /^[A-Za-z0-9_]{3,16}$/;

function isValidUsername(username) {
  return typeof username === 'string' && USERNAME_REGEX.test(username);
}

// Reproduit exactement l'algorithme officiel de Minecraft/Mojang pour generer
// l'UUID d'un compte hors-ligne ("crack"):
//   UUID.nameUUIDFromBytes(("OfflinePlayer:" + username).getBytes(UTF_8))
// C'est important: si l'UUID ne correspond pas a celui qu'un serveur en mode
// offline calculerait lui-meme, les donnees du joueur (inventaire, stats,
// whitelist...) ne correspondront pas d'une session a l'autre.
function offlineUuid(username) {
  const hash = crypto.createHash('md5').update(`OfflinePlayer:${username}`, 'utf8').digest();

  // Version 3 (name-based / MD5)
  hash[6] = (hash[6] & 0x0f) | 0x30;
  // Variante RFC 4122
  hash[8] = (hash[8] & 0x3f) | 0x80;

  const hex = hash.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

function getOfflineAuth(username) {
  if (!isValidUsername(username)) {
    throw new Error(
      "Pseudo invalide : 3 a 16 caracteres, lettres/chiffres/underscore uniquement."
    );
  }

  const uuid = offlineUuid(username);

  return {
    access_token: uuid,
    client_token: uuid,
    uuid,
    name: username,
    user_properties: '{}',
    meta: {
      type: 'mojang',
      demo: false
    }
  };
}

module.exports = { isValidUsername, offlineUuid, getOfflineAuth };

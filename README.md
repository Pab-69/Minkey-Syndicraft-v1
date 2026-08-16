# Minkey Syndicraft Launcher

Launcher Minecraft moddé pour la bande. Le but : plus jamais se battre pour
que tout le monde ait exactement les mêmes mods avant l'aventure annuelle.

- Les mods se téléchargent et se mettent à jour **automatiquement** à chaque
  lancement (tu ajoutes un mod, tu push, tout le monde le récupère tout seul).
- Compatible **compte Microsoft officiel** et **pseudo sans compte (crack)**.
- Java est géré automatiquement (téléchargé si besoin, personne n'a rien à
  installer).
- Un seul bouton : **Rejoindre le serveur**.

## Pour tes potes (les joueurs)

1. Récupérer l'installeur (`.exe` sur Windows, `.dmg` sur Mac, `.AppImage` sur
   Linux) que toi (l'hôte) leur partages.
2. L'installer et le lancer.
3. Au premier lancement : choisir "Compte Microsoft" (si le jeu a été acheté)
   ou entrer un pseudo (mode sans compte).
4. Choisir un skin (optionnel, on peut importer une image ou récupérer le
   skin d'un pseudo Minecraft existant).
5. Cliquer sur **Rejoindre le serveur**. Le launcher télécharge les mods
   manquants, installe Java/Fabric/Forge si besoin, puis lance le jeu
   directement connecté au serveur.

Ils n'ont rien d'autre à toucher : à chaque lancement suivant, le launcher
vérifie tout seul s'il y a des mods à mettre à jour.

## Pour toi (l'hôte du serveur)

Tout se pilote depuis **un seul fichier** : [`manifest/manifest.json`](manifest/manifest.json).
Dès que tu le modifies et que tu le pousses sur la branche `main` de ce dépôt,
le launcher de tous tes potes va le voir au prochain clic sur "Rejoindre le
serveur" et se mettre à jour tout seul.

### Ajouter ou mettre à jour un mod

1. Récupère le fichier `.jar` du mod (ou un fichier de config à distribuer,
   même principe).
2. Héberge-le quelque part en téléchargement direct. Le plus simple : crée
   une [Release GitHub](https://github.com/Pab-69/Minkey-Syndicraft-v1/releases)
   sur ce dépôt et attache les fichiers dessus (lien stable, pas de limite de
   bande passante gênante).
3. Calcule son empreinte SHA-1 (sert à vérifier que le téléchargement n'est
   pas corrompu) :
   - Linux/Mac : `sha1sum le-mod.jar`
   - Windows (PowerShell) : `Get-FileHash le-mod.jar -Algorithm SHA1`
4. Ajoute une entrée dans le tableau `files` de `manifest/manifest.json` :

```json
{
  "name": "Nom affiché du mod",
  "path": "mods/le-mod.jar",
  "url": "https://.../le-mod.jar",
  "sha1": "l-empreinte-calculee-a-l-etape-3"
}
```

- `path` est relatif au dossier d'instance et détermine où le fichier est
  rangé : `mods/...` pour un mod, `config/...` pour un fichier de config,
  `resourcepacks/...`, `shaderpacks/...`, etc.
- Retirer une entrée du manifest supprime automatiquement le fichier chez
  tout le monde au prochain lancement.

### Changer la version de Minecraft / le mod loader

Le bloc `minecraft` du manifest :

```json
"minecraft": {
  "version": "1.20.1",
  "type": "release",
  "modLoader": "fabric",
  "loaderVersion": "latest"
}
```

- `modLoader` : `fabric` (recommandé, entièrement automatisé) ou `forge`.
- `loaderVersion` : pour Fabric, `"latest"` prend la dernière version stable
  automatiquement, ou précise un numéro exact. Pour Forge, il faut préciser
  le numéro exact de version Forge (ex: `"47.2.20"`).

### Adresse du serveur

```json
"server": {
  "address": "play.minkey-syndicraft.example",
  "port": 25565
}
```

C'est cette adresse que le bouton "Rejoindre le serveur" utilise pour
connecter directement le joueur, sans qu'il ait à la retaper.

## Skins pour les comptes sans compte Microsoft

Un compte "sans compte" (crack) n'a normalement pas de skin personnalisé côté
Mojang. Pour que ça marche quand même pour tout le monde (comptes officiels
ou non), ajoute le mod [CustomSkinLoader](https://modrinth.com/mod/customskinloader)
à ton `manifest.json` comme n'importe quel autre mod : le launcher dépose
automatiquement le skin choisi par chaque joueur dans le dossier que ce mod
lit (`CustomSkinLoader/LocalSkin/<pseudo>.png`), configuré en source
"Local Skin API".

## Développement

```bash
npm install
npm start          # lance le launcher en mode développement
npm run dist:win    # build l'installeur Windows
npm run dist:mac    # build l'installeur Mac
npm run dist:linux  # build l'installeur Linux
```

## Comment ça marche techniquement

- **Electron** pour l'interface (dossier `src/renderer`) et le processus
  principal (`src/main`).
- **minecraft-launcher-core** pour l'installation/lancement de Minecraft.
- **Fabric** : le launcher récupère directement le profil de lancement via
  l'API meta de Fabric (`meta.fabricmc.net`), pas besoin de Java pour
  l'installeur graphique.
- **Forge** : le launcher télécharge l'installeur officiel Forge et laisse
  `minecraft-launcher-core` (via ForgeWrapper) terminer l'installation.
  ⚠️ Moins testé que Fabric, teste bien avant de distribuer un pack Forge à
  tout le monde.
- **Java** : un runtime Eclipse Temurin est téléchargé et géré tout seul dans
  le dossier de données de l'application, indépendamment de ce qui est déjà
  installé sur la machine.
- Le dossier du jeu de chaque joueur se trouve dans son dossier de données
  applicatif (`%APPDATA%/minkey-syndicraft-launcher/instance` sur Windows,
  équivalent sur Mac/Linux), accessible via "Ouvrir le dossier du jeu" dans
  les réglages du launcher.

## Dépannage

- **Le jeu ne se lance pas** : ouvre le panneau "Journal (pour le debug)" en
  bas de l'écran principal, les dernières lignes donnent généralement la
  cause (mémoire insuffisante, mod incompatible, etc.).
- **Un mod ne se télécharge pas** : vérifie que l'URL dans le manifest est
  bien un lien de téléchargement direct (pas une page web) et que le SHA-1
  correspond exactement au fichier.
- **Trop de RAM allouée fait planter le jeu** : réduis le curseur "Mémoire
  allouée" dans les réglages, en fonction de la RAM réellement disponible
  sur la machine.

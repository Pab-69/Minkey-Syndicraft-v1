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

1. Récupérer l'installeur que toi (l'hôte) leur partages : un seul fichier
   `MinkeySyndicraftLauncher-Setup-x.x.x.exe` sur Windows (`.dmg` sur Mac,
   `.AppImage` sur Linux).
2. Double-cliquer dessus : ça installe le launcher (raccourci Bureau + menu
   Démarrer créés automatiquement) et le lance.
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

### Sécuriser le serveur (repo public)

Ce dépôt est public, donc `manifest.json` (et l'adresse du serveur qu'il
contient) est visible par n'importe qui. Ce n'est pas grave en soi, mais ça
veut dire qu'il ne faut pas compter sur le fait que l'IP soit "secrète" pour
protéger le serveur. La vraie protection se fait côté serveur Minecraft, avec
la whitelist :

1. Dans `server.properties` : `white-list=true` et `enforce-whitelist=true`.
2. Ajoute chaque pote en console (ou en jeu si tu es op) :
   `/whitelist add <pseudo>`.
3. Sans être whitelisté, personne ne peut rejoindre — même en connaissant
   l'IP trouvée dans le repo.

## Skins pour les comptes sans compte Microsoft

Un compte "sans compte" (crack) n'a normalement pas de skin personnalisé côté
Mojang. Pour que ça marche quand même pour tout le monde (comptes officiels
ou non), ajoute le mod [CustomSkinLoader](https://modrinth.com/mod/customskinloader)
à ton `manifest.json` comme n'importe quel autre mod : le launcher dépose
automatiquement le skin choisi par chaque joueur dans le dossier que ce mod
lit (`CustomSkinLoader/LocalSkin/<pseudo>.png`), configuré en source
"Local Skin API".

## Personnalisation (logo et fond d'écran)

Deux images suffisent pour habiller le launcher, à ajouter dans le dépôt :

- `src/renderer/assets/logo.png` : le logo (carré, idéalement 512×512 ou
  plus), utilisé dans l'interface et comme icône de la fenêtre.
- `src/renderer/assets/background.jpg` : l'image de fond affichée derrière
  les écrans.
- `build/icon.png` : la même image que le logo, mais en 1024×1024 si
  possible. C'est à partir de ce fichier qu'electron-builder génère
  automatiquement l'icône de l'installeur (`.ico` sur Windows, `.icns` sur
  Mac). Sans ce fichier, l'icône par défaut d'Electron est utilisée.

Une fois ces fichiers ajoutés, relance `npm run dist:win` pour régénérer
l'installeur avec les nouveaux visuels.

## Développement

```bash
npm install
npm start          # lance le launcher en mode développement
npm run dist:win    # build l'installeur Windows (Setup.exe)
npm run dist:mac    # build l'installeur Mac
npm run dist:linux  # build l'installeur Linux
```

⚠️ Construire l'installeur Windows (`dist:win`) depuis Linux/Mac nécessite
[Wine](https://www.winehq.org/) installé sur la machine qui build (pas besoin
sur les machines des joueurs, uniquement pour toi si tu ne builds pas depuis
un vrai Windows). Sur Debian/Ubuntu : `apt install wine wine32`. Depuis un
Windows normal, `npm run dist:win` fonctionne directement sans rien
installer de plus.

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

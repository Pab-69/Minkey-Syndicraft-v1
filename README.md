# Minkey Syndicraft Launcher

Launcher Minecraft moddé pour la bande. Le but : plus jamais se battre pour
que tout le monde ait exactement les mêmes mods avant l'aventure annuelle.

- Les mods se téléchargent et se mettent à jour **automatiquement** à chaque
  lancement (tu ajoutes un mod, tu push, tout le monde le récupère tout seul).
- Compatible **compte Microsoft officiel** et **pseudo sans compte (crack)**.
- Java est géré automatiquement (téléchargé si besoin, personne n'a rien à
  installer).
- Un seul bouton : **Jouer**.

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
5. Cliquer sur **Jouer**. Le launcher télécharge les mods manquants, installe
   Java/Fabric/Forge si besoin, puis lance le jeu.
6. Une fois dans Minecraft, ajouter le serveur depuis le menu multijoueur
   (une seule fois, comme d'habitude) : l'adresse reste ensuite enregistrée
   dans la liste des serveurs.

Ils n'ont rien d'autre à toucher : à chaque lancement suivant, le launcher
vérifie tout seul s'il y a des mods à mettre à jour.

## Pour toi (l'hôte du serveur)

Tout se pilote depuis **un seul fichier** : [`manifest/manifest.json`](manifest/manifest.json).
Dès que tu le modifies et que tu le pousses sur la branche `main` de ce dépôt,
le launcher de tous tes potes va le voir et se mettre à jour tout seul (au
prochain démarrage pour les infos, au prochain clic sur "Jouer" pour les
mods).

⚠️ GitHub garde parfois une version en cache jusqu'à ~5 minutes après un
push (`raw.githubusercontent.com`) — si un changement n'apparaît pas tout de
suite, c'est normal, il suffit de patienter un peu.

### Infos pour les joueurs

Le champ `"info"` du manifest s'affiche dans un panneau dédié (bouton ℹ️ en
haut de l'écran principal du launcher), pratique pour prévenir tout le monde
d'une info importante (règles, date de l'aventure, changement de serveur...)
sans repasser par Discord. Laisse-le vide (`"info": ""`) pour masquer le
bouton.

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

### Distribuer un modpack complet (dossier `config/`, `kubejs/`...)

Pour un gros modpack, distribuer chaque fichier de config un par un dans
`files` n'est pas pratique (parfois plusieurs centaines de petits fichiers).
Le manifest supporte aussi un tableau `archives`, pour des dossiers entiers
livrés sous forme d'un seul `.zip` :

```json
"archives": [
  {
    "name": "Modpack complet (mods, config, kubejs)",
    "path": ".",
    "url": "https://.../ServerFiles.zip",
    "sha1": "l-empreinte-du-zip"
  }
]
```

- `path` est le dossier de destination (relatif au dossier d'instance) où le
  contenu du zip est extrait. `"."` extrait directement à la racine de
  l'instance (utile pour un "server pack" CurseForge/Modrinth qui contient
  déjà des dossiers `mods/`, `config/`, `kubejs/`... à sa racine).
- Le contenu du dossier de destination est entièrement remplacé à chaque
  changement de `sha1`. Si `path` pointe sur la racine de l'instance
  elle-même, le launcher ne vide que les dossiers de contenu modpack
  connus (`mods/`, `config/`, `kubejs/`, `resourcepacks/`, `shaderpacks/`,
  `datapacks/`) avant d'extraire — jamais Java, les mondes sauvegardés ou
  les comptes — pour qu'un changement complet de modpack ne laisse pas
  d'anciens mods trainer à côté des nouveaux.
- Pratique pour réutiliser directement le "Server Pack" téléchargeable
  depuis CurseForge/Modrinth (celui qui contient les vrais fichiers `.jar`
  des mods, pas juste des références) : héberge-le tel quel (une Release
  GitHub, vu sa taille) et référence-le avec `"path": "."`.

### Retirer un fichier précis fourni par une grosse archive

Si un seul mod dans un gros pack pose problème (crash, conflit...), pas
besoin de reconstruire et re-héberger toute l'archive : le manifest
supporte un tableau `excludes`, des chemins (relatifs au dossier
d'instance, mêmes valeurs que dans `files`/`archives`) supprimés à chaque
lancement, qu'ils viennent d'une archive ou d'ailleurs :

```json
"excludes": [
  "mods/UnModProblematique.jar"
]
```

### Partager un resource pack / texture pack avec tout le monde

Un resource pack "Minkey Syndicraft" est déjà distribué automatiquement à
tout le monde via le manifest (`resourcepacks/MinkeySyndicraft.zip`) : il
remplace le logo "Minecraft" de l'écran titre par le logo du groupe et
ajoute quelques splash texts custom. Comme n'importe quel resource pack,
chaque joueur doit l'activer **une seule fois** : Options → Resource Packs →
le faire passer dans "Sélectionné(s)". Une fois activé, Minecraft s'en
souvient tout seul.

Pour changer/ajouter un resource pack en pleine aventure, deux étapes,
complémentaires :

1. **Distribuer le fichier automatiquement** : ajoute-le au manifest comme
   n'importe quel autre fichier, avec `"path": "resourcepacks/mon-pack.zip"`.
   Il sera téléchargé chez tout le monde au prochain lancement, sans que
   personne ait à aller le chercher sur un site.
2. **Le faire s'appliquer automatiquement chez tout le monde** (sinon chaque
   joueur doit encore l'activer lui-même dans les options Minecraft) : configure
   ton serveur pour qu'il l'impose à la connexion, dans `server.properties` :
   ```
   resource-pack=https://.../mon-pack.zip
   resource-pack-sha1=l-empreinte-sha1-du-zip
   require-resource-pack=true
   ```
   À la connexion, Minecraft propose (ou impose si `require-resource-pack=true`)
   le téléchargement du pack à chaque joueur automatiquement — c'est ça qui
   garantit que tout le monde voit vraiment la même chose, indépendamment de
   ce que chacun a coché dans ses options.

### Personnaliser le menu principal de Minecraft

Le mod [FancyMenu](https://modrinth.com/mod/fancymenu) (version NeoForge,
adaptée à la version actuelle du modpack) est déjà installé, avec sa
dépendance **Melody** (Konkrete, son autre dépendance, est déjà fournie par
le pack de 146 mods, pas besoin de l'ajouter en double). FancyMenu est
purement côté client (visuel uniquement, aucun bloc/item ajouté) : inutile
de l'installer sur le serveur dédié.

FancyMenu se configure directement en jeu via son éditeur visuel (pas besoin
d'écrire de JSON à la main) : lance le jeu depuis le launcher, une fois sur
l'écran titre cherche le bouton/la touche pour activer le mode édition, et
construis ton menu (fond, logo, boutons, raccourci vers le serveur...) en
glisser-déposer. Le mod sauvegarde ensuite un fichier de configuration dans
`config/fancymenu/` — envoie-le-moi une fois fait et je l'ajoute au manifest
(en `files`, un fichier par chemin dans `config/fancymenu/...`) pour que
tout le monde ait le même résultat automatiquement.

### Changer la version de Minecraft / le mod loader

Le bloc `minecraft` du manifest :

```json
"minecraft": {
  "version": "1.21.1",
  "type": "release",
  "modLoader": "neoforge",
  "loaderVersion": "21.1.249"
}
```

- `modLoader` : `vanilla` (Minecraft normal, sans mod), `fabric` (recommandé
  dès qu'il y a des mods, entièrement automatisé), `forge` ou `neoforge`.
- `loaderVersion` : uniquement pour Fabric, Forge et NeoForge (pas pour
  `vanilla`). Pour Fabric, `"latest"` prend la dernière version stable
  automatiquement, ou précise un numéro exact. Pour Forge, il faut préciser
  le numéro exact de version Forge (ex: `"47.2.20"`). Pour NeoForge, le
  numéro de version NeoForge tel quel (ex: `"21.1.249"`, sans le préfixe de
  version Minecraft).

### Adresse du serveur

Le launcher ne se connecte plus automatiquement à un serveur : chacun
l'ajoute une seule fois depuis le menu multijoueur de Minecraft (ou via un
raccourci configuré dans FancyMenu, voir plus haut). Le manifest ne contient
donc plus d'adresse de serveur.

### Sécuriser le serveur (repo public)

Ce dépôt est public, donc si tu partages l'adresse du serveur avec la bande
(en jeu, par message...), ce n'est pas grave en soi, mais ça veut dire qu'il
ne faut pas compter sur le fait que l'IP soit "secrète" pour protéger le
serveur. La vraie protection se fait côté serveur Minecraft, avec la
whitelist :

1. Dans `server.properties` : `white-list=true` et `enforce-whitelist=true`.
2. Ajoute chaque pote en console (ou en jeu si tu es op) :
   `/whitelist add <pseudo>`.
3. Sans être whitelisté, personne ne peut rejoindre — même en connaissant
   l'IP trouvée dans le repo.

## Mettre à jour le launcher lui-même

Ça, c'est différent des mods : c'est pour quand tu changes le *launcher*
(nouvel écran, correctif, etc.), pas juste la liste de mods. Le launcher
vérifie tout seul, à chaque démarrage, s'il existe une version plus récente
sur GitHub, et affiche un bandeau "Nouvelle version disponible" avec un
bouton pour la télécharger — sans jamais bloquer ni forcer quoi que ce soit.

Pour publier une nouvelle version :

1. Augmente le champ `"version"` dans `package.json` (ex: `1.0.0` → `1.0.1`).
2. Pousse sur la branche `main`.
3. La CI build automatiquement l'installeur et le publie comme
   [Release GitHub](https://github.com/Pab-69/Minkey-Syndicraft-v1/releases/latest)
   (lien stable, toujours la dernière version).
4. Au prochain démarrage de leur launcher, tes potes voient le bandeau de
   mise à jour et peuvent télécharger la nouvelle version depuis ce lien.

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

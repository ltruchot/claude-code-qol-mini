# Instructions — dépôt `vscode-comfy-claude-config`

Harnais de confort pour Claude Code, publié sur GitHub : `ltruchot/vscode-comfy-claude-config`.
Il doit marcher sur **Linux, macOS, WSL et Windows**, dans **VS Code comme dans Cursor**.

**Conventions de langue** : le `README.md`, le code et ses commentaires sont en **anglais** — le
dépôt est public et l'outil s'adresse à tout le monde. Ce fichier et les messages de commit sont
en **français**. C'est l'usage constaté, pas une règle arbitrée : si le dépôt gagne des
contributeurs, les commits devront passer à l'anglais.

## Ce que le harnais fait

| Fonction | Fichier | Ce qu'on voit |
|---|---|---|
| Status line de contexte | `statusline/context.py` | `Opus 5 (1M context) ▓▓▓▓░░░░░░ 88k/200k · mon-projet` |
| Sons de notification | `sounds/play.py`, `sounds/generate.py` | deux notes montantes quand Claude t'attend, une note basse quand il a fini |
| Marqueur d'onglet | `hooks/tab-state.py` | 🟡 à toi · 🟢 travaille · 🔴 session finie |
| Revue des frictions | `hooks/precompact-friction.py` | `/compact` s'arrête, propose les leçons une par une, puis compacte |

Installation : `install.py` (enrobages `install.sh` / `install.ps1`), désinstallation symétrique,
réglage éditeur par `install-vscode.py`, contrôles par `test.sh`.

## Les contraintes qui ne se devinent pas

Chacune a été payée dans cette session, et aucune n'est visible en lisant le code.

### `terminalSequence` est un champ RACINE de la sortie d'un hook

Le schéma publié le montre à l'intérieur de `hookSpecificOutput`. **Le runtime le lit à la racine**
(`if (e.terminalSequence)`). Imbriqué, il est **ignoré en silence** : ni erreur, ni avertissement.

Mesuré avant correction : **onze invocations, quatre types d'événements, la bonne séquence produite
à chaque fois, et rien à l'écran.** Un producteur correct dont la sortie part dans le vide ressemble
exactement à un mécanisme non implémenté — j'étais à un message de conclure ça et d'abandonner.

*À faire* : garder le contrôle de `test.sh` qui exige le champ à la racine et **absent** de
`hookSpecificOutput`. Seuls **OSC 0/1/2/9/99/777 et BEL** passent la liste blanche du runtime.
*À ne pas faire* : croire un schéma publié quand le comportement le contredit — le binaire fait foi,
et se lit (`grep -a`).

### Le marqueur d'onglet exige TROIS choses simultanées

1. `"terminal.integrated.tabs.title": "${sequence}"` côté éditeur — sans quoi l'onglet est titré
   d'après le nom du processus et aucune séquence ne s'affiche jamais.
2. `CLAUDE_CODE_DISABLE_TERMINAL_TITLE=1` dans le bloc `env` — **Claude Code émet son propre titre
   OSC 0, un spinner animé plus le nom de la conversation, et le redessine en continu.** Il ne gagne
   donc pas la course parfois : il la gagne toujours.
3. Le champ à la racine, ci-dessus.

Il en manque une, rien n'apparaît, et **aucune des trois ne signale son absence**.

*À ne pas faire* : chercher à colorer l'**icône** de l'onglet. VS Code n'expose aucune séquence pour
l'icône ni pour la couleur ; seule l'extension qui a créé le terminal peut les poser, **à la
création**. La demande faite à Anthropic (issue 56925) est fermée en « not planned » pour ce motif.
Le marqueur est donc un caractère dans le **nom**, jamais une pastille.

*À ne pas faire non plus* : espérer une animation. Les hooks tirent sur des événements, pas sur une
horloge — on a un état stable, jamais un spinner. C'est la même raison qui oblige à faire taire
Claude Code : seul celui qui redessine en continu peut animer.

*Ce que ça coûte, et qui est réel* : `${sequence}` s'applique à **tous** les terminaux. Un onglet
zsh cesse d'afficher `zsh` et affiche `utilisateur@hôte:/chemin/très/long`. D'où l'option
`--tab-state` plutôt qu'un défaut, et `install-vscode.py --revert`.

### `settings.json` est relu à chaud, mais pas son bloc `env`

Mesuré : une session démarrée à 09:58 a déclenché des hooks installés à 14:29. **Les hooks sont donc
rechargés sans redémarrage.** Le bloc `env`, lui, est lu au démarrage — d'où le message de
l'installeur qui demande une session neuve seulement pour `--tab-state`.

*À ne pas faire* : demander un redémarrage complet par réflexe. Et savoir que **recharger la fenêtre
de l'éditeur ne relance rien** : le serveur se reconnecte aux processus existants.

### Un hook n'a pas de terminal, et son `stderr` est lu par l'utilisateur

`/dev/tty` est inaccessible depuis un hook — d'où `terminalSequence`, qui fait écrire Claude Code à
sa place.

Et `stderr` est **à la fois** le canal de retour vers Claude et ce qui s'affiche à l'écran. La
première version de `precompact-friction.py` y imprimait tout son brief : l'utilisateur recevait en
pleine figure onze lignes de consignes qui ne lui étaient pas adressées, et les a lues comme une
demande faite à lui.

*À faire* : écrire le brief dans un fichier sous `state/` et ne mettre sur `stderr` qu'**une ligne**
qui le nomme. *À ne pas faire* : oublier qu'un canal de retour machine est aussi une sortie humaine.

### Les hooks s'enregistrent en forme exec, jamais en chaîne de shell

`{"type": "command", "command": <interpréteur>, "args": [<script>, <arg>]}`.

C'est ce qui fait qu'un chemin contenant des espaces — `C:\Program Files\…`, cas ordinaire sous
Windows — fonctionne partout de la même façon, et que rien ne dépend de la présence de Git Bash.
L'interpréteur retenu est `sys.executable`, celui qui a lancé l'installeur : il existe par
construction, là où résoudre `python3` se tromperait sous Windows.

C'est aussi pourquoi **le lecteur de son est en Python** et non en shell : sur Windows sans Git
Bash, Claude Code exécute les hooks via PowerShell. `winsound`, de la bibliothèque standard, donne
l'audio Windows sans lecteur externe.

### Un installeur qui ajoute doit aussi retirer

`install.py` purge **ses propres** handlers avant de reposer ceux qui sont actifs, sinon désactiver
une option laisse ses hooks derrière. Constaté sur une vraie config, pas supposé.

La liste `OURS` porte aussi `sounds/play.sh`, l'**ancien** lecteur shell : sans ce marqueur de
migration, une mise à jour laissait deux hooks orphelins pointant un fichier supprimé.

*À faire* : quand un fichier livré change de nom, ajouter l'ancien nom à `OURS`.

### Le `settings.json` d'un éditeur est du JSONC

Il peut contenir commentaires et virgules finales. Analyser puis résérialiser les supprimerait sans
un mot. `install-vscode.py` insère donc la clé **textuellement** après l'accolade ouvrante et laisse
le reste octet pour octet. Éprouvé sur un fixture portant commentaire de ligne, commentaire de bloc
et virgule finale : les trois survivent.

### La jauge de la status line vise le SEUIL, pas la fenêtre

Sur un modèle 1M, 200k valent 20 % de la fenêtre : une jauge fenêtre-relative serait quasi vide à
l'instant précis où l'alerte doit se voir. Barre et fraction partagent le même dénominateur —
`250k/200k` est le signal.

## Méthode : comment on a trouvé ces choses

- **Instrumenter la copie installée, pas le dépôt.** Les scripts de hook sont relus à chaque
  invocation, donc une sonde ajoutée dans `~/.claude/hooks/…` prend effet **sans redémarrage**.
  C'est ce qui a permis de prouver que les hooks tiraient bien alors que rien ne s'affichait.
  Vérifier `git status` et retirer la sonde ensuite.
- **Déclencher une autre session par `SendMessage`** pour faire tirer ses hooks sans déranger
  l'utilisateur.
- **`grep -a` sur un binaire.** Sans `-a`, `grep` se tait sur un binaire et un compte à zéro se lit
  comme une absence : six chaînes annoncées « 0 occurrence » étaient toutes présentes.
- **`/proc/PID/environ` est figé au `exec`** : il ne peut pas voir une variable posée par
  `settings.json`, que Node applique dans `process.env`. Un contrôle qui l'utilise pour ça ne prouve
  rien.
- **Un résultat négatif se vérifie avant de conclure.** Deux fois dans cette session, une recherche
  infructueuse a été prise pour une preuve d'absence, et les deux fois c'était faux.

## Ce qui est vérifié, et ce qui ne l'est pas

**Vérifié sur cette machine** (WSL2 + Cursor installé côté Windows) : le cycle installation →
réinstallation avec options différentes → désinstallation, en préservant `model`, `permissions`,
`enabledPlugins`, `autoMode` et les hooks écrits par l'utilisateur ; la purge des options
désactivées ; le marqueur d'onglet **vu à l'écran** ; les 28 contrôles de `test.sh`.

**Jamais exécuté sur une vraie machine** : les chemins **macOS** et **Windows natif** — `afplay`,
`winsound`, et les emplacements de réglages de chaque éditeur. Écrits d'après leur comportement
documenté. Le `README.md` le dit noir sur blanc ; ne pas laisser croire à trois plateformes testées.

## Fils ouverts

- **Le format du marqueur reste à choisir.** Réglable sans toucher au code par `CC_TAB_WORKING`,
  `CC_TAB_WAITING`, `CC_TAB_STOPPED` dans le bloc `env` — emoji, `[..]`, `(working)`. Les emoji
  rendent correctement, c'est constaté ; reste à savoir ce qui se repère le mieux dans une liste.
- **Un triangle d'avertissement est apparu sur chaque onglet** de la liste des terminaux, absent des
  captures antérieures. Cause inconnue, jamais creusée. L'infobulle au survol le dira.
- **La revue des frictions n'a tourné qu'une fois**, et son premier passage réel a révélé le défaut
  du `stderr` ci-dessus. La branche `auto` — celle qui ne bloque pas et passe par
  `additionalContext` — **n'a jamais été observée**, et `additionalContext` sur `PreCompact` reste le
  seul champ dont je n'ai pas prouvé qu'il est honoré.
- **Quatre leçons de la session en cours restent à trancher** avec Loïc, la première ayant été
  proposée : elles sont déjà consignées ci-dessus, il reste à décider si elles vivent ici ou dans un
  `~/.claude/CLAUDE.md` (qui n'existe pas encore).

## Tester

```bash
./test.sh                      # 28 contrôles, sans rien installer
./install.sh --tab-state       # installe tout
./install-vscode.sh            # règle l'éditeur, puis session NEUVE
./uninstall.sh                 # retire ce qu'on a posé, et rien d'autre
```

`CLAUDE_CONFIG_DIR` détourne l'installation vers un dossier jetable : c'est ainsi qu'on éprouve un
cycle complet sans toucher à sa vraie configuration.

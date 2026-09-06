# Instructions — dépôt `vscode-comfy-claude-config`

Harnais de confort pour Claude Code, publié sur GitHub : `ltruchot/vscode-comfy-claude-config`.
Il doit marcher sur **Linux, macOS, WSL et Windows**, dans **VS Code comme dans Cursor**.

**Son intention, qui décide des arbitrages** : un modèle qui ne travaille pas est un modèle à qui on
pourrait donner quelque chose. Les signaux répondent donc à « est-ce que ça tourne ? » avant toute
autre question — d'où le vert pour l'activité, et non pour le repos. Savoir d'un coup d'œil lequel
t'attend est la moitié du sujet ; les occuper tous est l'autre moitié.

**Conventions de langue** : le `README.md`, le code et ses commentaires sont en **anglais** — le
dépôt est public et l'outil s'adresse à tout le monde. Ce fichier et les messages de commit sont
en **français**. C'est l'usage constaté, pas une règle arbitrée : si le dépôt gagne des
contributeurs, les commits devront passer à l'anglais.

## Ce que le harnais fait

| Fonction | Fichier | Ce qu'on voit |
|---|---|---|
| Status line de contexte | `statusline/context.py` | `Opus 5 (1M context) ▓▓▓▓░░░░░░ 88/200k · mon-projet` |
| Sons de notification | `sounds/play.py`, `sounds/generate.py` | deux notes montantes quand Claude t'attend, une note basse quand il a fini |
| Marqueur d'onglet | `hooks/tab-state.py` | 🟢 travaille (ou parqué sur un sous-agent) · 🔴 bloqué sur toi · 🟡 idle |
| Revue kaizen | `hooks/precompact-kaizen.py`, `skills/kaizen/SKILL.md` | `/compact` s'arrête et te dit de lancer `/kaizen` ; la revue faite, il passe |

Installation : `install.py` (enrobages `install.sh` / `install.ps1`), désinstallation symétrique,
réglage éditeur par `install-vscode.py`, contrôles par `test.sh`.

Sans argument et sur un vrai terminal, `install.py` **interroge** : jauge et ses deux seuils, sons,
kaizen, marqueur d'onglet. Dès qu'une option est passée — ou que `stdin` n'est pas un terminal — il
n'interroge plus rien : une invite qui bloque un runner CI est un défaut, pas un confort.

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

*Pas d'état « session terminée »* : constaté à l'usage, il n'apparaît jamais ou quelques
millisecondes. Cause probable — le shell repeint son propre titre dès que Claude Code rend le
prompt — **non vérifiée** ; ce qui est certain, c'est que personne ne le voit, et un état que
personne ne voit ne se porte pas. `SessionEnd` reste dans `EVENTS` sans handler : c'est la purge qui
retire celui des installations antérieures.

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

### Un hook `PreCompact` ne peut RIEN confier à Claude

C'est la contrainte qui a coûté le plus cher, parce qu'elle est invisible : le mécanisme *paraît*
marcher.

La référence le dit mot pour mot : *« Exit with code 2 to block compaction. For a manual
`/compact`, the stderr message is shown to the **user**. »* Le binaire le confirme — la fonction de
blocage journalise puis `throw`, elle sort du chemin de compaction, elle ne rend pas la main à la
conversation :

```js
n(`Compaction blocked by PreCompact hook: ${e.blockedBy}`,{level:"warn"});
… throw new R0(`${z5e}: ${e.blockedBy}`)
```

Et il n'y a pas de porte dérobée : `PreCompact` n'accepte **pas** `additionalContext` (seuls
`decision`/`reason` au niveau racine), et `PostCompact` n'a aucun contrôle de décision, son `stdout`
n'allant qu'au journal de débogage.

*Ce que ça a produit* : la première version imprimait tout son brief de revue sur `stderr` en
supposant que Claude le lirait. **Claude n'en a jamais vu une ligne.** Chaque revue qui a semblé
fonctionner était une revue que l'utilisateur avait redemandée dans son message suivant — le
mécanisme n'a jamais tiré une seule fois de lui-même, et rien ne le signalait.

*À faire* : traiter `stderr` comme ce qu'il est — **deux lignes adressées à l'humain**, qui nomment
la commande à taper. Le travail vit dans une **skill** (`/kaizen`) que l'utilisateur invoque, jamais
dans le hook.

*À ne pas faire* : déduire d'un tableau d'exit codes que « exit 2 renvoie stderr à Claude ». C'est
vrai pour `PreToolUse`, `Stop`, `PostToolUse` — **pas** pour `PreCompact`, `SessionStart`,
`SubagentStart`, `PostModelSwitch`, où le tableau par événement dit explicitement *shows stderr to
user only*. La colonne se lit par ligne.

Et le brief ne doit proposer que deux destinations pour une leçon : le `CLAUDE.md` du dépôt
concerné, ou une **skill** nommée. Jamais `~/.claude/CLAUDE.md` — une leçon trop générale pour un
dépôt devient une skill, elle ne remonte pas d'un cran. C'est une consigne de Loïc, tranchée pendant
la revue : un fichier utilisateur s'applique à tous les projets sans qu'on l'ait choisi pour chacun.

### Le jeton de déblocage est indexé sur le RÉPERTOIRE, pas sur la session

La skill doit pouvoir l'écrire depuis un shell ordinaire, et elle sait bien mieux **où** elle est que
**qui** elle est. Deux conséquences gratuites : lancer `/kaizen` à la main arme le `/compact`
suivant, et une revue faite dans un projet ne débloque pas la compaction d'un autre — collision
réellement observée, deux sessions ayant écrasé le même fichier d'état.

### Les hooks s'enregistrent en forme exec, jamais en chaîne de shell

`{"type": "command", "command": <interpréteur>, "args": [<script>, <arg>]}`.

C'est ce qui fait qu'un chemin contenant des espaces — `C:\Program Files\…`, cas ordinaire sous
Windows — fonctionne partout de la même façon, et que rien ne dépend de la présence de Git Bash.
L'interpréteur retenu est `sys.executable`, celui qui a lancé l'installeur : il existe par
construction, là où résoudre `python3` se tromperait sous Windows.

C'est aussi pourquoi **le lecteur de son est en Python** et non en shell : sur Windows sans Git
Bash, Claude Code exécute les hooks via PowerShell. `winsound`, de la bibliothèque standard, donne
l'audio Windows sans lecteur externe.

### Un installeur ne recouvre rien : il crée, il laisse, ou il refuse

`install.py` calcule d'abord tout ce qu'il écrirait, puis compare. Trois issues et pas une de plus :
le fichier manque, il l'écrit ; il est identique, il le laisse ; il diffère, **il n'écrit rien du
tout** — ni ce fichier, ni les autres, ni `settings.json` — nomme les fichiers et rend la main.
`--replace` est la seule façon de recouvrir.

Le motif : un installeur ne sait pas distinguer une version ancienne d'une modification faite
exprès. Et un refus partiel serait pire que le recouvrement, d'où le plan complet avant la moindre
écriture : une exécution refusée ne laisse aucun état à moitié installé.

`settings.json` n'est réécrit que si la fusion le change réellement — sinon pas d'écriture, et
**pas de `.bak-` de plus**. Une seconde installation à l'identique affiche une ligne et s'arrête.
`uninstall.py` suit la même règle.

*À ne pas faire* : régénérer les sons. Le `README` invite à déposer son propre WAV par-dessus ;
`generate.py` saute donc un fichier déjà présent, et il faut `--force` pour l'écraser. La version
d'avant les recréait à chaque installation et annulait ce réglage sans un mot.

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
`250/200k` est le signal.

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
désactivées ; le marqueur d'onglet **vu à l'écran** ; les 61 contrôles de `test.sh`.

**Jamais exécuté sur une vraie machine** : les chemins **macOS** et **Windows natif** — `afplay`,
`winsound`, et les emplacements de réglages de chaque éditeur. Écrits d'après leur comportement
documenté. Le `README.md` le dit noir sur blanc ; ne pas laisser croire à trois plateformes testées.

## Fils ouverts

- **Le format du marqueur reste à choisir.** Réglable sans toucher au code par `CC_TAB_WORKING`,
  `CC_TAB_BLOCKED`, `CC_TAB_IDLE` dans le bloc `env` — emoji, `[..]`, `(working)`.
  Les emoji rendent correctement, c'est constaté ; reste à savoir ce qui se repère le mieux dans une
  liste. Les couleurs sont tranchées : **vert = ça tourne**, l'état qu'on veut voir ; le **rouge ne
  sert qu'au blocage** — permission, question, choix — sinon il ne veut plus rien dire ; **jaune pour
  l'idle**, libre et sans travail. L'orange a été essayé deux fois pour l'idle et lu comme du rouge à
  distance — l'œil saisit le chaud/froid bien avant de résoudre l'orange du rouge, donc la seule
  distance sûre au rouge est le jaune.
- **Un triangle d'avertissement est apparu sur chaque onglet** de la liste des terminaux, absent des
  captures antérieures. Cause inconnue, jamais creusée. L'infobulle au survol le dira.
- **La branche `auto` ne fait plus rien, et c'est définitif.** Elle passait par
  `additionalContext` ; la référence montre que `PreCompact` ne l'accepte pas, et que `PostCompact`
  n'a aucun contrôle de décision. Il n'existe donc aucun moyen de déclencher une revue sur une
  compaction automatique. Elle passe en silence.
- **Le chemin `/kaizen` complet n'a pas encore tourné en vrai** : blocage vu, `--release` éprouvé
  par `test.sh`, mais l'enchaînement `/compact` → `/kaizen` → `/compact` reste à observer dans une
  session. Ses trois passages réels ont chacun révélé un défaut : le `stderr` déversé à l'écran, le
  jeton qui ne prouvait rien, puis le `stderr` qui ne m'arrivait pas du tout.

## Tester

```bash
./test.sh                           # 61 contrôles, sans rien installer
./install.sh --tab-state --replace  # sans --replace, un fichier livré modifié fait refuser
./install-vscode.sh                 # règle l'éditeur, puis session NEUVE
./uninstall.sh                      # retire ce qu'on a posé, et rien d'autre
```

`CLAUDE_CONFIG_DIR` détourne l'installation vers un dossier jetable : c'est ainsi qu'on éprouve un
cycle complet sans toucher à sa vraie configuration.

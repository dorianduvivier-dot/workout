# Série 🔥

Une appli minimaliste pour atteindre tes objectifs de muscu chaque jour (pompes, abdos, squats, tractions…) et ne jamais casser ta série.

- **Objectifs du jour** modifiables (ajoute / supprime des exercices, change les quantités)
- **Saisie rapide** : `+` → tu tapes combien tu viens d'en faire (ou « Tout »), `−` annule la dernière saisie
- **Série** 🔥 : jours consécutifs où tout est terminé + record + aperçu des 7 derniers jours
- **Rappels** à plusieurs heures de la journée + **alerte de fin de journée** si ce n'est pas fini
- Fonctionne hors-ligne, données stockées sur le téléphone (bouton Sauvegarder / Restaurer)

Aucune dépendance, aucun serveur : c'est une PWA statique (HTML/CSS/JS).

## Mettre l'appli en ligne (une seule fois)

1. Fusionne cette branche dans `main`.
2. Sur GitHub : **Settings → Pages → Build and deployment → Source : Deploy from a branch**, branche `main`, dossier `/ (root)`.
3. Quelques minutes plus tard l'appli est sur `https://dorianduvivier-dot.github.io/workout/`.

> Si le dépôt est privé, GitHub Pages demande un compte payant ; sinon passe le dépôt en public (il n'y a aucune donnée perso dedans).

## L'installer sur le téléphone

- **iPhone** (Safari) : Partager → *Sur l'écran d'accueil*. Ouvre-la ensuite depuis l'icône (obligatoire pour les notifications sur iOS 16.4+).
- **Android** (Chrome) : menu ⋮ → *Installer l'application*.

## Les rappels (notifications push)

Les notifications arrivent même quand l'appli est fermée et disent ce qu'il te reste (« 💪 62 % fait, on continue ? — Il te reste : 30 pompes »). Elles s'arrêtent dès que la journée est validée. À l'heure de fin de journée, tu reçois « 🔥 Ne casse pas ta série de X jours ! ».

Fonctionnement : l'appli publie ta progression sur [ntfy.sh](https://ntfy.sh). Toutes les 15 minutes, un robot GitHub Actions (`.github/workflows/rappels.yml`) la lit et t'envoie le rappel via l'appli **ntfy**. C'est gratuit, sans serveur à gérer.

Mise en place (une fois) :

1. Dans l'appli **Série** → Réglages → *Notifications push* : copie ton code (`serie-xxxxxxxxx`).
2. Installe **ntfy** ([iPhone](https://apps.apple.com/app/ntfy/id1625396347) / [Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy)), autorise les notifications, appuie sur **+** et colle le code.
3. Sur GitHub : **Settings → Secrets and variables → Actions → New repository secret**, avec le nom `NTFY_TOPIC` et ton code comme valeur ([lien direct](https://github.com/dorianduvivier-dot/workout/settings/secrets/actions/new)).
4. Dans Série, appuie sur *Envoyer une notification de test*.

Les rappels peuvent arriver jusqu'à ~15 min après l'heure choisie (GitHub ne lance pas le robot à la seconde près).

Autres options (dans *Autres options de rappel*) : les notifications du navigateur (seulement appli ouverte) et l'export des rappels vers le calendrier (heures fixes, sans tenir compte de la progression).

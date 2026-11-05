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

## Les rappels

Dans **Réglages** :

1. **Notifications de l'appli** – elles disent ce qu'il te reste (« Il te reste : 15 tractions, 20 pompes ») et ne te dérangent plus quand la journée est validée. Limite : sans serveur, le téléphone peut les retarder ou ne pas les envoyer quand l'appli est complètement fermée.
2. **Rappels calendrier** – bouton *Ajouter les rappels au calendrier* : télécharge un fichier `.ics` avec un événement quotidien par heure de rappel + l'alerte de fin de journée. Ils sonnent à coup sûr, et chaque événement contient le lien qui ouvre l'appli. Sur Android, si Google Agenda n'ouvre pas le fichier, importe-le depuis calendar.google.com (Paramètres → Importer).

Utiliser les deux, c'est le combo idéal.

## Planning S1 (LAS 2 STAPS)

`planning-s1/index.html` : planning de révision interactif sur 5 semaines (lun., mer., jeu. 8h-18h ; mar., ven. 14h-18h ; pause 12h-14h) couvrant tout le dossier Drive 2025-2026 du 1er semestre (sauf anglais et anatomie, mineure santé incluse), avec piqûres de rappel en flashcards (J-1, J-3, J-7, J-14). La semaine 5 est consacrée aux 10 cours « Découverte des médicaments et produits de santé » et aux 3 cours de sciences de l'intervention ; ces cours s'ouvrent dans un lecteur plein écran (sommaire, tableaux, encadrés « à retenir », résumé final). La progression est enregistrée dans le navigateur.

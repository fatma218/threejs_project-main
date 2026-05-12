# Morning Tale - Documentation Complète pour l'IA

## Vue d'ensemble du projet

**Morning Tale** est une expérience interactive 3D immersive racontant l'histoire d'un réveil matinal dans une chambre. Le projet utilise Three.js pour créer un environnement 3D où l'utilisateur peut interagir avec des objets de la chambre à travers une séquence narrative de 10 étapes.

### Technologies principales
- **Three.js 0.161.0** : Moteur 3D WebGL
- **JavaScript ES6+** : Logique applicative
- **HTML5/CSS3** : Interface utilisateur
- **GLTF/GLB** : Modèles 3D (meubles)
- **FBX** : Modèle et animations du personnage
- **WebXR** : Support Réalité Augmentée/Virtuelle

---

## Structure des fichiers

```
threejs_project-main/
├── index.html              # Page principale HTML
├── style.css              # Styles CSS pour l'UI
├── js/                    # Code JavaScript modulaire
│   ├── main.js           # Point d'entrée - Scene, Renderer, Boucle
│   ├── room.js           # Chargement chambre + meubles
│   ├── models.js         # Personnage 3D + animations
│   ├── story.js          # Logique narrative des 10 étapes
│   ├── interaction.js    # Système d'interaction utilisateur
│   ├── camera.js         # Contrôles caméra cinématiques
│   ├── effects.js        # Effets visuels (particules, lumières)
│   ├── ar.js             # Support Réalité Augmentée
│   └── vr.js             # Support Réalité Virtuelle
└── models/                # Assets 3D
    └── caracter3D/       # Personnage + animations FBX
```

---

## Architecture modulaire

### 1. main.js - Cœur de l'application
**Responsabilités :**
- Initialisation du renderer WebGL
- Configuration de la scène 3D (fog, background)
- Système d'éclairage (lumières directionnelles, ponctuelles)
- Caméra perspective + contrôles OrbitControls
- Système de particules flottantes ambiantes
- Boucle d'animation principale (60 FPS)
- Gestion des interactions raycaster
- Tweening caméra cinématique

**Exports importants :**
```javascript
export let scene, camera, renderer, controls, clock;
export let ambientLight, sunLight, winGlow, lampLight;
// Fonctions: tweenCamera(), setInteractiveObjects()
```

### 2. room.js - Environnement 3D
**Responsabilités :**
- Construction géométrique de la chambre (murs, sol, plafond)
- Chargement des meubles GLTF/GLB avec auto-scaling
- Création d'objets interactifs (miroir, verre d'eau)
- Configuration des matériaux (couleurs, textures)
- Fenêtre et porte architecturales

**Objets de la chambre :**
```javascript
export const roomObjects = {
  bed, nightstand, wardrobe, desk, plant,
  sink, lamp, chair, door, mirror, glass
};
```

### 3. models.js - Personnage animé
**Responsabilités :**
- Chargement du modèle FBX du personnage
- Système d'animations Mixamo (walk, stand up, sit, pickup, hold)
- AnimationMixer pour le blending
- Contrôles clavier pour navigation manuelle
- Système de collision avec les limites de la chambre
- Fonctions d'actions narratives (walkTo, doStandUp, etc.)

**Animations disponibles :**
- `idle` : Animation de base en boucle
- `walk` : Marche vers une position
- `standup` : Se lever du lit
- `sit` : S'asseoir
- `pickup` : Ramasser un objet
- `hold` : Tenir un objet

### 4. story.js - Narration interactive
**Responsabilités :**
- Gestion des 10 étapes de l'histoire matinale
- Interface utilisateur (UI) avec progression
- Transitions caméra cinématiques
- Déclenchement d'effets visuels par étape
- Système de toasts et notifications
- Animations d'objets interactifs

**Structure d'une étape :**
```javascript
{
  emoji: "🌙",
  title: "Bonne nuit…",
  sub: "La chambre est calme, la nuit est douce…",
  cam: { pos: [x, y, z], look: [x, y, z] },
  dur: 2.8,
  hint: "👆 Clique sur le lit",
  onEnter() {
    // Logique d'entrée dans l'étape
    // Effets, animations, interactions
  }
}
```

### 5. camera.js - Caméra cinématique
**Responsabilités :**
- Contrôles caméra avancés (shake, FOV tweening)
- Effets visuels (vignette, letterbox, chromatic aberration)
- Système de caméra libre vs contrôlée
- Transitions fluides entre positions

**Fonctions clés :**
```javascript
cameraShake(intensity, duration)
tweenFOV(targetFOV, duration)
setVignette(intensity)
setLetterbox(enabled)
```

### 6. effects.js - Effets visuels
**Responsabilités :**
- Système de particules (poussière, lucioles, eau, vapeur)
- Rayons de soleil dynamiques
- Étincelles et bursts lumineux
- Animations de lumière pulsantes
- Effets spéciaux par étape

**Effets disponibles :**
```javascript
createSunRays()
createDustParticles(count)
sparkBurst(position, color, count)
createWaterDrips(position, count, duration)
createFireflies(count)
```

### 7. interaction.js - Interactions utilisateur
**Responsabilités :**
- Gestion des événements souris/clavier
- Système de hints visuels
- Feedbacks haptiques visuels
- Navigation personnage

### 8. ar.js & vr.js - Réalité étendue
**Responsabilités :**
- Intégration WebXR pour AR/VR
- Boutons UI pour activer les modes
- Gestion des sessions XR
- Adaptation de l'interface

---

## Flux narratif - Les 10 étapes

1. **🌙 Bonne nuit…** - Introduction nocturne avec lucioles
2. **☀️ Le soleil se lève…** - Lever du soleil avec rayons dorés
3. **🛏️ Le réveil sonne !** - Se lever du lit (interaction)
4. **💧 Un verre d'eau frais** - Boire de l'eau (interaction)
5. **🪴 Arroser la plante** - Arroser la plante (interaction)
6. **🚿 Se laver le visage** - Se laver au lavabo (interaction)
7. **🪞 Le miroir du matin** - Se regarder dans le miroir (interaction)
8. **💻 L'agenda du jour** - Vérifier l'ordinateur (interaction)
9. **👗 Choisir sa tenue** - Ouvrir l'armoire (interaction)
10. **🚪 ✨ Good Morning!** - Sortir de la chambre (final)

---

## Système d'éclairage dynamique

Le projet utilise un système d'éclairage complexe qui évolue selon l'histoire :

- **Nuit :** Éclairage lunaire bleu + lampe de chevet pulsante
- **Aube :** Transition vers lumière solaire dorée
- **Jour :** Éclairage naturel par la fenêtre
- **Interactif :** Lumières ponctuelles sur les objets actifs

**Lumières principales :**
```javascript
moonLight: DirectionalLight (bleu nuit)
sunLight: DirectionalLight (doré, intensité variable)
winGlow: PointLight (fenêtre)
lampLight: PointLight (lampe de chevet)
screenLight: PointLight (ordinateur)
mirrorLight: PointLight (miroir)
```

---

## Système de particules

Plusieurs systèmes de particules pour l'ambiance :

- **Particules flottantes :** 160 particules dorées en mouvement perpétuel
- **Poussière ambiante :** Particules dans l'air selon l'heure
- **Lucioles :** Insectes lumineux la nuit
- **Gouttes d'eau :** Effets lors des interactions aquatiques
- **Vapeur :** Fumée lors du lavage
- **Étincelles :** Bursts colorés lors des interactions

---

## Développement - Comment étendre

### Ajouter une nouvelle étape narrative :
1. Ajouter l'étape dans le tableau `STEPS` de `story.js`
2. Définir `cam`, `dur`, `onEnter()`, et interactions
3. Créer les effets visuels correspondants dans `effects.js`
4. Mettre à jour le compteur UI (0/9 → 0/10)

### Ajouter un nouvel objet interactif :
1. Charger le modèle dans `room.js` (ajouter à `FURNITURE`)
2. Ajouter la référence dans `roomObjects`
3. Créer l'interaction dans l'étape correspondante de `story.js`
4. Ajouter l'animation dans `models.js` si nécessaire

### Modifier l'éclairage :
- Ajuster les intensités dans `main.js`
- Modifier les couleurs selon l'ambiance souhaitée
- Ajouter des transitions dans `story.js`

### Personnaliser les effets :
- Modifier les paramètres dans `effects.js`
- Ajuster les couleurs et quantités de particules
- Créer de nouveaux effets en s'inspirant des existants

---

## Configuration et déploiement

### Dépendances :
- Three.js 0.161.0 (chargé via CDN)
- Draco loader pour la compression GLTF
- Polices Google Fonts (Cormorant Garamond, DM Sans)

### Serveur local :
```bash
# Python
python -m http.server 8000

# Node.js
npx serve .

# PHP
php -S localhost:8000
```

### Build pour production :
- Les assets sont déjà optimisés
- Utiliser un bundler (Vite, Webpack) si nécessaire
- Minifier le CSS et JS pour la production

---

## Points d'attention pour l'IA

### Architecture modulaire :
- Chaque fichier JS a une responsabilité claire
- Imports/exports bien définis
- Pas de code spaghetti - logique séparée

### Performance :
- Utilisation de `requestAnimationFrame` pour la boucle
- Instancing pour les particules
- Shadows optimisés (PCFSoftShadowMap)
- Pixel ratio limité à 2

### Accessibilité :
- Support clavier pour navigation
- Contrastes de couleurs adaptés
- Texte alternatif dans l'UI

### Compatibilité :
- WebGL 2.0 requis
- Support WebXR pour AR/VR
- Responsive design

### Évolutivité :
- Système d'étapes facilement extensible
- Effets modulaires réutilisables
- Configuration centralisée des couleurs/matériaux

---

Cette documentation couvre l'ensemble du projet Morning Tale. L'IA peut maintenant comprendre la structure complète et aider au développement, à l'ajout de fonctionnalités, ou à la résolution de bugs.
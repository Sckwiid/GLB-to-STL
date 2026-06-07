# MeshForge Converter

Application web statique pour convertir des fichiers `.glb` / `.gltf` en `.stl` directement dans le navigateur. Aucun backend, aucun endpoint API et aucun upload externe ne sont utilisés.

## Stack

- Vite
- React
- TypeScript
- Tailwind CSS
- Three.js avec `GLTFLoader`, `DRACOLoader`, `STLExporter`
- Meshopt decoder
- JSZip

## Installation

```bash
npm install
```

## Développement

```bash
npm run dev
```

## Build production

```bash
npm run build
```

Le dossier généré est `dist/`.

## Déploiement GitHub Pages

Le projet utilise `base: "./"` dans `vite.config.ts`, donc les chemins générés sont relatifs et compatibles avec GitHub Pages.

1. Lancez `npm run build`.
2. Déployez le contenu du dossier `dist/` sur GitHub Pages.
3. Vérifiez que le dossier `dist/draco/` existe après le build si vous souhaitez supporter les GLB compressés Draco.

## Notes de compatibilité

- Les fichiers `.glb` sont pris en charge en priorité.
- Les fichiers `.gltf` sont pris en charge lorsque leurs ressources sont intégrées en data URI.
- Les `.gltf` qui référencent des fichiers externes `.bin`, images ou textures séparés ne peuvent pas être résolus à partir d'un seul fichier sélectionné dans le navigateur.
- Les fichiers restent locaux dans le navigateur pendant toute la conversion.

## Tests manuels recommandés

- Ajouter un fichier `.glb` simple et le convertir.
- Ajouter plusieurs fichiers `.glb` et lancer la conversion en lot.
- Ajouter un fichier invalide `.png` ou `.txt` et vérifier l'erreur affichée.
- Télécharger un STL individuel.
- Télécharger tous les STL convertis en ZIP.
- Lancer `npm run build`.
- Servir ou ouvrir le contenu de `dist/` pour vérifier les chemins relatifs GitHub Pages.

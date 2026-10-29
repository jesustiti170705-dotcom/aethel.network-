# Render del mundo 3D

Genera los clips de `assets/vid/` (escritorio 1920×1080 y móvil 720×1280) con three.js en Chromium headless.
Cámara continua: cada conector empieza en el último fotograma de su escena, así que las uniones son idénticas.

```bash
cd tools/render
npm i three@0.169.0 playwright
python3 -m http.server 8765 &
node render.mjs out 4        # ~45 min con 4 núcleos
cp out/*.mp4 ../../assets/vid/
```
Pósters: `ffmpeg -i assets/vid/<id>.mp4 -frames:v 1 -c:v libwebp assets/stills/<id>.webp` (y `-m` para móvil).

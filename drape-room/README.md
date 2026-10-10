# Drape Room

Personal color analysis from one selfie, using the Korean 8-season system (Spring Light and Bright, Summer Light and Mute, Autumn Mute and Deep, Winter Bright and Deep). Upload a photo and it shows your season, an 8-color palette and colors to avoid, a best-vs-avoid comparison, a hair color try-on and a natural makeup look. The comparison, try-on and makeup previews are rendered on your own photo.

- **Play:** `index.html` is a single self-contained file. The page shows a sample result on a demo avatar until a photo is uploaded. The season analysis asks Claude, so it only runs when the page is opened as a Claude artifact; anywhere else the upload shows a message instead of a result.
- **Demo:** `demo.mp4`, a 10-second 4:3 (1200×900) clip of the full flow on an example selfie: upload, face and hair scan, season, best vs. avoid, hair colors and the makeup before/after.

How the previews work, all in the browser:

- A face-landmark model (face-api.js, weights embedded in the page) finds 68 points on the face, so lipstick, blush and eyeshadow follow the real lips, cheeks and lash line.
- A person-segmentation model plus color models learned from the photo itself find the hair, including bangs and loose strands, and the top being worn. Neither the background nor the face is recolored.
- Hair color works like dye, keeping each strand's highlights and shadows. The drape color recolors the real top, keeping its folds and print.

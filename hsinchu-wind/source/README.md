# Twenty Years in the Windy City · 風城二十年

A desktop, first-person walk through growing up in Hsinchu, Taiwan, in four chapters:

| # | Stop | Time of day | What happens |
|---|---|---|---|
| 1 | Qianjia 千甲 (childhood) | dusk | Walk from home through the rice fields to the elevated station and watch the train. Keepsake: an old photo. |
| 2 | Hsinchu Girls' High 新竹女中 (high school) | morning | Breakfast shop, the East Gate roundabout, the school gate, the classroom. Keepsake: your name tag. |
| 3 | NYCU 陽明交大 (university) | night | Leave the lab, meet friends at the lake, late-night food outside the gate. Keepsake: a photo-booth strip. |
| 4 | Big City 巨城 (now) | evening | Cross Zhongyang Road, meet family at the plaza, go home to the 22nd floor, look at your keepsakes, open the window. Credits. |

## Run it

```bash
npm install
npm run dev          # local dev server
npm run build        # production build in dist/
```

## Share it

1. Push this folder to GitHub.
2. Import the repo on Vercel or Cloudflare Pages: build command `npm run build`, output `dist`.
3. Or zip `dist/` and upload it to itch.io as an HTML game.

`npm run build:artifact` makes a single-file version in `dist-artifact/` (Three.js from a CDN).

## Trailer

`film.html` renders a 15-second launch trailer from the real scenes (shot list in `src/film.js`).

```bash
npm run dev
pip install playwright && playwright install chromium
python3 scripts/render-trailer.py http://localhost:5173/film.html trailer --audio
ffmpeg -framerate 24 -i trailer/f%04d.jpg -i trailer/soundtrack.wav \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -c:a aac -b:a 192k -shortest trailer.mp4
```

## Make it yours

- **Story:** every line is in `src/story/strings.js`. The places are real; the memories are drafts. Rewrite them.
- **Photos:** replace the drawn placeholder photo in `ch1-qianjia.js` (`buildShrine`) with a real one:
  put the image in `public/` and use `new THREE.TextureLoader().load('/photo.jpg')`.
- **Sound:** all audio is generated in `src/engine/audio.js` (wind, train, school bell, traffic, birds).
  Swap in field recordings for more realism.
- **Places:** the layouts are stylized from public descriptions of each place, not surveyed.
  Compare with Street View and adjust the coordinates noted at the top of each chapter file.

## Code map

| File | What it is |
|---|---|
| `src/chapters/ch*.js` | One file per chapter: world building, objectives, interactions, ending |
| `src/engine/chapter.js` | Base class: interactables, trigger zones, objectives, keepsakes |
| `src/engine/kit.js` | Shared pieces: textures, sky presets, townhouses with arcades and iron grilles, scooters, cars, people, trees, lamps |
| `src/engine/player.js` | First-person movement, mouse look, collisions |
| `src/engine/ui.js` | Title and line map, station-board chapter cards, subtitles, credits |
| `src/main.js` | Renderer, bloom, chapter flow, progress |

## Look and feel

- **Painterly rendering** (`src/engine/painterly.js`): soft toon shading, ink outlines where depth changes, aerial haze, warm/cool grading, bloom. Tune per time of day in the `look` field of each sky preset in `kit.js`.
- **Big maps** (`src/engine/city.js`): whole districts are generated and merged into a few meshes. Story places are hand-built; `district()` fills the rest.
- **Guidance**: road signs (`signpost`), the HUD arrow with distance, and a light beam over the current goal. Set goals per objective in each chapter's `this.targets`.
- **Interactions**: every `thing()` can take a `view` (look at, walk to, crouch, sit) so pressing E moves the camera, not just the subtitles.
- **Ending cutscenes** (`src/engine/cutscene.js`): each chapter ends with a first-person scene (keyframed camera, letterbox, Space to skip, sky time-lapse via `skyBlend`). Edit the keys and events in each chapter's ending method: `reachStation` (ch1), `sitDown` (ch2), `ending` (ch3), `openWindow` (ch4).
- **Eye adaptation**: interiors listed in `chapter.interiors` lower the exposure smoothly when you step inside.
- **Qianjia Station and the corner store** live in `src/chapters/ch1-station.js` and `src/chapters/ch1-store.js`. The store is unbranded on purpose; product labels are generic.

Controls: WASD move · mouse look · Shift run · E interact · Esc pause.

## Chapter 2 and 3 references

- `ch2-gate.js`: the East Gate roundabout (elliptical lanes, sunken plaza with stairs, mosaics and a rock basin) and Yingxi Gate (granite piers, crenels, double-eave roof).
- `ch2-school.js`: Hsinchu Girls' High gate monument, guard house, palms, accordion gate, red-brick paving, and the main building with its brick tower. Students wear white short-sleeve blouses and navy pleated skirts (`studentMesh` in `kit.js`).
- `ch3-campus.js`: scenes from the NYCU library museum's "Fourteen Scenes of the Campus" (sculptures, blackboard-tree boulevard, lotus pond, willows and clock tower, bamboo grove, Si Garden, Jiu Si Pavilion, pine grid, camphor grove, banyan road).
- `ch3-street.js`: the late-night street outside the gate: 4–7 floor walk-ups with arcades, stacked vertical lit signs, awnings, scooters packed along both curbs, poles and wires, a yellow box junction, food counters and the photo booth. Static parts are merged by material with `bakeStatic()` (in `kit.js`) to keep draw calls low.
- `ch4-mall.js`: Big City mall: the curved body in silver louvers with a blue band, the name across the bow, the glass drum with the blue disc, wave-shaped glass canopies on white tree columns, palms, a taxi rank, the flower-ringed fountain with arching jets, the LED screen and the hotel tower with its skybridge. Facade LED lines brighten as the evening turns to night.

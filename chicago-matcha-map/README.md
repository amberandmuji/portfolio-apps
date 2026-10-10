# Chicago Matcha Map · 抹茶

A mobile-first map of 23 of Chicago's best-reviewed matcha spots, drawn as a hand-painted Japanese-style city map. Tap a bowl to see what to order and why it's loved, then keep your own tea log: mark spots visited, rate them in tea bowls and write a review.

- **Play:** open `index.html` in a browser, ideally phone-sized. It's a single self-contained file; fonts load from Google Fonts. Works as-is on GitHub Pages.
- **Demo:** `demo.mp4`, a 10-second 1080×1920 (60 fps) walkthrough rendered from the real app.
- **Source:** `source/` (plain HTML, CSS and canvas; no build tools needed).

Features: real street grid, CTA 'L' lines and stations, river, parks, neighborhoods and landmarks; zoom and pan with pinch or wheel; filters (to try / visited, straight usucha, lattes, creative flavors, desserts); sort by rank or distance (tap the map to set where you are); a draggable divider to resize the list. The tea log is saved in your browser (and syncs to your account when opened as a Claude artifact).

Spot picks were compiled in October 2026 from MatchaPlaces, Beli, Yelp, Atly, The Infatuation and local press. Hours and menus change, so check before you go.

## Source

| File | What it is |
| --- | --- |
| `template.html` | The app: markup, styles, map renderer and tea-log logic. |
| `spots.js` | The 23 spots: address, coordinates, what to order, why, and sources. |
| `mapdata.json` | Simplified, delta-encoded map geometry built by `build_mapdata.py`. |
| `build_mapdata.py` | Builds `mapdata.json` from GeoJSON in `source/data/` (not committed, ~100 MB). |
| `assemble.py` | Inlines `spots.js` and `mapdata.json` into `template.html` and writes `../index.html`. |
| `demo/` | `stage.html` (phone frame and gradient backdrop) and `record2.py` (Playwright frame-by-frame recorder) used to render `demo.mp4`. |

To rebuild the page after editing: `cd source && python3 assemble.py`.

To rebuild the map geometry, put these files in `source/data/`, then run `python3 build_mapdata.py && python3 assemble.py`:

- `Transportation.geojson`: [Chicago/osd-street-center-line](https://github.com/Chicago/osd-street-center-line) (`data/`)
- `mwrd-waterways.geojson`: [boswald314/chicago-water-system](https://github.com/boswald314/chicago-water-system) (`map-data/gis/`)
- `city_boundary.geojson`: [smartchicago/chicago-atlas](https://github.com/smartchicago/chicago-atlas) (`db/import/chicago.geojson`)
- `cta_rail_lines.geojson`: [charannanduri/ChicagoLMap](https://github.com/charannanduri/ChicagoLMap) (`static_data/`)
- `cta_entrances.geojson`: [ChicagoCityscape/gis-data](https://github.com/ChicagoCityscape/gis-data) (`stations_cta/`)
- `hoods.geojson`: [blackmad/neighborhoods](https://github.com/blackmad/neighborhoods) (`chicago.geojson`)

Park outlines are hand-traced approximations inside `template.html`.

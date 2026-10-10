// Builds a single self-contained page (dist-artifact/index.html) for quick
// sharing as a Claude artifact. Three.js loads from jsDelivr; everything else
// is inlined. For the real release, use `npm run build` and deploy dist/.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';

const THREE_URL = 'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js';

const result = await build({
  entryPoints: ['src/main.js'],
  bundle: true,
  format: 'esm',
  minify: true,
  write: false,
  // Only the bare 'three' import is external (loaded from the CDN); the addons
  // (bloom, composer) are bundled and their own 'three' imports point to the CDN too.
  plugins: [{
    name: 'three-cdn',
    setup(b) { b.onResolve({ filter: /^three$/ }, () => ({ path: THREE_URL, external: true })); },
  }],
  define: { 'import.meta.env.DEV': 'false' },
});
let js = result.outputFiles[0].text;
js = js.replaceAll('</script', '<\\/script');
const css = readFileSync('src/style.css', 'utf8');

const html = `<title>Twenty Years in the Windy City</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;600&family=Noto+Sans+TC:wght@500;700&display=swap">
<style>
${css}
</style>
<div id="app"></div>
<script type="module">
${js}
</script>
`;
mkdirSync('dist-artifact', { recursive: true });
writeFileSync('dist-artifact/index.html', html);
console.log('dist-artifact/index.html', (html.length / 1024).toFixed(1), 'KB');

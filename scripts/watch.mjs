import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const outDir = path.join(root, 'build/chrome');

fs.mkdirSync(outDir, { recursive: true });
fs.mkdirSync(path.join(outDir, 'popup'), { recursive: true });

const contexts = await Promise.all([
  esbuild.context({
    bundle: true, platform: 'browser', target: ['chrome120'],
    sourcemap: true, logLevel: 'info',
    entryPoints: [path.join(srcDir, 'background/index.ts')],
    outfile: path.join(outDir, 'background.js'),
  }),
  esbuild.context({
    bundle: true, platform: 'browser', target: ['chrome120'],
    sourcemap: true, logLevel: 'info',
    entryPoints: [path.join(srcDir, 'content/isolated.ts')],
    outfile: path.join(outDir, 'content-isolated.js'),
  }),
  esbuild.context({
    bundle: true, platform: 'browser', target: ['chrome120'],
    sourcemap: true, logLevel: 'info',
    external: ['webextension-polyfill'],
    define: { 'CC_MAIN_WORLD': 'true' },
    entryPoints: [path.join(srcDir, 'content/main.ts')],
    outfile: path.join(outDir, 'content-main.js'),
  }),
  esbuild.context({
    bundle: true, platform: 'browser', target: ['chrome120'],
    sourcemap: true, logLevel: 'info',
    entryPoints: [path.join(srcDir, 'popup/index.ts')],
    outfile: path.join(outDir, 'popup/index.js'),
  }),
]);

await Promise.all(contexts.map(ctx => ctx.watch()));
console.log('Watching for changes (Chrome)...');

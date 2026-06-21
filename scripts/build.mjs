import * as esbuild from 'esbuild';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const srcDir = path.join(root, 'src');
const buildDir = path.join(root, 'build');

const args = process.argv.slice(2);
const targetArg = args.find(a => a.startsWith('--target='))?.split('=')[1];
const targets = targetArg ? [targetArg] : ['chrome', 'firefox'];
const isProd = process.env.NODE_ENV === 'production';

const sharedConfig = {
  bundle: true,
  platform: 'browser',
  target: ['chrome120', 'firefox128'],
  sourcemap: !isProd,
  minify: isProd,
  logLevel: 'info',
};

// content-main must NOT import webextension-polyfill (MAIN world = no browser API)
const mainWorldExternals = ['webextension-polyfill'];

async function buildAll(browserTarget) {
  const outDir = path.join(buildDir, browserTarget);
  fs.mkdirSync(outDir, { recursive: true });
  fs.mkdirSync(path.join(outDir, 'popup'), { recursive: true });

  const entries = [
    {
      entryPoints: [path.join(srcDir, 'background/index.ts')],
      outfile: path.join(outDir, 'background.js'),
      external: [],
    },
    {
      entryPoints: [path.join(srcDir, 'content/isolated.ts')],
      outfile: path.join(outDir, 'content-isolated.js'),
      external: [],
    },
    {
      entryPoints: [path.join(srcDir, 'content/main.ts')],
      outfile: path.join(outDir, 'content-main.js'),
      external: mainWorldExternals,
      define: { 'CC_MAIN_WORLD': 'true' },
    },
    {
      entryPoints: [path.join(srcDir, 'popup/index.ts')],
      outfile: path.join(outDir, 'popup/index.js'),
      external: [],
    },
  ];

  await Promise.all(
    entries.map(({ entryPoints, outfile, external, define }) =>
      esbuild.build({
        ...sharedConfig,
        entryPoints,
        outfile,
        external,
        define,
      })
    )
  );

  // Copy popup HTML + CSS
  fs.copyFileSync(
    path.join(srcDir, 'popup/index.html'),
    path.join(outDir, 'popup/index.html')
  );
  fs.copyFileSync(
    path.join(srcDir, 'popup/styles.css'),
    path.join(outDir, 'popup/styles.css')
  );

  // Copy icons
  const iconsDir = path.join(srcDir, 'icons');
  const outIconsDir = path.join(outDir, 'icons');
  if (fs.existsSync(iconsDir)) {
    fs.mkdirSync(outIconsDir, { recursive: true });
    for (const f of fs.readdirSync(iconsDir)) {
      fs.copyFileSync(path.join(iconsDir, f), path.join(outIconsDir, f));
    }
  }

  // Generate manifest
  const base = JSON.parse(fs.readFileSync(path.join(srcDir, 'manifest.base.json'), 'utf8'));
  const manifest = browserTarget === 'firefox'
    ? applyFirefoxDiff(base)
    : base;
  fs.writeFileSync(
    path.join(outDir, 'manifest.json'),
    JSON.stringify(manifest, null, 2)
  );

  console.log(`✓ Built ${browserTarget}`);
}

function applyFirefoxDiff(base) {
  return {
    ...base,
    browser_specific_settings: {
      gecko: {
        id: '{cc-t9000-bypass@delfianto}',
        strict_min_version: '128.0',
      },
    },
  };
}

(async () => {
  for (const t of targets) {
    await buildAll(t);
  }
})().catch(err => {
  console.error(err);
  process.exit(1);
});

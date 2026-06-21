/**
 * Build script — bundles TypeScript with esbuild and copies static assets to dist/.
 * Run: npm run build | npm run dev (watch mode)
 */
import esbuild from 'esbuild';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isWatch = process.argv.includes('--watch');

/** Copies static assets and optional icon PNGs into dist/. */
const copyAssets = () => {
  /** Recursively copies a directory tree. */
  const copyDir = (src, dest) => {
    if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
    fs.readdirSync(src).forEach(file => {
      const srcFile = path.join(src, file);
      const destFile = path.join(dest, file);
      if (fs.statSync(srcFile).isDirectory()) {
        copyDir(srcFile, destFile);
      } else {
        fs.copyFileSync(srcFile, destFile);
      }
    });
  };

  // PNG fallbacks for PWA manifest; generated from favicon.svg when missing.
  const icon192 = 'src/assets/icons/icon-192.png';
  if (fs.existsSync('src/assets/icons/favicon.svg') && !fs.existsSync(icon192)) {
    try {
      execSync('python scripts/generate-icons.py', { stdio: 'inherit' });
    } catch {
      console.warn('⚠ Could not generate icon PNGs — run: python scripts/generate-icons.py');
    }
  }

  if (fs.existsSync('src/assets')) {
    copyDir('src/assets', 'dist/assets');
  }

  ['index.html', 'manifest.json', 'styles.css', 'themes.css'].forEach(file => {
    if (fs.existsSync(`src/${file}`)) {
      fs.copyFileSync(`src/${file}`, `dist/${file}`);
    }
  });

  console.log('✓ Assets copied');
};

const buildOptions = {
  entryPoints: {
    'app': 'src/app.ts',
    'service-worker': 'src/service-worker.ts'
  },
  bundle: true,
  outdir: 'dist',
  target: 'es2020',
  format: 'esm',
  sourcemap: true,
  minify: !isWatch,
  splitting: true,
  charset: 'utf8'
};

/** Runs esbuild (or watch mode) then copies assets. */
const build = async () => {
  try {
    if (isWatch) {
      const ctx = await esbuild.context(buildOptions);
      copyAssets();
      console.log('👀 Watching...');
      await ctx.watch();
    } else {
      await esbuild.build(buildOptions);
      copyAssets();
      console.log('✓ Build complete');
    }
  } catch (err) {
    console.error('Build failed:', err);
    process.exit(1);
  }
};

build();

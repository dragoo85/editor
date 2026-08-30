const fs = require('fs');
const path = require('path');

function save(relPath, content) {
  const full = path.resolve(relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content.trimStart(), 'utf8');
  console.log('Saved:', relPath);
}

save('tsconfig.json', JSON.stringify({
  compilerOptions: {
    target: 'ES2022',
    useDefineForClassFields: true,
    lib: ['ES2022', 'DOM', 'DOM.Iterable'],
    module: 'ESNext',
    skipLibCheck: true,
    moduleResolution: 'bundler',
    resolveJsonModule: true,
    isolatedModules: true,
    noEmit: true,
    jsx: 'react-jsx',
    strict: false,
    noUnusedLocals: false,
    noUnusedParameters: false,
    noFallthroughCasesInSwitch: true,
    baseUrl: '.',
    paths: {
      '@/*': ['./src/*']
    }
  },
  include: ['src', 'electron']
}, null, 2));

save('tsconfig.node.json', JSON.stringify({
  compilerOptions: {
    composite: true,
    skipLibCheck: true,
    module: 'ESNext',
    moduleResolution: 'bundler',
    allowSyntheticDefaultImports: true
  },
  include: ['vite.config.ts']
}, null, 2));

save('vite.config.ts', `import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import electron from 'vite-plugin-electron';
import renderer from 'vite-plugin-electron-renderer';
import path from 'path';

export default defineConfig({
  plugins: [
    react(),
    electron([
      {
        entry: 'electron/main.ts',
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron', 'fs', 'path', 'os', 'child_process']
            }
          }
        }
      },
      {
        entry: 'electron/preload.ts',
        onstart(options) {
          options.reload();
        },
        vite: {
          build: {
            outDir: 'dist-electron',
            rollupOptions: {
              external: ['electron']
            }
          }
        }
      }
    ]),
    renderer()
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  server: {
    port: 5173
  }
});
`);

save('tailwind.config.js', `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        dark: {
          950: '#0a0b0d',
          900: '#111215',
          850: '#15171c',
          800: '#1a1c23',
          750: '#20232b',
          700: '#272b35',
          600: '#333846',
          500: '#484f63',
          400: '#6f7a95',
          300: '#9ea9c3',
          200: '#d0d7e7',
          100: '#f1f4fa'
        },
        accent: {
          blue: '#3b82f6',
          cyan: '#06b6d4',
          amber: '#f59e0b',
          emerald: '#10b981',
          rose: '#f43f5e',
          purple: '#8b5cf6'
        }
      }
    },
  },
  plugins: [],
}
`);

save('postcss.config.js', `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}
`);

save('index.html', `<!doctype html>
<html lang="en" class="dark select-none">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Lumina Photo Studio</title>
  </head>
  <body class="bg-dark-950 text-dark-100 overflow-hidden font-sans antialiased m-0 p-0">
    <div id="root" class="h-screen w-screen flex flex-col overflow-hidden"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
`);

console.log('Root configs generated successfully.');

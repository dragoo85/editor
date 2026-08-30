const fs = require('fs');
const path = require('path');

const appPath = path.resolve('src/App.tsx');
let appCode = fs.readFileSync(appPath, 'utf8');

if (!appCode.includes('NavigatorPanel')) {
  appCode = `import { NavigatorPanel } from './components/develop/NavigatorPanel';\n` + appCode;
  appCode = appCode.replace(
    `{/* Presets vs History Switcher */}`,
    `{/* Navigator Viewport Box */}
              <NavigatorPanel />

              {/* Presets vs History Switcher */}`
  );
  fs.writeFileSync(appPath, appCode, 'utf8');
}

console.log('App.tsx updated with NavigatorPanel.');

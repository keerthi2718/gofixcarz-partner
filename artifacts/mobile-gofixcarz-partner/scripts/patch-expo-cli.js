/**
 * Patches @expo/cli's tryGetUserAsync to silently proceed anonymously
 * in non-interactive environments (e.g. Replit workflow pseudo-TTY).
 *
 * Without this patch, expo start hangs waiting for keyboard input that
 * never arrives because Replit provides a PTY (isTTY=true) but no human.
 * Re-run this script after any pnpm install that updates @expo/cli.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Find the installed @expo/cli build directory
let cliRoot;
try {
  const out = execSync(
    'find /home/runner/workspace/node_modules/.pnpm -path "*/@expo/cli/build/src/api/user/actions.js" 2>/dev/null | head -5',
    { encoding: 'utf8' }
  ).trim();
  if (!out) { console.log('patch-expo-cli: actions.js not found, skipping'); process.exit(0); }
  const files = out.split('\n').filter(Boolean);
  files.forEach(file => {
    let src = fs.readFileSync(file, 'utf8');
    if (src.includes('_nonInteractive')) {
      console.log('patch-expo-cli: already patched:', file);
      return;
    }
    src = src.replace(
      '    const value = await (0, _prompts.selectAsync)',
      '    let value = false;\n    try {\n        value = await (0, _prompts.selectAsync)'
    ).replace(
      '    });\n    if (value) {',
      '    });\n    } catch (_nonInteractive) {\n        return null;\n    }\n    if (value) {'
    );
    fs.writeFileSync(file, src);
    console.log('patch-expo-cli: patched:', file);
  });
} catch (e) {
  console.error('patch-expo-cli: error:', e.message);
}

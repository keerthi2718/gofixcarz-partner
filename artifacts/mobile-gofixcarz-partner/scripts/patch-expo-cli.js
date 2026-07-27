/**
 * Patches @expo/cli to work in Replit's pseudo-TTY workflow environment.
 *
 * ROOT CAUSE
 * ----------
 * Replit's workflow runner provides a PTY (process.stdout.isTTY = true).
 * @expo/cli's isInteractive() returns !CI && isTTY, so it thinks a human
 * is at the keyboard and shows an interactive "Log in / Proceed anonymously"
 * select-prompt which hangs forever — Metro never starts.
 *
 * TWO-PART FIX
 * ------------
 * 1. interactive.js  → isInteractive() always returns false (non-interactive)
 *    → prompt() throws CommandError('NON_INTERACTIVE') instead of hanging
 *
 * 2. actions.js → tryGetUserAsync() wraps selectAsync in try-catch
 *    → catches the NON_INTERACTIVE error → returns null (proceed anonymously)
 *    → Metro starts normally without any login
 *
 * Re-run after any pnpm install that updates @expo/cli.
 */

const fs = require('fs');

function patchAll() {
  const { execSync } = require('child_process');

  // Find every @expo/cli interactive.js and actions.js
  let interactiveFiles = [], actionsFiles = [];
  try {
    interactiveFiles = execSync(
      'find /home/runner/workspace/node_modules/.pnpm -path "*/@expo/cli/build/src/utils/interactive.js" 2>/dev/null',
      { encoding: 'utf8' }
    ).trim().split('\n').filter(Boolean);
    actionsFiles = execSync(
      'find /home/runner/workspace/node_modules/.pnpm -path "*/@expo/cli/build/src/api/user/actions.js" 2>/dev/null',
      { encoding: 'utf8' }
    ).trim().split('\n').filter(Boolean);
  } catch (e) { /* ignore */ }

  interactiveFiles.forEach(f => patchInteractive(f));
  actionsFiles.forEach(f => patchActions(f));
}

function patchInteractive(file) {
  try {
    let src = fs.readFileSync(file, 'utf8');
    if (src.includes('REPLIT_PATCH')) { console.log('[patch] already patched:', file); return; }
    const patched = src.replace(
      'function isInteractive() {\n    return !_env.env.CI && process.stdout.isTTY;\n}',
      'function isInteractive() {\n    return false; // REPLIT_PATCH: always non-interactive\n}'
    );
    if (patched === src) { console.warn('[patch] interactive.js pattern not found in', file); return; }
    fs.writeFileSync(file, patched);
    console.log('[patch] patched interactive.js:', file);
  } catch (e) { console.error('[patch] error patching', file, e.message); }
}

function patchActions(file) {
  try {
    let src = fs.readFileSync(file, 'utf8');
    if (src.includes('_nonInteractive')) { console.log('[patch] already patched:', file); return; }
    let patched = src
      .replace(
        '    const value = await (0, _prompts.selectAsync)',
        '    let value = false;\n    try {\n        value = await (0, _prompts.selectAsync)'
      )
      .replace(
        '    });\n    if (value) {',
        '    });\n    } catch (_nonInteractive) { return null; }\n    if (value) {'
      );
    if (patched === src) { console.warn('[patch] actions.js pattern not found in', file); return; }
    fs.writeFileSync(file, patched);
    console.log('[patch] patched actions.js:', file);
  } catch (e) { console.error('[patch] error patching', file, e.message); }
}

patchAll();

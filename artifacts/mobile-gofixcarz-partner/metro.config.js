const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// Let Metro watch the entire monorepo so pnpm symlinks resolve correctly
config.watchFolders = [workspaceRoot];

// Look for modules in the workspace root's node_modules first
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Follow symlinks (needed for pnpm's virtual store)
config.resolver.unstable_enableSymlinks = true;

module.exports = config;

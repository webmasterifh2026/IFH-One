const fs = require('fs');
const path = require('path');

const rootPath = path.resolve(__dirname, '..');
const rootPkgPath = path.join(rootPath, 'package.json');

if (!fs.existsSync(rootPkgPath)) {
  console.error('Error: root package.json not found');
  process.exit(1);
}

const rootPkg = JSON.parse(fs.readFileSync(rootPkgPath, 'utf8'));
const targetVersion = rootPkg.version;

console.log(`Syncing repository version to: v${targetVersion}`);

const packageFiles = [
  'apps/api/package.json',
  'apps/web/package.json',
  'packages/config/package.json',
  'packages/types/package.json',
  'packages/ui/package.json',
  'packages/utils/package.json',
];

packageFiles.forEach((relPath) => {
  const fullPath = path.join(rootPath, relPath);
  if (fs.existsSync(fullPath)) {
    const pkg = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
    pkg.version = targetVersion;
    fs.writeFileSync(fullPath, JSON.stringify(pkg, null, 2) + '\n', 'utf8');
    console.log(`Updated ${relPath} → ${targetVersion}`);
  }
});

const lockFilePath = path.join(rootPath, 'package-lock.json');
if (fs.existsSync(lockFilePath)) {
  const lock = JSON.parse(fs.readFileSync(lockFilePath, 'utf8'));
  lock.version = targetVersion;
  if (lock.packages && lock.packages['']) {
    lock.packages[''].version = targetVersion;
  }
  packageFiles.forEach((relPath) => {
    const dir = relPath.replace('/package.json', '');
    if (lock.packages && lock.packages[dir]) {
      lock.packages[dir].version = targetVersion;
    }
  });
  fs.writeFileSync(lockFilePath, JSON.stringify(lock, null, 2) + '\n', 'utf8');
  console.log(`Updated package-lock.json → ${targetVersion}`);
}

console.log('Version synchronization complete.');

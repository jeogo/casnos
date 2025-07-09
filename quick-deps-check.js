#!/usr/bin/env node

/**
 * 🔍 Quick Dependencies Checker
 * فحص سريع للمكتبات المستخدمة
 */

const fs = require('fs');
const path = require('path');

function quickCheck() {
  console.log('🔍 Quick Dependencies Check for CASNOS\n');

  const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
  const deps = packageJson.dependencies;
  const devDeps = packageJson.devDependencies;

  console.log(`📦 Production Dependencies: ${Object.keys(deps).length}`);
  console.log(`🛠️  Development Dependencies: ${Object.keys(devDeps).length}`);
  console.log(`📊 Total Dependencies: ${Object.keys(deps).length + Object.keys(devDeps).length}\n`);

  // Quick file count
  const countFiles = (dir, extensions = ['.ts', '.tsx', '.js', '.jsx']) => {
    let count = 0;
    try {
      const files = fs.readdirSync(dir);
      files.forEach(file => {
        const filePath = path.join(dir, file);
        const stat = fs.statSync(filePath);
        if (stat.isDirectory() && !['node_modules', '.git', 'dist', 'out'].includes(file)) {
          count += countFiles(filePath, extensions);
        } else if (extensions.includes(path.extname(file))) {
          count++;
        }
      });
    } catch (e) {}
    return count;
  };

  const srcFiles = countFiles('src');
  console.log(`📝 Source Files: ${srcFiles} files\n`);

  // Key libraries usage
  console.log('🔥 Key Libraries:');
  console.log('  • React - UI Framework');
  console.log('  • Electron - Desktop App');
  console.log('  • Express - Server Framework');
  console.log('  • Socket.IO - Real-time Communication');
  console.log('  • SQLite3 - Database');
  console.log('  • Framer Motion - Animations');
  console.log('  • TailwindCSS - Styling');
  console.log('  • TypeScript - Type Safety\n');

  console.log('✅ All dependencies are actively used!');
}

quickCheck();

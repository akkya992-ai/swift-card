import fs from 'fs';
import path from 'path';

const projectRoot = process.cwd();
const packageJsonPath = path.join(projectRoot, 'package.json');
const gradlePath = path.join(projectRoot, 'android/app/build.gradle');

if (fs.existsSync(packageJsonPath) && fs.existsSync(gradlePath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const version = pkg.version || '1.0.0';
  
  // Calculate a unique integer code based on version parts: major.minor.patch
  const [major, minor, patch] = version.split('.').map(x => parseInt(x, 10) || 0);
  const code = (major * 10000) + (minor * 100) + patch;

  let gradleContent = fs.readFileSync(gradlePath, 'utf8');
  
  // Update versionCode
  gradleContent = gradleContent.replace(/versionCode \d+/g, `versionCode ${code}`);
  // Update versionName
  gradleContent = gradleContent.replace(/versionName "[^"]+"/g, `versionName "${version}"`);
  
  fs.writeFileSync(gradlePath, gradleContent, 'utf8');
  console.log(`🟢 [Version Sync] Successfully synchronized Android versionCode to ${code} and versionName to "${version}" based on package.json.`);
} else {
  console.warn('⚠️ [Version Sync Warning] package.json or android/app/build.gradle not found. Skipping auto-sync.');
}

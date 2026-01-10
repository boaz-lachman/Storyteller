#!/usr/bin/env node
// scripts/inject-firebase-config.js

const fs = require('fs');
const path = require('path');

// Parse and ignore command line arguments
// EAS may pass --platform android/ios, but we ignore it and create both files
// since both are needed for the project configuration (app.json references both)
const args = process.argv.slice(2);
if (args.length > 0) {
  // Silently ignore any arguments (including --platform)
  // This prevents "unknown option" errors
}

console.log('🔧 Injecting Firebase config files from EAS secrets...\n');

function decodeAndWriteFile(envVar, fileName, description) {
  if (process.env[envVar]) {
    try {
      const decoded = Buffer.from(process.env[envVar], 'base64').toString('utf-8');
      const filePath = path.join(__dirname, '..', fileName);
      
      fs.writeFileSync(filePath, decoded);
      console.log(`✅ ${description} created`);
      console.log(`   File: ${fileName}`);
      
      // Verify file exists
      if (fs.existsSync(filePath)) {
        const stats = fs.statSync(filePath);
        console.log(`   Size: ${stats.size} bytes\n`);
      }
    } catch (error) {
      console.error(`❌ Failed to create ${description}:`, error.message);
      process.exit(1);
    }
  } else {
    console.error(`❌ ${envVar} secret not found!`);
    console.error(`   Create it with: eas secret:create --scope project --name ${envVar} --value "..."\n`);
    process.exit(1);
  }
}

// Inject google-services.json (Android)
// Always create both config files since app.json references both
decodeAndWriteFile(
  'GOOGLE_SERVICES_JSON',
  'google-services.json',
  'Android Firebase config (google-services.json)'
);

// Inject GoogleService-Info.plist (iOS)
decodeAndWriteFile(
  'GOOGLE_SERVICE_INFO_PLIST',
  'GoogleService-Info.plist',
  'iOS Firebase config (GoogleService-Info.plist)'
);

console.log('✅ Firebase config injection complete!\n');

// Exit successfully
process.exit(0);
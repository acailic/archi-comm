#!/usr/bin/env node

/**
 * Script to generate Tauri updater signing keys
 * This script generates a key pair for the Tauri updater and provides
 * instructions for setting up the keys in the project.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const KEYS_DIR = '.tauri-updater-keys';

function ensureKeysDirectory() {
  if (!fs.existsSync(KEYS_DIR)) {
    fs.mkdirSync(KEYS_DIR);
  }
}

function generateKeys() {
  console.log('🔑 Generating Tauri updater keys...');
  
  try {
    // Ensure the keys directory exists
    ensureKeysDirectory();

    // Generate the key pair using tauri signer
    const output = execSync('npx @tauri-apps/cli signer generate', {
      encoding: 'utf8'
    });

    // Extract public and private keys from output
    const publicKey = output.match(/Public key: (.+)/)?.[1];
    const privateKey = output.match(/Private key: (.+)/)?.[1];

    if (!publicKey || !privateKey) {
      throw new Error('Failed to extract keys from output');
    }

    // Save keys to files with restrictive permissions (Unix-like systems)
    const privateKeyPath = path.join(KEYS_DIR, 'private.key');
    const publicKeyPath = path.join(KEYS_DIR, 'public.key');

    fs.writeFileSync(publicKeyPath, publicKey);
    fs.writeFileSync(privateKeyPath, privateKey);

    // Set restrictive permissions on private key (600 = owner read/write only)
    // This only works on Unix-like systems; Windows has different permission model
    try {
      fs.chmodSync(privateKeyPath, 0o600);
    } catch (error) {
      console.warn('⚠️ Could not set restrictive permissions on private key file (may not be supported on this OS)');
    }

    console.log('\n✅ Keys generated successfully!\n');

    // Print setup instructions
    console.log('🔨 Setup Instructions:\n');
    console.log('1. Add the public key to src-tauri/tauri.conf.json:');
    console.log(`   "updater": {
     "active": true,
     "pubkey": "${publicKey}"
   }`);
    console.log('\n2. Add the private key as a GitHub Secret:');
    console.log('   - Go to your repository settings');
    console.log('   - Navigate to Secrets and variables > Actions');
    console.log('   - Create a new secret named TAURI_PRIVATE_KEY');
    console.log(`   - Read the private key from: ${privateKeyPath}`);
    console.log('   - IMPORTANT: Never print or share the private key in console logs or files');
    console.log('\n⚠️ Security Reminders:');
    console.log('- Private key is saved to:', privateKeyPath);
    console.log('- Keep your private key secure and never commit it to version control');
    console.log('- The .tauri-updater-keys/ directory is gitignored by default');
    console.log('- Backup your keys securely (encrypted backup recommended)');
    console.log('- Consider using different keys for development and production');
    console.log('- Rotate keys periodically for enhanced security');

  } catch (error) {
    console.error('\n❌ Error generating keys:', error.message);
    process.exit(1);
  }
}

generateKeys();
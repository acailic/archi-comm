#!/usr/bin/env node

/**
 * ArchiComm Development Environment Setup
 *
 * This script automates the initial developer setup process, verifying requirements,
 * installing dependencies, and configuring the development environment.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Configuration
const REQUIRED_NODE_VERSION = '18.0.0';
const REQUIRED_NPM_VERSION = '9.0.0';

// Helper Functions
function executeCommand(command, ignoreError = false) {
  try {
    return execSync(command, { encoding: 'utf8', stdio: 'pipe' });
  } catch (error) {
    if (!ignoreError) {
      console.error(`Error executing command: ${command}`);
      console.error(error.message);
      process.exit(1);
    }
    return null;
  }
}

function checkVersion(current, required) {
  const [currentMajor, currentMinor] = current.split('.');
  const [requiredMajor, requiredMinor] = required.split('.');

  if (parseInt(currentMajor) < parseInt(requiredMajor)) return false;
  if (parseInt(currentMajor) === parseInt(requiredMajor) &&
      parseInt(currentMinor) < parseInt(requiredMinor)) return false;
  return true;
}

function detectIDE() {
  // Check if running in VS Code
  if (process.env.TERM_PROGRAM === 'vscode') return 'vscode';
  // Add checks for other IDEs if needed
  return null;
}

// Main Setup Steps
async function main() {
  console.log('🚀 Starting ArchiComm development environment setup...\n');

  // 1. Check System Requirements
  console.log('📋 Checking system requirements...');

  const nodeVersion = process.version.slice(1);
  const npmVersion = executeCommand('npm -v').trim();

  if (!checkVersion(nodeVersion, REQUIRED_NODE_VERSION)) {
    console.error(`❌ Node.js ${REQUIRED_NODE_VERSION} or higher is required. Found: ${nodeVersion}`);
    process.exit(1);
  }

  if (!checkVersion(npmVersion, REQUIRED_NPM_VERSION)) {
    console.error(`❌ npm ${REQUIRED_NPM_VERSION} or higher is required. Found: ${npmVersion}`);
    process.exit(1);
  }

  // 2. Check Rust Installation
  console.log('\n🦀 Checking Rust installation...');

  const rustc = executeCommand('rustc --version', true);
  if (!rustc) {
    console.log('⚠️ Rust not found. Installing...');
    if (os.platform() === 'win32') {
      console.log('Please install Rust from https://rustup.rs/');
      process.exit(1);
    } else {
      executeCommand('curl --proto \'=https\' --tlsv1.2 -sSf https://sh.rustup.rs | sh');
    }
  }

  // 3. Install Dependencies
  console.log('\n📦 Installing dependencies...');
  executeCommand('npm ci');

  // 4. Configure Git Hooks
  console.log('\n🎣 Setting up Git hooks...');
  executeCommand('npm run prepare');

  // 5. IDE Setup
  const ide = detectIDE();
  if (ide === 'vscode') {
    console.log('\n💻 Setting up VS Code workspace...');
    // VS Code extensions are recommended via .vscode/extensions.json
    console.log('✨ VS Code workspace configured. Please install recommended extensions.');
  }

  // 6. Performance Baseline
  console.log('\n📊 Establishing performance baseline...');
  executeCommand('npm run build');
  executeCommand('npm run test:coverage');

  // 7. Verification
  console.log('\n✅ Running verification checks...');

  try {
    executeCommand('npm run type-check');
    executeCommand('npm run lint');
    executeCommand('npm run format:check');
    executeCommand('npm run test:run');

    console.log('\n🎉 Development environment setup complete!');
    console.log('\nNext steps:');
    console.log('1. Start the development server: npm run dev');
    console.log('2. Open the developer tools: View > Command Palette > "Developer: Toggle Developer Tools"');
    console.log('3. Check out CONTRIBUTING.md for development guidelines');
    console.log('\nHappy coding! 🚀');
  } catch (error) {
    console.error('\n❌ Verification checks failed. Please fix the issues and try again.');
    console.error(error.message);
    process.exit(1);
  }
}

main().catch(error => {
  console.error('❌ Setup failed:', error);
  process.exit(1);
});

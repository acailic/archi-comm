# Distribution Guide

ArchiComm provides multiple ways to distribute and install the application, with built-in security features and auto-updates.

## Installation Methods

### GitHub Releases (All Platforms)
- Download the latest release from [GitHub Releases](https://github.com/acailic/archi-comm/releases)
- Platform-specific installers are available:
  - macOS: Universal DMG installer (Intel & Apple Silicon)
  - Windows: NSIS installer (.exe)
  - Linux: AppImage and Debian package (.deb)

### Homebrew (macOS)

#### Binary Installation (Recommended)
```bash
brew install --cask archi-comm
```

#### Source Installation
```bash
brew install archi-comm
```

## Auto-Updates

ArchiComm includes an automatic update system that:
- Checks for updates when the application starts
- Shows a dialog when updates are available
- Downloads and installs updates securely
- Verifies signatures of all updates

### Update Configuration
- Update checks point to: `https://github.com/acailic/archi-comm/releases/latest/download/latest.json`
- Updates are signed with Tauri's updater system
- Users can disable automatic updates in preferences

## Code Signing

### macOS
- Application is signed with Apple Developer ID
- Notarized with Apple for Gatekeeper approval
- Universal binary (Intel & Apple Silicon)
- Minimum system version: macOS 10.13 (High Sierra)

### Windows
- Signed with code signing certificate
- Uses SHA-256 for signatures
- Includes timestamp for certificate validity
- Compatible with Windows SmartScreen

## For Maintainers

### Release Process
1. Push changes to `main` branch
2. Semantic release creates a new version tag
3. Tag triggers `build-tauri.yml` workflow
4. Builds are created and signed for all platforms
5. Release is published on GitHub
6. Homebrew cask is automatically updated

### Setting Up Signing

#### macOS Signing
1. Obtain an Apple Developer ID certificate
2. Export the certificate and private key
3. Add to GitHub Secrets:
   - `APPLE_CERTIFICATE`
   - `APPLE_CERTIFICATE_PASSWORD`
   - `APPLE_SIGNING_IDENTITY`
   - `APPLE_ID`
   - `APPLE_TEAM_ID`
   - `APPLE_PASSWORD`
   - `APPLE_PROVIDER_SHORT_NAME`

#### Windows Signing
1. Obtain a code signing certificate
2. Export the certificate with private key
3. Add to GitHub Secrets:
   - `WINDOWS_CERTIFICATE`
   - `WINDOWS_CERTIFICATE_PASSWORD`
   - `WINDOWS_CERTIFICATE_THUMBPRINT`

### Auto-Updater Setup
1. Run `npm run generate-updater-keys` to generate signing keys
2. Add public key to `src-tauri/tauri.conf.json`
3. Add private key to GitHub Secrets as `TAURI_PRIVATE_KEY`

### Emergency Procedures

#### Rolling Back a Release
1. Delete the problematic release tag
2. Create a new release with a higher version number
3. The auto-updater will guide users to the new version

#### Certificate Revocation
1. Revoke the compromised certificate
2. Obtain a new certificate
3. Update the relevant GitHub Secrets
4. Create a new signed release

## Security Considerations

### Update Security
- All updates are signed with the Tauri updater key
- Updates are distributed over HTTPS
- Update manifests include file hashes
- Automatic update validation before installation

### Binary Validation
- macOS: Gatekeeper & notarization
- Windows: Authenticode signatures
- Linux: AppImage signatures
- All platforms: SHA-256 checksums published

### Key Management
- Signing keys stored as GitHub Secrets
- Separate keys for development and production
- Regular key rotation recommended
- Backup procedures for key recovery

## Troubleshooting

### Common Issues

#### Update Failures
- Verify internet connectivity
- Check GitHub status
- Ensure sufficient disk space
- Verify file permissions

#### Installation Problems
- macOS: Run `xcode-select --install`
- Windows: Check certificate trust
- Linux: Verify dependencies

### Getting Help
- File issues on GitHub
- Check existing troubleshooting guides
- Contact maintainers for critical issues

## Further Reading
- [Tauri Security Documentation](https://tauri.app/v1/guides/security/security)
- [macOS Code Signing Guide](https://developer.apple.com/support/code-signing/)
- [Windows Code Signing](https://docs.microsoft.com/en-us/windows-hardware/drivers/dashboard/code-signing)
# Build Guide - Multi-Platform Releases

This guide explains how to build your photogrammetry app for Linux and Windows.

## Quick Start

### Build for all platforms (Linux + Windows)
```bash
npm run build:win-linux
```

### Build for Windows only
```bash
npm run build:win
```

### Build for Linux only
```bash
npm run build:linux
```

### Build for current platform only
```bash
npm run build
```

## Build Outputs

Builds are output to the `release/{version}/` directory:

### Windows Builds
- **NSIS Installer** (`.exe`): Full installer with automatic updates support
  - `DroneMesh-Windows-{version}-x64.exe` - 64-bit installer
  - `DroneMesh-Windows-{version}-ia32.exe` - 32-bit installer
- **Portable** (`.exe`): Standalone executable (no installation required)
  - `DroneMesh-Windows-{version}-x64.exe` - 64-bit portable

### Linux Builds
- **AppImage** (`.AppImage`): Universal Linux executable
  - `DroneMesh-Linux-{version}-x64.AppImage` - Works on any Linux distro
- **DEB Package** (`.deb`): Debian/Ubuntu package
  - `DroneMesh-Linux-{version}-x64.deb` - For apt package manager
- **RPM Package** (`.rpm`): RedHat/Fedora package
  - `DroneMesh-Linux-{version}-x64.rpm` - For rpm package manager

## Platform Requirements

### Building on Linux (Ubuntu)
- Node.js 24+
- npm 11+
- For building Windows targets on Linux: `wine` and `nsis` packages (optional for cross-platform)

Install dependencies:
```bash
sudo apt-get install wine wine-binfmt winetricks
```

### Building on Windows
- Node.js 24+
- npm 11+
- Visual Studio Build Tools (optional, for better support)

### Building on macOS
- Node.js 24+
- npm 11+

## Current Setup

Your application is configured in `electron-builder.json5` to build:

### Windows Target
- x64 and ia32 (32-bit) architectures
- NSIS installer + Portable executable

### Linux Target
- AppImage format (universal)
- DEB package (Debian/Ubuntu)
- RPM package (RedHat/Fedora)

### macOS Target
- DMG installer

## Best Practices for Cross-Platform Builds

### Option 1: Build on Each Platform (Recommended)
1. On Windows machine: `npm run build:win`
2. On Linux machine: `npm run build:linux`
3. Combine the outputs

### Option 2: Use CI/CD Pipeline (GitHub Actions)
Create `.github/workflows/build.yml` to automatically build on multiple platforms:

```yaml
name: Build Multi-Platform Releases
on:
  push:
    tags:
      - 'v*'

jobs:
  build-windows:
    runs-on: windows-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '24'
      - run: npm ci
      - run: npm run build:win

  build-linux:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '24'
      - run: npm ci
      - run: npm run build:linux
```

### Option 3: Cross-Platform Build on Linux (Advanced)
Using wine for Windows cross-compilation:
```bash
# Install cross-compilation tools
sudo apt-get install wine wine-binfmt winetricks

# Build for both
npm run build:win-linux
```

## Troubleshooting

### Port already in use
```bash
pkill -f "node.*vite" || true
```

### Clear build cache
```bash
rm -rf dist dist-electron release node_modules/.vite
npm install
```

### Build fails with permission errors
```bash
# On Linux, ensure you have write permissions
chmod 755 -R release/
```

## Additional Commands

### Clean old releases (keep only latest 3)
```bash
npm run clean:releases
```

### Test build locally
```bash
npm run build  # Current platform
npm run preview  # Preview production build
```

## Configuration Files

- **electron-builder.json5** - Electron builder configuration
- **vite.config.ts** - Vite build configuration  
- **tsconfig.json** - TypeScript configuration
- **electron/main.ts** - Electron main process
- **electron/preload.ts** - Electron preload script

## Build Process Flow

```
npm run build:win-linux
    ↓
npm run tsc (TypeScript compilation)
    ↓
npm run vite build (Vite bundling)
    ↓
electron-builder --win (Windows build)
    ↓
electron-builder --linux (Linux build)
    ↓
Outputs to release/{version}/
```

## Support

For detailed electron-builder configuration, see: https://www.electron.build/

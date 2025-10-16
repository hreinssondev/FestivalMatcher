# 🚀 Fast Build Guide

## Quick Solutions for Slow Builds

### 1. **Use Development Server (Recommended)**
```bash
# Start Expo development server - MUCH faster
npm run ios:dev
```

### 2. **Use Simulator Build**
```bash
# Build specifically for simulator
npm run ios:simulator
```

### 3. **Clean Build (When Stuck)**
```bash
# Clean everything and rebuild
npm run ios:clean
```

## 🔧 Build Optimizations Applied

### Performance Settings
- ✅ **New Architecture**: Disabled (faster builds)
- ✅ **Bitcode**: Disabled (faster compilation)
- ✅ **Optimization Level**: Set to 0 (faster compilation)
- ✅ **Only Active Arch**: Enabled (builds only current architecture)
- ✅ **ccache**: Enabled (build caching)

### Warning Suppression
- ✅ **Deprecation Warnings**: Suppressed
- ✅ **Atomic Property Warnings**: Suppressed
- ✅ **Null Argument Warnings**: Suppressed
- ✅ **Format Warnings**: Suppressed

## 🐛 Common Build Issues & Solutions

### Build Gets Stuck
1. **Use Development Server**:
   ```bash
   npm run ios:dev
   ```

2. **Clean Build**:
   ```bash
   npm run ios:clean
   ```

3. **Reset Everything**:
   ```bash
   npm run reset
   ```

### Slow Build Times
1. **Use Simulator Build**:
   ```bash
   npm run ios:simulator
   ```

2. **Disable New Architecture** (already done):
   - `newArchEnabled: "false"` in Podfile.properties.json

3. **Use ccache** (already enabled):
   - Build caching for faster subsequent builds

## 📱 Development Workflow

### Daily Development (Fastest)
```bash
npm run ios:dev
```
- Starts Expo development server
- Hot reloading
- No full rebuilds needed
- Fastest development experience

### Testing on Device
```bash
npm run ios:simulator
```
- Builds for simulator
- Faster than device builds
- Good for testing

### Production Testing
```bash
npm run ios:fast
```
- Full build for device testing
- Use when you need to test on physical device

## ⚡ Performance Tips

1. **Use Development Server**: `npm run ios:dev` is 10x faster than full builds
2. **Keep Simulator Open**: Reduces launch time
3. **Use Hot Reloading**: Make changes without rebuilding
4. **Clean When Stuck**: Use `npm run ios:clean` when builds hang
5. **Avoid New Architecture**: Disabled for faster builds

## 🔍 Troubleshooting

### Build Hangs at Same Place
- Use development server instead: `npm run ios:dev`
- Clean build: `npm run ios:clean`
- Check Xcode for specific errors

### Very Slow Builds
- Ensure New Architecture is disabled
- Use simulator builds: `npm run ios:simulator`
- Use development server: `npm run ios:dev`

### Warnings Still Appear
- Run: `npm run fix-warnings`
- Most warnings are from third-party libraries and don't affect functionality

## 🎯 Recommended Workflow

1. **Start Development**: `npm run ios:dev`
2. **Test on Simulator**: `npm run ios:simulator`
3. **Test on Device**: `npm run ios:fast`
4. **When Stuck**: `npm run ios:clean`
5. **Major Issues**: `npm run reset`

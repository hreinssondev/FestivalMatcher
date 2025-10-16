# 🔧 Simulator Timeout Fix

## 🚨 The Problem
The iOS simulator is timing out when trying to open the Expo URL. This is a common issue with Expo development.

## ✅ Solutions (Try in Order)

### 1. **Manual Simulator Opening (Recommended)**
```bash
# Start server without auto-opening simulator
expo start --no-dev

# Then manually open simulator and scan QR code
```

### 2. **Use Tunnel Mode**
```bash
# Start with tunnel (works better with network issues)
expo start --tunnel
```

### 3. **Use Development Script**
```bash
# Use our custom script that handles timeouts
npm run dev:server
```

### 4. **Manual Simulator Steps**
1. Open iOS Simulator manually
2. Install Expo Go from App Store (if not already installed)
3. Scan the QR code from terminal
4. Or press 'i' in terminal to open simulator

## 🔧 Quick Fix Commands

### Start Development Server
```bash
# Method 1: No auto-open (most reliable)
expo start --no-dev

# Method 2: With tunnel
expo start --tunnel

# Method 3: Custom script
npm run dev:server
```

### Open Simulator Manually
```bash
# Open iOS Simulator
open -a Simulator

# Or use Xcode
xed .
```

## 🎯 Recommended Workflow

1. **Start Server**: `expo start --no-dev`
2. **Open Simulator**: Press 'i' in terminal or open manually
3. **Scan QR Code**: Use Expo Go app to scan
4. **Develop**: Make changes and see them hot reload

## 🐛 Troubleshooting

### If Simulator Still Times Out
1. **Restart Simulator**:
   ```bash
   xcrun simctl shutdown all
   open -a Simulator
   ```

2. **Clear Simulator Cache**:
   ```bash
   xcrun simctl erase all
   ```

3. **Use Different Device**:
   ```bash
   # List available devices
   xcrun simctl list devices
   
   # Boot specific device
   xcrun simctl boot "iPhone 15"
   ```

### If Expo Go Won't Connect
1. **Check Network**: Ensure same WiFi network
2. **Use Tunnel**: `expo start --tunnel`
3. **Check Firewall**: Allow Expo in firewall settings
4. **Try Different Port**: `expo start --port 8082`

## 📱 Alternative Development Methods

### 1. **Physical Device**
- Install Expo Go on your iPhone
- Scan QR code from terminal
- Works better than simulator

### 2. **Web Development**
```bash
expo start --web
```
- Develop in browser
- Fastest for UI development

### 3. **Android Emulator**
```bash
expo start --android
```
- Sometimes more reliable than iOS simulator

## 🎉 Success Indicators

✅ **Server Running**: Metro bundler started  
✅ **QR Code Visible**: In terminal  
✅ **Simulator Open**: iOS Simulator running  
✅ **Expo Go Installed**: In simulator  
✅ **App Loading**: Your app appears in simulator  

## 🚀 Fast Development Tips

1. **Use Hot Reloading**: Changes appear instantly
2. **Keep Simulator Open**: Faster subsequent launches
3. **Use Physical Device**: More reliable than simulator
4. **Web Development**: Fastest for UI work
5. **Tunnel Mode**: Better for network issues

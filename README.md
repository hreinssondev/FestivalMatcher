# Tinder Clone - Expo React Native

A modern Tinder clone built with Expo and React Native, featuring swipe gestures, chat functionality, and a beautiful UI.

## Features

- **Swipe Interface**: Smooth card swiping with gesture handling
- **Matches Screen**: View and manage your matches
- **Chat System**: Real-time messaging with matches
- **Profile Management**: Edit your profile and settings
- **Modern UI**: Clean, modern design with smooth animations
- **Expo Compatible**: Easy development and deployment

## Screenshots

The app includes:
- Swipe screen with card stack and gesture controls
- Matches list with unread message indicators
- Chat interface with message bubbles
- Profile screen with editable information

## Getting Started

### Prerequisites

- Node.js (>= 18)
- Expo CLI
- Expo Go app on your phone (for testing)

### Installation

1. Clone the repository
2. Navigate to the project directory:
   ```bash
   cd TinderCloneExpo
   ```

3. Install dependencies:
   ```bash
   npm install
   ```

4. Start the Expo development server:
   ```bash
   npx expo start
   ```

5. Run the app:
   - **iOS**: Press `i` in the terminal or scan the QR code with your camera
   - **Android**: Press `a` in the terminal or scan the QR code with Expo Go
   - **Web**: Press `w` in the terminal

## Project Structure

```
src/
├── screens/          # Main app screens
│   ├── SwipeScreen.tsx
│   ├── MatchesScreen.tsx
│   ├── ProfileScreen.tsx
│   └── ChatScreen.tsx
├── types/            # TypeScript type definitions
│   └── index.ts
└── utils/            # Utility functions
    └── helpers.ts
```

## Technologies Used

- Expo SDK
- React Native
- TypeScript
- React Navigation
- React Native Gesture Handler
- React Native Reanimated
- Expo Linear Gradient

## Features in Detail

### Swipe Screen
- Card stack with smooth animations
- Gesture-based swiping (left/right/super like)
- User profile information display with gradient overlays
- Action buttons for manual swiping

### Matches Screen
- List of all matches
- Unread message indicators
- Last message preview
- Time formatting

### Chat Screen
- Real-time messaging interface
- Message bubbles with timestamps
- Keyboard-aware input
- Auto-scroll to latest messages

### Profile Screen
- Editable profile information
- Photo gallery
- Settings menu
- Interest tags

## Development

The app uses mock data for demonstration purposes. In a production environment, you would integrate with a backend API for:
- User authentication
- Profile management
- Real-time messaging
- Match algorithms

## Expo Benefits

- **Easy Setup**: No need to configure native build tools
- **Cross-Platform**: Works on iOS, Android, and Web
- **Hot Reloading**: Instant updates during development
- **Over-the-Air Updates**: Push updates without app store approval
- **Rich Ecosystem**: Access to many pre-built components and APIs

## Running on Different Platforms

### iOS Simulator
```bash
npx expo run:ios
```

### Android Emulator
```bash
npx expo run:android
```

### Web Browser
```bash
npx expo start --web
```

## Building for Production

### EAS Build (Recommended)
```bash
npx eas build --platform ios
npx eas build --platform android
```

### Expo Build (Legacy)
```bash
expo build:ios
expo build:android
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is for educational purposes only. 
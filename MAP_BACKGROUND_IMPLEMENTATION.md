# Map Background Implementation

## Overview
I've successfully added a map view as a background in the top floating bar for both the Profile and Swipe pages. This creates a more immersive and visually appealing user experience.

## What was implemented

### 1. MapBackground Component (`src/components/MapBackground.tsx`)
- Created a reusable React component that renders a static map view
- Uses `react-native-maps` with `MapView` and `Marker` components
- Configured with Amsterdam coordinates as default location
- Includes a dark overlay for better text readability
- Uses lite mode for better performance in small views
- All map interactions are disabled (scroll, zoom, rotate, etc.)

### 2. ProfileScreen Updates (`src/screens/ProfileScreen.tsx`)
- Imported the new `MapBackground` component
- Added the map background to the floating bar
- Updated styles to remove the solid black background
- Added `mapBackground` style for proper positioning

### 3. SwipeScreen Updates (`src/screens/SwipeScreen.tsx`)
- Imported the new `MapBackground` component
- Added the map background to the floating bar
- Updated styles to remove the solid black background
- Added `mapBackground` style for proper positioning

## Technical Details

### Map Configuration
- **Default Location**: Amsterdam (52.3676, 4.9041)
- **Map Type**: Standard
- **Lite Mode**: Enabled for better performance
- **Interactions**: All disabled (scroll, zoom, rotate, pitch)
- **UI Elements**: All hidden (compass, scale, traffic, etc.)

### Styling
- **Container**: Matches floating bar dimensions (width - 40, height 50)
- **Border Radius**: 20px to match floating bar styling
- **Overlay**: Dark overlay (rgba(0, 0, 0, 0.7)) for text readability
- **Positioning**: Absolute positioning within the floating bar

### Performance Considerations
- Uses lite mode for better performance in small views
- Static map with no interactions to minimize resource usage
- Minimal markers (only one subtle marker for visual appeal)

## Dependencies
- `react-native-maps`: Already installed (version 1.20.1)
- No additional dependencies required

## Visual Result
The floating bar now displays a subtle map background instead of a solid black background, creating a more engaging visual experience while maintaining text readability through the dark overlay.

## Files Modified
1. `src/components/MapBackground.tsx` (new file)
2. `src/screens/ProfileScreen.tsx`
3. `src/screens/SwipeScreen.tsx`

## Testing
The implementation has been tested with:
- TypeScript compilation (no errors related to the new component)
- Dependency compatibility (react-native-maps is properly installed)
- Style integration (proper positioning and overlay)

The map background should now be visible in the floating bars on both the Profile and Swipe screens.

# Festival API Setup Guide

This guide explains how to set up external festival APIs to populate your festival database.

## Available APIs

### Option 1: Songkick API (Recommended - Free)
**Best for:** Comprehensive festival data worldwide

1. **Get API Key:**
   - Go to https://www.songkick.com/developer/account
   - Sign up for a free account
   - Get your API key from the developer dashboard

2. **Update Configuration:**
   - Open `src/services/festivalService.ts`
   - Replace `YOUR_SONGKICK_API_KEY` with your actual API key:
   ```typescript
   const SONGKICK_API_KEY = 'your-actual-api-key-here';
   ```

### Option 2: Ticketmaster Discovery API (Alternative)
**Best for:** Large-scale events and festivals in North America

1. **Get API Key:**
   - Go to https://developer.ticketmaster.com/products-and-docs/apis/getting-started/
   - Sign up for a free account
   - Get your API key from the developer portal

2. **Update Configuration:**
   - Open `src/services/festivalService.ts`
   - Replace `YOUR_TICKETMASTER_API_KEY` with your actual API key:
   ```typescript
   const TICKETMASTER_API_KEY = 'your-actual-api-key-here';
   ```

## How It Works

The festival search now uses a **fallback strategy**:

1. **First:** Tries Songkick API (if API key is configured)
2. **Second:** Tries Ticketmaster API (if Songkick fails and API key is configured)
3. **Third:** Falls back to your Supabase database
4. **Fourth:** Returns empty array if all fail

## Features

- **Automatic fallback:** If one API fails, it tries the next
- **No API key required:** Works with Supabase database if APIs aren't configured
- **Search functionality:** Searches by festival name across all sources
- **Location data:** Includes location and country information when available

## Testing

1. **Without API keys:**
   - The app will use your Supabase database
   - Make sure you've run `festivals_table_setup.sql` to populate initial data

2. **With API keys:**
   - Update the API keys in `festivalService.ts`
   - Test by searching for festivals in the app
   - Check console logs to see which API is being used

## API Rate Limits

- **Songkick:** Free tier allows a reasonable number of requests
- **Ticketmaster:** Free tier has usage limits (check their documentation)
- **Best practice:** Cache results to minimize API calls

## Need Help?

- Songkick API Docs: https://www.songkick.com/developer
- Ticketmaster API Docs: https://developer.ticketmaster.com/products-and-docs/apis/discovery-api/v2/


import { supabase } from '../utils/supabase';

export interface Festival {
  id: string;
  name: string;
  location?: string;
  country?: string;
  genre?: string;
}

// Songkick API configuration
// Get your API key from: https://www.songkick.com/developer/account
const SONGKICK_API_KEY = 'YOUR_SONGKICK_API_KEY'; // Replace with your actual API key
const SONGKICK_API_BASE_URL = 'https://api.songkick.com/api/3.0';

// Alternative: Ticketmaster API (if Songkick doesn't work)
// Get API key from: https://developer.ticketmaster.com/products-and-docs/apis/getting-started/
const TICKETMASTER_API_KEY = 'YOUR_TICKETMASTER_API_KEY'; // Optional: Replace with your actual API key
const TICKETMASTER_API_BASE_URL = 'https://app.ticketmaster.com/discovery/v2';

export class FestivalService {
  /**
   * Fetch festivals from Songkick API
   * Falls back to Ticketmaster, then Supabase if API fails
   */
  private static async fetchFromSongkickAPI(
    searchTerm?: string
  ): Promise<{ festivals: Festival[]; error: any }> {
    try {
      if (!SONGKICK_API_KEY || SONGKICK_API_KEY === 'YOUR_SONGKICK_API_KEY') {
        throw new Error('Songkick API key not configured');
      }

      let url = `${SONGKICK_API_BASE_URL}/events.json?apikey=${SONGKICK_API_KEY}`;
      
      // Add search query if provided
      if (searchTerm && searchTerm.trim().length > 0) {
        url += `&query=${encodeURIComponent(searchTerm.trim())}`;
      }
      
      // Limit to festivals and concerts
      url += '&type=festival';
      
      // Set pagination
      url += '&per_page=20';

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Songkick API returned status ${response.status}`);
      }

      const data = await response.json();
      
      // Transform Songkick response to our Festival format
      const festivals: Festival[] = [];
      
      if (data.resultsPage && data.resultsPage.results && data.resultsPage.results.event) {
        const events = Array.isArray(data.resultsPage.results.event) 
          ? data.resultsPage.results.event 
          : [data.resultsPage.results.event];
          
        events.forEach((event: any) => {
          if (event.displayName) {
            festivals.push({
              id: `songkick-${event.id}`,
              name: event.displayName,
              location: event.venue?.displayName || event.location?.city || undefined,
              country: event.venue?.metroArea?.country?.displayName || event.location?.city || undefined,
              genre: event.type || 'Festival',
            });
          }
        });
      }

      return { festivals, error: null };
    } catch (error) {
      console.log('FestivalService: Songkick API fetch failed:', error);
      return { festivals: [], error };
    }
  }

  /**
   * Fetch festivals from Ticketmaster API (alternative)
   */
  private static async fetchFromTicketmasterAPI(
    searchTerm?: string
  ): Promise<{ festivals: Festival[]; error: any }> {
    try {
      if (!TICKETMASTER_API_KEY || TICKETMASTER_API_KEY === 'YOUR_TICKETMASTER_API_KEY') {
        throw new Error('Ticketmaster API key not configured');
      }

      let url = `${TICKETMASTER_API_BASE_URL}/events.json?apikey=${TICKETMASTER_API_KEY}`;
      url += '&classificationName=music';
      url += '&size=20';
      
      if (searchTerm && searchTerm.trim().length > 0) {
        url += `&keyword=${encodeURIComponent(searchTerm.trim())}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Ticketmaster API returned status ${response.status}`);
      }

      const data = await response.json();
      
      const festivals: Festival[] = [];
      
      if (data._embedded && data._embedded.events) {
        data._embedded.events.forEach((event: any) => {
          // Filter for festivals (name contains "festival" or is marked as festival)
          const name = event.name || '';
          const isFestival = name.toLowerCase().includes('festival') || 
                           event.classifications?.some((c: any) => 
                             c.segment?.name?.toLowerCase() === 'music' && 
                             c.genre?.name?.toLowerCase().includes('festival')
                           );
          
          if (isFestival) {
            const venue = event._embedded?.venues?.[0];
            festivals.push({
              id: `ticketmaster-${event.id}`,
              name: name,
              location: venue?.city?.name || undefined,
              country: venue?.country?.name || venue?.country?.countryCode || undefined,
              genre: event.classifications?.[0]?.genre?.name || 'Festival',
            });
          }
        });
      }

      return { festivals, error: null };
    } catch (error) {
      console.log('FestivalService: Ticketmaster API fetch failed:', error);
      return { festivals: [], error };
    }
  }

  /**
   * Main method to fetch from external APIs
   * Tries Songkick first, then Ticketmaster, then falls back
   */
  private static async fetchFromExternalAPI(
    searchTerm?: string
  ): Promise<{ festivals: Festival[]; error: any }> {
    // Try Songkick first
    const songkickResult = await this.fetchFromSongkickAPI(searchTerm);
    if (songkickResult.festivals.length > 0 && !songkickResult.error) {
      return songkickResult;
    }

    // Try Ticketmaster as fallback
    const ticketmasterResult = await this.fetchFromTicketmasterAPI(searchTerm);
    if (ticketmasterResult.festivals.length > 0 && !ticketmasterResult.error) {
      return ticketmasterResult;
    }

    // Both APIs failed
    return { festivals: [], error: 'All external APIs failed' };
  }

  /**
   * Search for festivals by name (case-insensitive partial match)
   * Tries open source API first, falls back to Supabase
   * @param searchTerm - The search query
   * @param limit - Maximum number of results (default: 20)
   * @param useOpenSourceAPI - Whether to use the open source API (default: true)
   */
  static async searchFestivals(
    searchTerm: string,
    limit: number = 20,
    useOpenSourceAPI: boolean = true
  ): Promise<{ festivals: Festival[]; error: any }> {
    try {
      if (!searchTerm || searchTerm.trim().length === 0) {
        return { festivals: [], error: null };
      }

      const trimmedTerm = searchTerm.trim();

      // Try open source API first if enabled
      if (useOpenSourceAPI) {
        const apiResult = await this.fetchFromOpenSourceAPI(trimmedTerm);
        if (apiResult.festivals.length > 0 && !apiResult.error) {
          // Limit and sort results
          const limited = apiResult.festivals
            .slice(0, limit)
            .sort((a, b) => a.name.localeCompare(b.name));
          return { festivals: limited, error: null };
        }
        // If API fails or returns no results, fall through to Supabase
        console.log('FestivalService: Open source API returned no results, trying Supabase...');
      }

      // Fallback to Supabase
      const { data, error } = await supabase
        .from('festivals')
        .select('id, name, location, country, genre')
        .ilike('name', `%${trimmedTerm}%`)
        .order('name', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('FestivalService: Supabase search error:', error);
        throw error;
      }

      return {
        festivals: data || [],
        error: null,
      };
    } catch (error) {
      console.error('FestivalService: Search failed:', error);
      // Final fallback: return empty array
      return {
        festivals: [],
        error,
      };
    }
  }

  /**
   * Get all festivals (for initial load or when search is empty)
   * Tries open source API first, falls back to Supabase
   * @param limit - Maximum number of results (default: 50)
   * @param useOpenSourceAPI - Whether to use the open source API (default: true)
   */
  static async getAllFestivals(
    limit: number = 50,
    useOpenSourceAPI: boolean = true
  ): Promise<{ festivals: Festival[]; error: any }> {
    try {
      // Try external APIs first if enabled
      if (useOpenSourceAPI) {
        const apiResult = await this.fetchFromExternalAPI();
        if (apiResult.festivals.length > 0 && !apiResult.error) {
          // Limit and sort results
          const limited = apiResult.festivals
            .slice(0, limit)
            .sort((a, b) => a.name.localeCompare(b.name));
          return { festivals: limited, error: null };
        }
        // If API fails or returns no results, fall through to Supabase
        console.log('FestivalService: External APIs returned no results, trying Supabase...');
      }

      // Fallback to Supabase
      const { data, error } = await supabase
        .from('festivals')
        .select('id, name, location, country, genre')
        .order('name', { ascending: true })
        .limit(limit);

      if (error) {
        console.error('FestivalService: Supabase get all error:', error);
        throw error;
      }

      return {
        festivals: data || [],
        error: null,
      };
    } catch (error) {
      console.error('FestivalService: Get all failed:', error);
      return {
        festivals: [],
        error,
      };
    }
  }

  /**
   * Add a custom festival that users type in (if it doesn't exist)
   * This allows users to add festivals that aren't in the database
   */
  static async addCustomFestival(
    name: string,
    location?: string,
    country?: string
  ): Promise<{ festival: Festival | null; error: any }> {
    try {
      const trimmedName = name.trim();
      
      if (!trimmedName) {
        return { festival: null, error: 'Festival name cannot be empty' };
      }

      // Check if festival already exists
      const { data: existing, error: checkError } = await supabase
        .from('festivals')
        .select('id, name, location, country, genre')
        .ilike('name', trimmedName)
        .limit(1)
        .single();

      // If it exists, return it (ignore the error if it's "not found")
      if (existing && !checkError) {
        return { festival: existing, error: null };
      }

      // If it doesn't exist, insert it
      const { data: newFestival, error: insertError } = await supabase
        .from('festivals')
        .insert({
          name: trimmedName,
          location: location || null,
          country: country || null,
        })
        .select('id, name, location, country, genre')
        .single();

      if (insertError) {
        // If insert fails (e.g., duplicate), try to fetch again
        const { data: fetched } = await supabase
          .from('festivals')
          .select('id, name, location, country, genre')
          .ilike('name', trimmedName)
          .limit(1)
          .single();

        if (fetched) {
          return { festival: fetched, error: null };
        }

        console.error('FestivalService: Insert error:', insertError);
        throw insertError;
      }

      return {
        festival: newFestival,
        error: null,
      };
    } catch (error) {
      console.error('FestivalService: Add custom festival failed:', error);
      // Even if database insert fails, return the name as a festival object
      // This allows users to use custom festivals even if DB is unavailable
      return {
        festival: {
          id: `custom-${Date.now()}`,
          name: name.trim(),
          location: location || undefined,
          country: country || undefined,
        },
        error: null, // Don't block user if DB insert fails
      };
    }
  }
}


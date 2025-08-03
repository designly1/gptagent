import type { ToolHandler } from '@/lib/types';
import type {
  ForwardGeocodeParams,
  ReverseGeocodeParams,
  GeocodeResult,
  OSMGeocodeResult,
  OSMReverseGeocodeResult,
} from '@/lib/tools/geocode/def';
import { printLog } from '@/lib/tool-utils';

const GEOCODE_API_KEY = process.env.GEOCODE_API_KEY;

if (!GEOCODE_API_KEY) {
  console.warn(
    '⚠️  GEOCODE_API_KEY environment variable not set. Geocoding tools will not work.'
  );
}

async function makeForwardGeocodeRequest(
  url: string
): Promise<OSMGeocodeResult[]> {
  printLog(`🗺️  Connecting to geocode API (${url})`);

  if (!GEOCODE_API_KEY) {
    throw new Error(
      'GEOCODE_API_KEY environment variable is required for geocoding'
    );
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Geocoding API error: ${response.status} ${response.statusText}`
    );
  }

  const result = await response.json();

  printLog(`🗺️  OUTPUT:`, result);

  return result;
}

async function makeReverseGeocodeRequest(
  url: string
): Promise<OSMReverseGeocodeResult> {
  printLog(`🗺️  Connecting to geocode API (${url})`);

  if (!GEOCODE_API_KEY) {
    throw new Error(
      'GEOCODE_API_KEY environment variable is required for geocoding'
    );
  }

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(
      `Geocoding API error: ${response.status} ${response.statusText}`
    );
  }

  const result = await response.json();

  printLog(`🗺️  OUTPUT:`, result);

  return result;
}

export const forwardGeocodeHandler: ToolHandler<
  ForwardGeocodeParams,
  GeocodeResult
> = async (params: ForwardGeocodeParams): Promise<GeocodeResult> => {
  const { address } = params;

  printLog(`🗺️  Forward geocode tool called with params:`, { address });

  if (!address || typeof address !== 'string') {
    throw new Error('Address is required and must be a string');
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `https://geocode.maps.co/search?q=${encodedAddress}&api_key=${GEOCODE_API_KEY}`;

    const results = await makeForwardGeocodeRequest(url);

    const response: GeocodeResult = {
      query: address,
      type: 'forward' as const,
      results: results.map((result: OSMGeocodeResult) => ({
        place_id: result.place_id,
        display_name: result.display_name,
        lat: result.lat,
        lon: result.lon,
        address: result.address,
        importance: result.importance,
        class: result.class,
        type: result.type,
      })),
    };

    printLog(`🗺️  Forward geocode tool output:`, response);

    return response;
  } catch (error) {
    const errorResponse: GeocodeResult = {
      query: address,
      type: 'forward' as const,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    printLog(`🗺️  Forward geocode tool error:`, errorResponse);

    return errorResponse;
  }
};

export const reverseGeocodeHandler: ToolHandler<
  ReverseGeocodeParams,
  GeocodeResult
> = async (params: ReverseGeocodeParams): Promise<GeocodeResult> => {
  const { latitude, longitude } = params;

  printLog(`🗺️  Reverse geocode tool called with params:`, {
    latitude,
    longitude,
  });

  if (typeof latitude !== 'number' || typeof longitude !== 'number') {
    throw new Error('Latitude and longitude must be numbers');
  }

  if (latitude < -90 || latitude > 90) {
    throw new Error('Latitude must be between -90 and 90 degrees');
  }

  if (longitude < -180 || longitude > 180) {
    throw new Error('Longitude must be between -180 and 180 degrees');
  }

  try {
    const url = `https://geocode.maps.co/reverse?lat=${latitude}&lon=${longitude}&api_key=${GEOCODE_API_KEY}`;

    const result = await makeReverseGeocodeRequest(url);

    const response: GeocodeResult = {
      query: `${latitude}, ${longitude}`,
      type: 'reverse' as const,
      results: [
        {
          place_id: result.place_id,
          display_name: result.display_name,
          lat: result.lat,
          lon: result.lon,
          address: result.address,
        },
      ],
    };

    printLog(`🗺️  Reverse geocode tool output:`, response);

    return response;
  } catch (error) {
    const errorResponse: GeocodeResult = {
      query: `${latitude}, ${longitude}`,
      type: 'reverse' as const,
      results: [],
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };

    printLog(`🗺️  Reverse geocode tool error:`, errorResponse);

    return errorResponse;
  }
};

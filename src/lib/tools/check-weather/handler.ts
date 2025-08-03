import type { ToolHandler } from '@/lib/types';
import type {
  CheckWeatherParams,
  CheckWeatherReturn,
  OpenMeteoWeatherData,
} from '@/lib/tools/check-weather/def';
import { printLog } from '@/lib/tool-utils';

const WEATHER_CODES: Record<number, string> = {
  0: 'Clear sky',
  1: 'Mainly clear',
  2: 'Partly cloudy',
  3: 'Overcast',
  45: 'Foggy',
  48: 'Depositing rime fog',
  51: 'Light drizzle',
  53: 'Moderate drizzle',
  55: 'Dense drizzle',
  56: 'Light freezing drizzle',
  57: 'Dense freezing drizzle',
  61: 'Slight rain',
  63: 'Moderate rain',
  65: 'Heavy rain',
  66: 'Light freezing rain',
  67: 'Heavy freezing rain',
  71: 'Slight snow fall',
  73: 'Moderate snow fall',
  75: 'Heavy snow fall',
  77: 'Snow grains',
  80: 'Slight rain showers',
  81: 'Moderate rain showers',
  82: 'Violent rain showers',
  85: 'Slight snow showers',
  86: 'Heavy snow showers',
  95: 'Thunderstorm',
  96: 'Thunderstorm with slight hail',
  99: 'Thunderstorm with heavy hail',
};

async function geocodeLocation(
  location: string
): Promise<
  { lat: number; lon: number } | { multiple_locations: any[]; error: string }
> {
  printLog(`🌍 Geocoding location: ${location}`);

  const locationVariants = [
    location,
    location.replace(/,/g, ''),
    location.split(',')[0],
    location.replace(/\s+/g, ' ').trim(),
  ];

  for (const variant of locationVariants) {
    printLog(`🌍 Trying location variant: "${variant}"`);

    const encodedLocation = encodeURIComponent(variant);
    const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodedLocation}&count=5&language=en&format=json`;

    printLog(`🌍 Connecting to geocoding API (${url})`);

    try {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(
          `Geocoding API error: ${response.status} ${response.statusText}`
        );
      }

      const data = await response.json();

      printLog(`🌍 OUTPUT:`, data);

      if (data.results && data.results.length > 0) {
        if (data.results.length > 1) {
          const originalLower = location.toLowerCase();
          const exactMatches = data.results.filter((result: any) => {
            const resultAdmin1 = result.admin1?.toLowerCase() || '';
            const resultCountry = result.country?.toLowerCase() || '';

            if (
              originalLower.includes('california') &&
              resultAdmin1.includes('california')
            ) {
              return true;
            }
            if (
              originalLower.includes('texas') &&
              resultAdmin1.includes('texas')
            ) {
              return true;
            }
            if (
              originalLower.includes('united states') &&
              resultCountry.includes('united states')
            ) {
              return true;
            }
            if (
              originalLower.includes('usa') &&
              resultCountry.includes('united states')
            ) {
              return true;
            }
            if (
              originalLower.includes('colombia') &&
              resultCountry.includes('colombia')
            ) {
              return true;
            }
            if (
              originalLower.includes('guatemala') &&
              resultCountry.includes('guatemala')
            ) {
              return true;
            }
            if (
              originalLower.includes('venezuela') &&
              resultCountry.includes('venezuela')
            ) {
              return true;
            }

            return false;
          });

          if (exactMatches.length > 0) {
            const result = exactMatches[0];
            printLog(
              `🌍 Found exact match: ${result.name}, ${result.admin1}, ${result.country} (${result.latitude}, ${result.longitude})`
            );
            return {
              lat: result.latitude,
              lon: result.longitude,
            };
          }

          printLog(
            `🌍 Found ${data.results.length} locations, need user selection`
          );
          const locations = data.results.map((result: any, index: number) => ({
            id: index + 1,
            name: result.name,
            country: result.country,
            admin1: result.admin1,
            latitude: result.latitude,
            longitude: result.longitude,
          }));

          return {
            multiple_locations: locations,
            error: `Multiple locations found for "${variant}". Please specify which one you mean by providing more details like country, state, or region.`,
          };
        } else {
          const result = data.results[0];
          printLog(
            `🌍 Found location: ${result.name} (${result.latitude}, ${result.longitude})`
          );
          return {
            lat: result.latitude,
            lon: result.longitude,
          };
        }
      }
    } catch (error) {
      printLog(`🌍 Failed to geocode variant "${variant}":`, error);
    }
  }

  throw new Error(
    `Location not found: ${location}. Tried variants: ${locationVariants.join(', ')}`
  );
}

async function fetchWeatherData(
  lat: number,
  lon: number,
  unit: 'celsius' | 'fahrenheit'
): Promise<OpenMeteoWeatherData> {
  printLog(
    `🌤️ Fetching weather data for coordinates: ${lat}, ${lon} (${unit})`
  );

  const temperatureUnit = unit === 'fahrenheit' ? 'fahrenheit' : 'celsius';
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,showers,snowfall,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m&temperature_unit=${temperatureUnit}&wind_speed_unit=kmh&precipitation_unit=mm&timezone=auto`;

  printLog(`🌤️ Connecting to weather API (${url})`);

  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Weather API error: ${response.status} ${response.statusText}`
    );
  }

  const data = await response.json();

  printLog(`🌤️ OUTPUT:`, data);

  return data as OpenMeteoWeatherData;
}

export const checkWeatherHandler: ToolHandler<
  CheckWeatherParams,
  CheckWeatherReturn
> = async (params: CheckWeatherParams): Promise<CheckWeatherReturn> => {
  const { location, unit = 'celsius' } = params;

  printLog(`🌤️ Weather tool called with params:`, { location, unit });

  if (!location || typeof location !== 'string') {
    throw new Error('Location is required and must be a string');
  }

  if (unit && !['celsius', 'fahrenheit'].includes(unit)) {
    throw new Error('Unit must be either "celsius" or "fahrenheit"');
  }

  try {
    const geocodeResult = await geocodeLocation(location);

    if ('multiple_locations' in geocodeResult) {
      return {
        location,
        multiple_locations: geocodeResult.multiple_locations,
        error: geocodeResult.error,
      };
    }

    const weatherData = await fetchWeatherData(
      geocodeResult.lat,
      geocodeResult.lon,
      unit
    );

    const weatherDescription =
      WEATHER_CODES[weatherData.current.weather_code] || 'Unknown';

    const result: CheckWeatherReturn = {
      location,
      coordinates: {
        latitude: weatherData.latitude,
        longitude: weatherData.longitude,
      },
      temperature: weatherData.current.temperature_2m,
      unit,
      weather_code: weatherData.current.weather_code,
      weather_description: weatherDescription,
      humidity: weatherData.current.relative_humidity_2m,
      wind_speed: weatherData.current.wind_speed_10m,
      wind_direction: weatherData.current.wind_direction_10m,
      pressure: weatherData.current.pressure_msl,
      cloud_cover: weatherData.current.cloud_cover,
      is_day: weatherData.current.is_day === 1,
      timezone: weatherData.timezone,
      last_updated: weatherData.current.time,
    };

    printLog(`🌤️ Weather tool output:`, result);

    return result;
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error occurred';

    printLog(`🌤️ Weather tool error:`, errorMessage);

    return {
      location,
      coordinates: { latitude: 0, longitude: 0 },
      temperature: 0,
      unit,
      weather_code: 0,
      weather_description: 'Error',
      humidity: 0,
      wind_speed: 0,
      wind_direction: 0,
      pressure: 0,
      cloud_cover: 0,
      is_day: false,
      timezone: 'UTC',
      last_updated: new Date().toISOString(),
      error: errorMessage,
    };
  }
};

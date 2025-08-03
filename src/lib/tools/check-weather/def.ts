import type { ToolType } from '@/lib/types';
import { createToolType, createOpenAIToolSchema } from '@/lib/tool-utils';

export interface CheckWeatherParams extends Record<string, unknown> {
  location: string;
  unit?: 'celsius' | 'fahrenheit';
}

// Open-Meteo API response interfaces
export interface OpenMeteoWeatherData {
  latitude: number;
  longitude: number;
  generationtime_ms: number;
  utc_offset_seconds: number;
  timezone: string;
  timezone_abbreviation: string;
  elevation: number;
  current_units: {
    time: string;
    interval: string;
    temperature_2m: string;
    relative_humidity_2m: string;
    apparent_temperature: string;
    is_day: string;
    precipitation: string;
    rain: string;
    showers: string;
    snowfall: string;
    weather_code: string;
    cloud_cover: string;
    pressure_msl: string;
    surface_pressure: string;
    wind_speed_10m: string;
    wind_direction_10m: string;
    wind_gusts_10m: string;
  };
  current: {
    time: string;
    interval: number;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    is_day: number;
    precipitation: number;
    rain: number;
    showers: number;
    snowfall: number;
    weather_code: number;
    cloud_cover: number;
    pressure_msl: number;
    surface_pressure: number;
    wind_speed_10m: number;
    wind_direction_10m: number;
    wind_gusts_10m: number;
  };
}

export interface CheckWeatherReturn extends Record<string, unknown> {
  location: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
  temperature?: number;
  unit?: 'celsius' | 'fahrenheit';
  weather_code?: number;
  weather_description?: string;
  humidity?: number;
  wind_speed?: number;
  wind_direction?: number;
  pressure?: number;
  cloud_cover?: number;
  is_day?: boolean;
  timezone?: string;
  last_updated?: string;
  multiple_locations?: Array<{
    id: number;
    name: string;
    country: string;
    admin1?: string;
    latitude: number;
    longitude: number;
  }>;
  error?: string;
}

export const checkWeatherTool: ToolType<
  CheckWeatherParams,
  CheckWeatherReturn
> = createToolType<CheckWeatherParams, CheckWeatherReturn>(
  'check_weather',
  'Get current weather information for a location using Open-Meteo API',
  createOpenAIToolSchema(
    'check_weather',
    'Get current weather information for a location using Open-Meteo API. If multiple locations are found during geocoding, choose the most likely one, but then inform the user that there are multiple locations. Number the locations and ask the user if they mean one of these locations.',
    {
      location: {
        type: 'string',
        description:
          'The location to check weather for (city, country, or coordinates). Be specific if there are multiple places with the same name - include country, state, or region to avoid ambiguity.',
      },
      unit: {
        type: 'string',
        enum: ['celsius', 'fahrenheit'],
        description: 'Temperature unit (defaults to fahrenheit)',
      },
    },
    ['location']
  )
);

export const checkWeather = checkWeatherTool.openaiTool;

import type { ToolType } from '@/lib/types';
import { createToolType, createOpenAIToolSchema } from '@/lib/tool-utils';

export interface ForwardGeocodeParams extends Record<string, unknown> {
  address: string;
}

export interface ReverseGeocodeParams extends Record<string, unknown> {
  latitude: number;
  longitude: number;
}

export type GeocodeParams = ForwardGeocodeParams | ReverseGeocodeParams;

export interface OSMAddress {
  house_number?: string;
  road?: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  suburb?: string;
  neighbourhood?: string;
  county?: string;
  country_code?: string;
}

export interface OSMGeocodeResult {
  place_id: number;
  licence: string;
  osm_type: 'node' | 'way' | 'relation';
  osm_id: number;
  boundingbox: [string, string, string, string]; //! [min_lat, max_lat, min_lon, max_lon]
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  address?: OSMAddress;
}

export interface OSMReverseGeocodeResult {
  place_id: number;
  licence: string;
  osm_type: 'node' | 'way' | 'relation';
  osm_id: number;
  lat: string;
  lon: string;
  display_name: string;
  address: OSMAddress;
  boundingbox: [string, string, string, string];
}

export interface GeocodeResult extends Record<string, unknown> {
  query: string;
  type: 'forward' | 'reverse';
  results: Array<{
    place_id: number;
    display_name: string;
    lat: string;
    lon: string;
    address?: OSMAddress;
    importance?: number;
    class?: string;
    type?: string;
  }>;
  error?: string;
}

export const forwardGeocodeTool: ToolType<ForwardGeocodeParams, GeocodeResult> =
  createToolType<ForwardGeocodeParams, GeocodeResult>(
    'forward_geocode',
    'Convert an address to geographic coordinates (latitude and longitude)',
    createOpenAIToolSchema(
      'forward_geocode',
      'Convert an address to geographic coordinates (latitude and longitude)',
      {
        address: {
          type: 'string',
          description:
            'The address to geocode (e.g., "1600 Pennsylvania Avenue NW, Washington, DC")',
        },
      },
      ['address']
    )
  );

export const reverseGeocodeTool: ToolType<ReverseGeocodeParams, GeocodeResult> =
  createToolType<ReverseGeocodeParams, GeocodeResult>(
    'reverse_geocode',
    'Convert geographic coordinates (latitude and longitude) to an address',
    createOpenAIToolSchema(
      'reverse_geocode',
      'Convert geographic coordinates (latitude and longitude) to an address',
      {
        latitude: {
          type: 'number',
          description: 'The latitude coordinate (decimal degrees)',
        },
        longitude: {
          type: 'number',
          description: 'The longitude coordinate (decimal degrees)',
        },
      },
      ['latitude', 'longitude']
    )
  );

export const forwardGeocode = forwardGeocodeTool.openaiTool;
export const reverseGeocode = reverseGeocodeTool.openaiTool;

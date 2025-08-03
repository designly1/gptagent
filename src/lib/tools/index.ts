// Export all tool definitions and handlers
export * from './check-weather/def';
export * from './check-weather/handler';
export * from './geocode/def';
export * from './geocode/handler';
export * from './websearch/def';
export * from './websearch/handler';
export * from './get/def';
export * from './get/handler';

// Re-export for convenience
import { toolRegistry } from '@/lib/tool-registry';
import { checkWeatherTool } from './check-weather/def';
import { checkWeatherHandler } from './check-weather/handler';
import { forwardGeocodeTool, reverseGeocodeTool } from './geocode/def';
import {
  forwardGeocodeHandler,
  reverseGeocodeHandler,
} from './geocode/handler';
import { webSearchTool } from './websearch/def';
import { webSearchHandler } from './websearch/handler';

export function setupTools(): void {
  toolRegistry.register(checkWeatherTool, checkWeatherHandler);
  toolRegistry.register(forwardGeocodeTool, forwardGeocodeHandler);
  toolRegistry.register(reverseGeocodeTool, reverseGeocodeHandler);
  toolRegistry.register(webSearchTool, webSearchHandler);
}

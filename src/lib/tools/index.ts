// Tools index - centralized exports for all available tools
// This file provides a single import point for all tool definitions and handlers
// It also includes a convenience setup function for batch tool registration

// Export all tool definitions and handlers for external use
export * from './check-weather/def';
export * from './check-weather/handler';
export * from './geocode/def';
export * from './geocode/handler';
export * from './websearch/def';
export * from './websearch/handler';
export * from './get/def';
export * from './get/handler';

// Import dependencies for the convenience setup function
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

/**
 * Convenience function to register all built-in tools at once
 * This provides an alternative to the tool bridge's initialization
 * Note: The tool bridge handles registration automatically, so this is mainly
 * useful for testing or alternative initialization patterns
 */
export function setupTools(): void {
  toolRegistry.register(checkWeatherTool, checkWeatherHandler);
  toolRegistry.register(forwardGeocodeTool, forwardGeocodeHandler);
  toolRegistry.register(reverseGeocodeTool, reverseGeocodeHandler);
  toolRegistry.register(webSearchTool, webSearchHandler);
}

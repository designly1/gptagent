// Tool registry implementation - manages all available tools
// This file provides the central registry where tools are registered and executed
import type {
  ToolType,
  ToolHandler,
  ToolRegistry,
  ToolRegistryEntry,
  ToolExecutionResult,
  ToolParameters,
  ToolReturnValue,
  ToolInfo,
} from '@/lib/types';

/**
 * Central registry manager for all tools
 * This class provides a type-safe way to register, execute, and introspect tools
 * It acts as the bridge between the tool bridge and individual tool implementations
 */
export class ToolRegistryManager {
  // Internal storage - maps tool names to their definitions and handlers
  private registry: ToolRegistry = new Map();

  /**
   * Registers a new tool with the registry
   * Pairs a tool definition (metadata + schema) with its implementation function
   * @param tool - The tool definition containing name, description, and OpenAI schema
   * @param handler - The function that actually executes the tool
   */
  register<
    TParams extends ToolParameters = ToolParameters,
    TReturn extends ToolReturnValue = ToolReturnValue,
  >(
    tool: ToolType<TParams, TReturn>,
    handler: ToolHandler<TParams, TReturn>
  ): void {
    this.registry.set(tool.name, { tool, handler });
  }

  /**
   * Retrieves a registered tool entry by name
   * @param name - The tool name to look up
   * @returns The tool entry if found, undefined otherwise
   */
  get<
    TParams extends ToolParameters = ToolParameters,
    TReturn extends ToolReturnValue = ToolReturnValue,
  >(name: string): ToolRegistryEntry<TParams, TReturn> | undefined {
    const entry = this.registry.get(name);
    if (!entry) {
      return undefined;
    }

    // Type assertion needed due to generic constraints
    return entry as unknown as ToolRegistryEntry<TParams, TReturn>;
  }

  /**
   * Executes a tool with the given parameters
   * This is the main method used by the tool bridge to run tools
   * @param name - Name of the tool to execute
   * @param params - Parameters to pass to the tool handler
   * @returns Wrapped result with success/error information
   */
  async execute<
    TParams extends ToolParameters = ToolParameters,
    TReturn extends ToolReturnValue = ToolReturnValue,
  >(name: string, params: TParams): Promise<ToolExecutionResult<TReturn>> {
    const entry = this.get<TParams, TReturn>(name);

    // Check if tool exists
    if (!entry) {
      return {
        success: false,
        error: `Tool '${name}' not found`,
      };
    }

    try {
      // Execute the tool handler (may be async or sync)
      const result = await entry.handler(params);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      // Catch and wrap any errors from tool execution
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * Returns all OpenAI tool schemas for the registered tools
   * This is used when making API calls to tell OpenAI what functions are available
   * @returns Array of ChatCompletionTool schemas
   */
  getAllOpenAITools(): import('openai/resources').ChatCompletionTool[] {
    return Array.from(this.registry.values()).map(
      entry => entry.tool.openaiTool
    );
  }

  /**
   * Returns the names of all registered tools
   * Useful for debugging and introspection
   * @returns Array of tool names
   */
  getAllToolNames(): string[] {
    return Array.from(this.registry.keys());
  }

  /**
   * Checks if a tool with the given name is registered
   * @param name - Tool name to check
   * @returns True if tool exists, false otherwise
   */
  has(name: string): boolean {
    return this.registry.has(name);
  }

  /**
   * Returns the number of registered tools
   * @returns Count of registered tools
   */
  size(): number {
    return this.registry.size;
  }

  /**
   * Gets basic information about a specific tool
   * Used for debugging and introspection without exposing the handler
   * @param name - Tool name to get info for
   * @returns Tool information or null if not found
   */
  getToolInfo(name: string): ToolInfo | null {
    const entry = this.registry.get(name);
    if (!entry) {
      return null;
    }

    return {
      name: entry.tool.name,
      description: entry.tool.description,
      openaiTool: entry.tool.openaiTool,
    };
  }
}

// Export a singleton instance for use throughout the application
export const toolRegistry = new ToolRegistryManager();

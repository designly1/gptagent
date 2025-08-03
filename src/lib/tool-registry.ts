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

export class ToolRegistryManager {
  private registry: ToolRegistry = new Map();

  register<
    TParams extends ToolParameters = ToolParameters,
    TReturn extends ToolReturnValue = ToolReturnValue,
  >(
    tool: ToolType<TParams, TReturn>,
    handler: ToolHandler<TParams, TReturn>
  ): void {
    this.registry.set(tool.name, { tool, handler });
  }

  get<
    TParams extends ToolParameters = ToolParameters,
    TReturn extends ToolReturnValue = ToolReturnValue,
  >(name: string): ToolRegistryEntry<TParams, TReturn> | undefined {
    const entry = this.registry.get(name);
    if (!entry) {
      return undefined;
    }

    return entry as unknown as ToolRegistryEntry<TParams, TReturn>;
  }

  async execute<
    TParams extends ToolParameters = ToolParameters,
    TReturn extends ToolReturnValue = ToolReturnValue,
  >(name: string, params: TParams): Promise<ToolExecutionResult<TReturn>> {
    const entry = this.get<TParams, TReturn>(name);

    if (!entry) {
      return {
        success: false,
        error: `Tool '${name}' not found`,
      };
    }

    try {
      const result = await entry.handler(params);

      return {
        success: true,
        data: result,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  getAllOpenAITools(): import('openai/resources').ChatCompletionTool[] {
    return Array.from(this.registry.values()).map(
      entry => entry.tool.openaiTool
    );
  }

  getAllToolNames(): string[] {
    return Array.from(this.registry.keys());
  }

  has(name: string): boolean {
    return this.registry.has(name);
  }

  size(): number {
    return this.registry.size;
  }

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

export const toolRegistry = new ToolRegistryManager();

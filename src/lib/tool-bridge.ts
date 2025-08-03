import { toolRegistry } from '@/lib/tool-registry';
import { checkWeatherTool } from '@/lib/tools/check-weather/def';
import { checkWeatherHandler } from '@/lib/tools/check-weather/handler';
import {
  forwardGeocodeTool,
  reverseGeocodeTool,
} from '@/lib/tools/geocode/def';
import {
  forwardGeocodeHandler,
  reverseGeocodeHandler,
} from '@/lib/tools/geocode/handler';
import { webSearchTool } from '@/lib/tools/websearch/def';
import { webSearchHandler } from '@/lib/tools/websearch/handler';
import { runAssistant } from '@/lib/openai';
import { getTool, getHandler } from './tools/get/def';

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';
import type { ToolCall, ToolResultMessage, ToolBridgeInfo } from '@/lib/types';

export class ToolBridge {
  private static instance: ToolBridge;
  private isInitialized = false;

  private constructor() {}

  static getInstance(): ToolBridge {
    if (!ToolBridge.instance) {
      ToolBridge.instance = new ToolBridge();
    }
    return ToolBridge.instance;
  }

  initialize(): void {
    if (this.isInitialized) {
      return;
    }

    toolRegistry.register(checkWeatherTool, checkWeatherHandler);
    toolRegistry.register(forwardGeocodeTool, forwardGeocodeHandler);
    toolRegistry.register(reverseGeocodeTool, reverseGeocodeHandler);
    toolRegistry.register(webSearchTool, webSearchHandler);
    toolRegistry.register(getTool, getHandler);

    console.log(
      '🔧 Assistant Bridge initialized with tools:',
      toolRegistry.getAllToolNames()
    );
    this.isInitialized = true;
  }

  async executeToolCall(toolCall: ToolCall): Promise<ToolResultMessage> {
    const { name, arguments: args } = toolCall.function;

    try {
      const params = JSON.parse(args);
      const result = await toolRegistry.execute(name, params);

      if (result.success && result.data) {
        return {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify(result.data),
        };
      } else {
        return {
          role: 'tool',
          tool_call_id: toolCall.id,
          content: JSON.stringify({ error: result.error }),
        };
      }
    } catch (error) {
      return {
        role: 'tool',
        tool_call_id: toolCall.id,
        content: JSON.stringify({
          error: error instanceof Error ? error.message : 'Unknown error',
        }),
      };
    }
  }

  async runAssistantWithTools(
    messages: ChatCompletionMessageParam[]
  ): Promise<ChatCompletionMessageParam> {
    this.initialize();
    let currentMessages = messages;
    while (true) {
      const assistantResponse = await runAssistant(currentMessages);
      if (!assistantResponse) {
        throw new Error('No assistant response');
      }
      if (
        assistantResponse.tool_calls &&
        assistantResponse.tool_calls.length > 0
      ) {
        const toolResults: ToolResultMessage[] = [];
        for (const toolCall of assistantResponse.tool_calls) {
          const result = await this.executeToolCall(toolCall);
          toolResults.push(result);
        }
        currentMessages = [
          ...currentMessages,
          assistantResponse,
          ...toolResults,
        ];
      } else {
        return assistantResponse;
      }
    }
  }

  getRegisteredTools(): string[] {
    return toolRegistry.getAllToolNames();
  }

  getToolInfo(): ToolBridgeInfo {
    return {
      registeredTools: toolRegistry.getAllToolNames(),
      totalTools: toolRegistry.size(),
      openAITools: toolRegistry.getAllOpenAITools(),
    };
  }
}

export const toolBridge = ToolBridge.getInstance();

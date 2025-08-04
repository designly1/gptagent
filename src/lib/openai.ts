// OpenAI API integration module
// This file handles all communication with OpenAI's Chat Completions API
// It reads the system prompt, gathers tool schemas, and makes API calls
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { toolRegistry } from '@/lib/tool-registry';

import type {
  ChatCompletionCreateParams,
  ChatCompletionTool,
} from 'openai/resources/chat/completions.js';

// Type alias for better readability
type Model = ChatCompletionCreateParams['model'];

// Configuration constants
const MODEL: Model = 'gpt-4o'; // The OpenAI model to use (can be changed here)
const SYSTEM_PROMPT_FILE = path.join(
  process.cwd(),
  'src',
  'lib',
  'system-prompt.md'
);

/**
 * Main function to communicate with OpenAI's Chat Completions API
 * This function constructs the full message array and calls OpenAI with all available tools
 * @param userMessages - Array of conversation messages (user and assistant messages, tool results)
 * @returns The assistant's response message, which may contain tool calls
 */
export async function runAssistant(
  userMessages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<OpenAI.Chat.ChatCompletionMessage | undefined> {
  // Initialize OpenAI client (uses OPENAI_API_KEY from environment)
  const openai = new OpenAI();

  // Read and validate the system prompt file
  if (!fs.existsSync(SYSTEM_PROMPT_FILE)) {
    throw new Error(`System prompt file not found: ${SYSTEM_PROMPT_FILE}`);
  }
  const systemPrompt = fs.readFileSync(SYSTEM_PROMPT_FILE, 'utf8');

  // Construct the complete message array with system prompt first
  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system', // System message defines the assistant's behavior
      content: systemPrompt,
    },
    ...userMessages, // All conversation history and tool results
  ];

  // Get all available tool schemas from the registry
  const tools: ChatCompletionTool[] = toolRegistry.getAllOpenAITools();

  // Make the API call with function calling enabled
  const response = await openai.chat.completions.create({
    model: MODEL,
    messages,
    tools, // Available functions the model can call
    tool_choice: 'auto', // Let the model decide when to use tools
  });

  // Extract the assistant's message from the response
  const message = response.choices[0]?.message;

  return message;
}

import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { toolRegistry } from '@/lib/tool-registry';

import type {
  ChatCompletionCreateParams,
  ChatCompletionTool,
} from 'openai/resources/chat/completions.js';

type Model = ChatCompletionCreateParams['model'];

const MODEL: Model = 'gpt-4o';
const SYSTEM_PROMPT_FILE = path.join(
  process.cwd(),
  'src',
  'lib',
  'system-prompt.md'
);

export async function runAssistant(
  userMessages: OpenAI.Chat.ChatCompletionMessageParam[]
): Promise<OpenAI.Chat.ChatCompletionMessage | undefined> {
  const openai = new OpenAI();

  if (!fs.existsSync(SYSTEM_PROMPT_FILE)) {
    throw new Error(`System prompt file not found: ${SYSTEM_PROMPT_FILE}`);
  }
  const systemPrompt = fs.readFileSync(SYSTEM_PROMPT_FILE, 'utf8');

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: 'system',
      content: systemPrompt,
    },
    ...userMessages,
  ];

  const tools: ChatCompletionTool[] = toolRegistry.getAllOpenAITools();

  const response = await openai.chat.completions.create({
    model: MODEL,
    messages,
    tools,
    tool_choice: 'auto',
  });

  const message = response.choices[0]?.message;

  return message;
}

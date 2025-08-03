import { toolBridge } from '@/lib/tool-bridge';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import cliHtml from 'cli-html';
import ora from 'ora';

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

const HISTORY_FILE = path.join(process.cwd(), 'data', 'history.json');

function printLine(text: string): void {
  process.stdout.write(text + '\n');
}

function htmlToCli(html: string): string {
  return cliHtml(html);
}

function ensureHistoryFileExists(): void {
  const dataDir = path.dirname(HISTORY_FILE);

  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2));
  }
}

export function getUserInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(chalk.yellow(question), answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

export async function getHistory(): Promise<ChatCompletionMessageParam[]> {
  ensureHistoryFileExists();
  const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')) || [];
  return history;
}

export async function saveHistory(history: ChatCompletionMessageParam[]) {
  ensureHistoryFileExists();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

export async function runCli(
  prompt?: string
): Promise<ChatCompletionMessageParam | undefined> {
  const userInput = prompt ?? (await getUserInput('Enter your request: '));
  if (!userInput) {
    printLine(chalk.red('No user input provided'));
    throw new Error('No user input provided');
  }

  toolBridge.initialize();
  printLine(chalk.green('Tool bridge initialized'));

  const history = await getHistory();

  const spinner = ora('Thinking...').start();
  let response;
  try {
    response = await toolBridge.runAssistantWithTools([
      ...history,
      {
        role: 'user',
        content: userInput,
      },
    ]);
  } finally {
    spinner.stop();
  }

  if (!response.content) {
    printLine(chalk.red('No response from the assistant'));
    throw new Error('No response from the assistant');
  }

  const content = response.content;
  if (!content || typeof content !== 'string') {
    printLine(chalk.red('Invalid response content from assistant'));
    throw new Error('Invalid response content from assistant');
  }

  printLine(htmlToCli(content));

  const updatedHistory: ChatCompletionMessageParam[] = [
    ...history,
    { role: 'user', content: userInput },
    { role: 'assistant', content },
  ];
  await saveHistory(updatedHistory);

  return response;
}

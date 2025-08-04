// CLI interface module - handles user interaction and conversation history
// This file manages the command-line interface, including input/output,
// conversation history persistence, and HTML-to-terminal formatting
import { toolBridge } from '@/lib/tool-bridge';
import readline from 'readline';
import fs from 'fs';
import path from 'path';
import chalk from 'chalk';
import cliHtml from 'cli-html';
import ora from 'ora';

import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions';

// Path where conversation history is stored persistently
const HISTORY_FILE = path.join(process.cwd(), 'data', 'history.json');

/**
 * Simple utility to print a line to stdout
 * Centralized for consistency and easy modification if needed
 */
function printLine(text: string): void {
  process.stdout.write(text + '\n');
}

/**
 * Converts HTML content to ANSI-colored terminal output
 * Uses the cli-html library to render HTML tags as terminal colors/formatting
 */
function htmlToCli(html: string): string {
  return cliHtml(html);
}

/**
 * Ensures the history file and its directory exist
 * Creates the data directory and an empty history file if they don't exist
 */
function ensureHistoryFileExists(): void {
  const dataDir = path.dirname(HISTORY_FILE);

  // Create data directory if it doesn't exist
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  // Create empty history file if it doesn't exist
  if (!fs.existsSync(HISTORY_FILE)) {
    fs.writeFileSync(HISTORY_FILE, JSON.stringify([], null, 2));
  }
}

/**
 * Prompts the user for input and returns their response
 * Uses readline to handle interactive input with colored prompts
 * @param question - The prompt text to show the user
 * @returns Promise that resolves to the user's trimmed input
 */
export function getUserInput(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    // Display prompt in yellow and wait for user input
    rl.question(chalk.yellow(question), answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

/**
 * Loads conversation history from the persistent JSON file
 * @returns Array of chat messages representing the conversation history
 */
export async function getHistory(): Promise<ChatCompletionMessageParam[]> {
  ensureHistoryFileExists();
  const history = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8')) || [];
  return history;
}

/**
 * Saves conversation history to the persistent JSON file
 * This allows conversations to continue across sessions
 * @param history - Array of chat messages to save
 */
export async function saveHistory(history: ChatCompletionMessageParam[]) {
  ensureHistoryFileExists();
  fs.writeFileSync(HISTORY_FILE, JSON.stringify(history, null, 2));
}

/**
 * Main CLI function that processes a user request end-to-end
 * This function orchestrates the entire conversation flow:
 * 1. Gets user input (from parameter or interactive prompt)
 * 2. Initializes the tool bridge
 * 3. Loads conversation history
 * 4. Runs the assistant with tools (handles the tool execution loop)
 * 5. Displays the response to the user
 * 6. Updates and saves conversation history
 * @param prompt - Optional prompt text (if not provided, asks user interactively)
 * @returns The assistant's response message
 */
export async function runCli(
  prompt?: string
): Promise<ChatCompletionMessageParam | undefined> {
  // Get user input either from parameter or interactive prompt
  const userInput = prompt ?? (await getUserInput('Enter your request: '));
  if (!userInput) {
    printLine(chalk.red('No user input provided'));
    throw new Error('No user input provided');
  }

  // Initialize the tool bridge (registers all available tools)
  toolBridge.initialize();
  printLine(chalk.green('Tool bridge initialized'));

  // Load conversation history from disk
  const history = await getHistory();

  // Show thinking spinner while processing
  const spinner = ora('Thinking...').start();
  let response;
  try {
    // Run the main conversation loop with tool execution
    response = await toolBridge.runAssistantWithTools([
      ...history, // Previous conversation context
      {
        role: 'user', // Current user message
        content: userInput,
      },
    ]);
  } finally {
    spinner.stop();
  }

  // Validate the response
  if (!response.content) {
    printLine(chalk.red('No response from the assistant'));
    throw new Error('No response from the assistant');
  }

  const content = response.content;
  if (!content || typeof content !== 'string') {
    printLine(chalk.red('Invalid response content from assistant'));
    throw new Error('Invalid response content from assistant');
  }

  // Display the assistant's response as formatted HTML
  printLine(htmlToCli(content));

  // Update conversation history and save to disk
  const updatedHistory: ChatCompletionMessageParam[] = [
    ...history,
    { role: 'user', content: userInput }, // User's question
    { role: 'assistant', content }, // Assistant's response
  ];
  await saveHistory(updatedHistory);

  return response;
}

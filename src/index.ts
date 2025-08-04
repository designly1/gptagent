// Main entry point for the GPT Agent CLI application
// This file handles command-line arguments and starts the interactive loop
import { runCli, getUserInput } from '../src/lib/client/cli';

// Immediately Invoked Function Expression (IIFE) to run the application
(async () => {
  // Check if a prompt was provided as a command-line argument
  // process.argv[2] is the first argument after 'node script.js'
  const prompt = process.argv[2];

  if (prompt) {
    // If prompt provided, run once and exit
    await runCli(prompt);
    process.exit(0);
  }

  // Interactive mode: keep asking for input until user types "."
  while (true) {
    const input = await getUserInput('Enter your request (or "." to exit): ');
    if (input.trim() === '.') {
      process.exit(0);
    }
    // Process each user input through the CLI
    await runCli(input);
  }
})();

import { runCli, getUserInput } from '../src/lib/client/cli';

(async () => {
  const prompt = process.argv[2];
  if (prompt) {
    await runCli(prompt);
    process.exit(0);
  }

  while (true) {
    const input = await getUserInput('Enter your request (or "." to exit): ');
    if (input.trim() === '.') {
      process.exit(0);
    }
    await runCli(input);
  }
})();

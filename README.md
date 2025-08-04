
# GPTAgent Educational Project

## Overview

This repository provides a simple **TypeScript/Node.js** implementation of a command‑line agent that talks to OpenAI’s chat models and can call external tools to fetch real‑world data.  The core idea is to demonstrate how you can augment a language model with **function calling** by registering tools that the model can invoke.  Out of the box, the agent supports fetching web pages, performing web searches via SearxNG, checking the weather via Open‑Meteo, and forward/reverse geocoding.  The project is intended for educational purposes and is small enough to understand but complete enough to extend.

At a high level:

- The entry point (`src/index.ts`) parses a prompt from the CLI and invokes the agent loop.  When no prompt is provided, it keeps asking the user for input.
- The CLI (`src/lib/client/cli.ts`) handles user input, maintains a JSON history on disk and prints the model’s HTML output using the [`cli-html` library](https://www.npmjs.com/package/cli-html).
- A **tool bridge** (`src/lib/tool-bridge.ts`) registers tools, calls the OpenAI Chat API with the system prompt plus the conversation history and handles any tool calls returned by the model.  It loops until the model stops requesting tools.
- A **tool registry** (`src/lib/tool-registry.ts`) stores tool definitions and handlers and makes them available to the OpenAI API.  It can execute tools by name and gather their OpenAI JSON schemas.
- The agent uses a structured system prompt (`src/lib/system-prompt.md`) to set its behaviour and HTML formatting guidelines.

The project relies on [OpenAI’s `openai` library](https://www.npmjs.com/package/openai), [Playwright](https://playwright.dev/) for page fetching, [SearxNG](https://searxng.org/) for search, and [Open‑Meteo](https://open-meteo.com/) for weather.  Docker Compose is used to run a local SearxNG instance.

---

## Project Structure

```
├─ docker-compose.yml      # starts a local SearxNG container on port 8080
├─ INSTALL.md              # step‑by‑step installation guide
├─ package.json            # scripts, dependencies and dev tools
├─ tsconfig.json           # TypeScript compiler configuration
├─ src
│  ├─ index.ts             # entry point to run the agent
│  └─ lib
│     ├─ system-prompt.md  # system instructions / HTML styling guidelines
│     ├─ openai.ts         # wraps OpenAI chat API and passes tool schemas
│     ├─ types.ts          # TypeScript interfaces for tools, calls and registry
│     ├─ tool-utils.ts     # helpers to build tool types and OpenAI schemas
│     ├─ tool-registry.ts  # registry that stores tools and executes handlers
│     ├─ tool-bridge.ts    # orchestrates tool execution for the assistant
│     └─ tools             # directory containing individual tool implementations
│        ├─ get/           # fetch a web page via Playwright
│        ├─ websearch/     # search via SearxNG
│        ├─ check-weather/ # current weather via Open‑Meteo
│        └─ geocode/       # forward & reverse geocoding
└─ src/tests               # sample tests (currently only a dummy test)
```

### Entry point and CLI

The executable entry point is `src/index.ts`, which imports `runCli` from the CLI module and invokes it with the prompt provided on the command line.  If no prompt is passed, it repeatedly asks the user for input until they enter a dot (`.`).  The CLI (`src/lib/client/cli.ts`) reads user input, displays prompts using [chalk](https://www.npmjs.com/package/chalk) for colours, and converts HTML responses from the assistant into ANSI‑coloured text with `cli-html`.  Conversation history is stored in a JSON file under `data/history.json`, enabling context to persist between requests.

### OpenAI integration

`src/lib/openai.ts` encapsulates all calls to OpenAI’s Chat API.  It reads a system prompt from `system-prompt.md` and constructs a message array containing the system instructions plus the conversation history.  It then gathers all registered tool schemas from the registry and passes them to the API via the `tools` field.  The model used is `gpt-4o`, but this can be changed via the `MODEL` constant.  The function returns the assistant’s message (which may contain tool calls).  If you set the environment variable `DEBUG=1`, all tool handler debug messages will be appended to `debug.log` via the `printLog` helper.

### Tool bridge and registry

`src/lib/tool-bridge.ts` is the core orchestrator.  It is implemented as a singleton class that registers tools once and then coordinates the conversation between the assistant and the tools.  During initialisation, it registers the built‑in tools (`check_weather`, `forward_geocode`, `reverse_geocode`, `web_search`, `get`) with the registry.  When `runAssistantWithTools()` is called, it repeatedly sends the current messages to OpenAI; if the response contains tool calls, it executes each call via the registry and appends the tool results back into the message list.  When no more tool calls are returned, the assistant’s final response is sent back to the CLI.  All tool metadata and handlers are stored in a map maintained by `ToolRegistryManager` (`src/lib/tool-registry.ts`).  The registry exposes methods to add tools, check existence, obtain a list of OpenAI tool schemas, and execute a tool by name.

### Built‑in tools

| Tool name       | Parameters                                | Returns                                             | Description |
|-----------------|-------------------------------------------|-----------------------------------------------------|-------------|
| **`get`**       | `url` (string)        | `html` (string) and `url`, plus `meta.title` | Uses Playwright to fetch a web page.  Only HTML/text resources are loaded; images, stylesheets and fonts are blocked.  If the page text is very long, it extracts the main readable content using Mozilla Readability. |
| **`web_search`**| `query` (string), `numResults` (number, default 5) | `results` array, `infoboxes`, `suggestions`, and an HTML summary | Sends a request to the local SearxNG instance (`http://localhost:8080/search?q=…`) and returns the top results.  The assistant can ask the user to select a result by number. |
| **`check_weather`**| `location` (string), `unit` (“celsius” or “fahrenheit”, default) | latitude/longitude, temperature, weather code & description, humidity, wind, pressure, cloud cover, and error if any | First geocodes the location via Open‑Meteo’s geocoding API and then fetches current weather via Open‑Meteo.  If multiple locations are found, it returns them so the user can choose. |
| **`forward_geocode`**| `address` (string) | list of places including `display_name`, `lat`, `lon` and address fields | Converts an address into latitude/longitude using the [maps.co](https://maps.co/) API.  Requires `GEOCODE_API_KEY` to be set. |
| **`reverse_geocode`**| `latitude` (number), `longitude` (number) | list of matching places with `display_name`, `lat` and `lon` | Converts coordinates back into a human‑readable address using the maps.co API.  Requires `GEOCODE_API_KEY`. |

An API key is required for geocoding, but you can obtain a free one at [geocode.maps.co](https://geocode.maps.co/).

Each tool is defined in a `def.ts` file using the `createToolType()` and `createOpenAIToolSchema()` helpers.  The corresponding `handler.ts` file implements the tool logic and returns a JSON object that matches the declared return type.  Tools can log debug messages using `printLog()`.

---

## Requirements & Installation

### Prerequisites

* **Node.js 18+ and pnpm** – the project uses ESM and requires Node 18 or newer.  The installation guide explains how to install Node via NVM.
* **Docker & Docker Compose** – required to run a local SearxNG instance for web search.
* **OpenAI API key** – the agent calls the Chat API.  Obtain an API key and set `OPENAI_API_KEY` in your `.env` file.
* **GEOCODE API key** – required for forward and reverse geocoding via maps.co.

### Installation steps

1. Clone this repository and navigate into it.
2. Install Node.js using NVM (see `INSTALL.md` for details).
3. Install dependencies and Playwright browsers:

   ```bash
   pnpm install
   pnpm exec playwright install
   ```

4. Copy `.env.example` to `.env` and fill in your keys and settings.  The important variables are shown below:

   ```env
   DEBUG=0                      # set to 1 to enable debug logging
   OPENAI_API_KEY="sk-..."    # your OpenAI key
   GEOCODE_API_KEY="..."      # your maps.co key
   SEARXNG_HOSTNAME=localhost
   SEARXNG_BASE_URL=http://localhost:8080/
   SEARXNG_SECRET=...          # used by the SearxNG container
   SEARXNG_DEBUG=false
   ```

5. Start the SearxNG search engine via Docker Compose:

   ```bash
   pnpm run boot  # equivalent to docker compose up -d
   ```

   This launches a local SearxNG service on `localhost:8080`.  Wait a few seconds for it to become responsive.

6. Run the agent in interactive mode:

   ```bash
   pnpm dev
   ```

   The CLI will prompt you to type questions.  To run a single query and exit, provide the prompt as an argument:

   ```bash
   pnpm dev "What’s the weather in Tokyo?"
   ```

7. When you are done testing, shut down the SearxNG container:

   ```bash
   pnpm run shutdown  # equivalent to docker compose down
   ```

### Clearing Conversation History

To clear the conversation history, you can run the following command:

```bash
pnpm clear:history
```

This will remove the `data/history.json` file, preventing the history from stacking up indefinitely.

### Building for production

To bundle the agent into a single JavaScript file in the `dist` folder, run:

```bash
pnpm build
```

This uses esbuild to generate `dist/agent.js`.  You can then run the compiled agent with:

```bash
node dist/agent.js "your prompt here"
```

---

## Using the Agent

Once started, the CLI will prompt you for a question.  The assistant will analyse the request, decide whether it needs to call a tool, and then reply in coloured HTML.  For example:

```
> Enter your request:
What is the capital of France and what’s the weather there right now?

🔍 Top Results for "capital of France":

  1. Paris – The capital city of France …
  2. …

Which result would you like to look up in detail? Reply with a number (1‑2).
```

If you reply with `1`, the assistant will call the `get` tool to fetch the selected page and then call `check_weather` for Paris.  The final answer will include both textual information and the current temperature.

You can run the agent in interactive mode or supply a query directly on the command line to get an immediate response.

Conversation history is saved to `data/history.json` and is automatically loaded for subsequent questions.  To clear the history, delete that file.  To enable verbose debugging of tool calls, set `DEBUG=1` in your `.env` file; log messages will be written to `debug.log`.

---

## Extending the Agent

One of the main learning goals of this project is to show how easy it is to add new capabilities.  Tools are separate modules consisting of a definition and a handler.  Follow these steps to create your own tool:

1. **Create a tool definition**.  Under `src/lib/tools/mytool/def.ts`, define TypeScript interfaces for the input parameters and return value.  Then call `createOpenAIToolSchema(name, description, properties, required)` to build the JSON schema, and wrap it in a tool object using `createToolType()`.  Example:

   ```ts
   // src/lib/tools/joke/def.ts
   import { createToolType, createOpenAIToolSchema } from '@/lib/tool-utils';
   export interface JokeParams { category: string; }
   export interface JokeResult { joke: string; }
   export const jokeTool = createToolType(
     'tell_joke',
     'Fetch a random joke from an external API',s
     createOpenAIToolSchema('tell_joke', 'Fetch a random joke', {
       category: { type: 'string', description: 'type of joke, e.g. general' }
     }, ['category'])
   );
   export { jokeHandler } from './handler';
   ```

2. **Implement the handler** in `src/lib/tools/mytool/handler.ts`.  The handler should accept the same parameter type and return the defined result type.  Use `fetch` or any other library to perform work.  If something goes wrong, return an object with an `error` property.

3. **Register the tool** in `ToolBridge.initialize()`.  Import your `jokeTool` and `jokeHandler` and call `toolRegistry.register()`.  This ensures the tool is exposed to OpenAI and can be invoked via function calls.

4. **Add any environment variables** your tool needs to `.env` and document them.

5. **Update the system prompt** if you want the assistant to know how to use the tool or to adjust formatting guidelines.

6. Optionally write tests under `src/tests` and run them with `pnpm test` (uses Vitest).

Because the tool registry abstracts away type details, adding a new tool requires only a few lines of code.  The model will automatically receive the tool schema and decide when to call it.

---

## Contributing

Contributions are welcome!  Feel free to open issues or pull requests to fix bugs, add new tools, or improve documentation.  When adding tools, please provide appropriate typings and update this README accordingly.  Tests are encouraged.

## License

This project is released under the MIT license as specified in `package.json`. 

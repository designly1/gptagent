
# GPTAgent Educational Project

## Overview

This repository provides a simple **TypeScript/Node.js** implementation of a command‑line agent that talks to OpenAI’s chat models and can call external tools to fetch real‑world data.  The core idea is to demonstrate how you can augment a language model with **function calling** by registering tools that the model can invoke.  Out of the box, the agent supports fetching web pages, performing web searches via SearxNG, checking the weather via Open‑Meteo, and forward/reverse geocoding.  The project is intended for educational purposes and is small enough to understand but complete enough to extend.

At a high level:

- The entry point (`src/index.ts`) parses a prompt from the CLI and invokes the agent loophttps://github.com/designly1/gptagent/blob/HEAD/src/index.ts#L1-L17.  When no prompt is provided, it keeps asking the user for input.
- The CLI (`src/lib/client/cli.ts`) handles user input, maintains a JSON history on disk and prints the model’s HTML output using the [`cli-html` library](https://www.npmjs.com/package/cli-html)https://github.com/designly1/gptagent/blob/HEAD/src/lib/client/cli.ts#L61-L106.
- A **tool bridge** (`src/lib/tool-bridge.ts`) registers tools, calls the OpenAI Chat API with the system prompt plus the conversation history and handles any tool calls returned by the modelhttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-bridge.ts#L38-L45.  It loops until the model stops requesting toolshttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-bridge.ts#L82-L107.
- A **tool registry** (`src/lib/tool-registry.ts`) stores tool definitions and handlers and makes them available to the OpenAI APIhttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-registry.ts#L15-L73.  It can execute tools by name and gather their OpenAI JSON schemashttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-registry.ts#L37-L69.
- The agent uses a structured system prompt (`src/lib/system-prompt.md`) to set its behaviour and HTML formatting guidelineshttps://github.com/designly1/gptagent/blob/HEAD/src/lib/system-prompt.md#L1-L36.

The project relies on [OpenAI’s `openai` library](https://www.npmjs.com/package/openai), [Playwright](https://playwright.dev/) for page fetching, [SearxNG](https://searxng.org/) for search, and [Open‑Meteo](https://open-meteo.com/) for weather.  Docker Compose is used to run a local SearxNG instance.

---

## Project Structure

```
├─ docker-compose.yml      # starts a local SearxNG container on port 8080
├─ INSTALL.md              # step‑by‑step installation guide
├─ package.json            # scripts, dependencies and dev toolshttps://github.com/designly1/gptagent/blob/HEAD/package.json#L7-L20
├─ tsconfig.json           # TypeScript compiler configurationhttps://github.com/designly1/gptagent/blob/HEAD/tsconfig.json#L1-L32
├─ src
│  ├─ index.ts             # entry point to run the agenthttps://github.com/designly1/gptagent/blob/HEAD/src/index.ts#L1-L17
│  └─ lib
│     ├─ system-prompt.md  # system instructions / HTML styling guidelineshttps://github.com/designly1/gptagent/blob/HEAD/src/lib/system-prompt.md#L1-L36
│     ├─ openai.ts         # wraps OpenAI chat API and passes tool schemashttps://github.com/designly1/gptagent/blob/HEAD/src/lib/openai.ts#L21-L46
│     ├─ types.ts          # TypeScript interfaces for tools, calls and registryhttps://github.com/designly1/gptagent/blob/HEAD/src/lib/types.ts#L1-L71
│     ├─ tool-utils.ts     # helpers to build tool types and OpenAI schemashttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-utils.ts#L1-L45
│     ├─ tool-registry.ts  # registry that stores tools and executes handlershttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-registry.ts#L15-L81
│     ├─ tool-bridge.ts    # orchestrates tool execution for the assistanthttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-bridge.ts#L38-L49
│     └─ tools             # directory containing individual tool implementations
│        ├─ get/           # fetch a web page via Playwright
│        ├─ websearch/     # search via SearxNG
│        ├─ check-weather/ # current weather via Open‑Meteo
│        └─ geocode/       # forward & reverse geocoding
└─ src/tests               # sample tests (currently only a dummy test)https://github.com/designly1/gptagent/blob/HEAD/src/tests/dummy.ts#L1-L7
```

### Entry point and CLI

The executable entry point is `src/index.ts`, which imports `runCli` from the CLI module and invokes it with the prompt provided on the command line.  If no prompt is passed, it repeatedly asks the user for input until they enter a dot (`.`)https://github.com/designly1/gptagent/blob/HEAD/src/index.ts#L10-L17.  The CLI (`src/lib/client/cli.ts`) reads user input, displays prompts using [chalk](https://www.npmjs.com/package/chalk) for colours, and converts HTML responses from the assistant into ANSI‑coloured text with `cli-html`https://github.com/designly1/gptagent/blob/HEAD/src/lib/client/cli.ts#L61-L106.  Conversation history is stored in a JSON file under `data/history.json`, enabling context to persist between requestshttps://github.com/designly1/gptagent/blob/HEAD/src/lib/client/cli.ts#L53-L104.

### OpenAI integration

`src/lib/openai.ts` encapsulates all calls to OpenAI’s Chat API.  It reads a system prompt from `system-prompt.md` and constructs a message array containing the system instructions plus the conversation historyhttps://github.com/designly1/gptagent/blob/HEAD/src/lib/openai.ts#L21-L44.  It then gathers all registered tool schemas from the registry and passes them to the API via the `tools` fieldhttps://github.com/designly1/gptagent/blob/HEAD/src/lib/openai.ts#L39-L45.  The model used is `gpt-4o`https://github.com/designly1/gptagent/blob/HEAD/src/lib/openai.ts#L11-L14, but this can be changed via the `MODEL` constant.  The function returns the assistant’s message (which may contain tool calls).  If you set the environment variable `DEBUG=1`, all tool handler debug messages will be appended to `debug.log` via the `printLog` helperhttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-utils.ts#L47-L54.

### Tool bridge and registry

`src/lib/tool-bridge.ts` is the core orchestrator.  It is implemented as a singleton class that registers tools once and then coordinates the conversation between the assistant and the tools.  During initialisation, it registers the built‑in tools (`check_weather`, `forward_geocode`, `reverse_geocode`, `web_search`, `get`) with the registryhttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-bridge.ts#L38-L43.  When `runAssistantWithTools()` is called, it repeatedly sends the current messages to OpenAI; if the response contains tool calls, it executes each call via the registry and appends the tool results back into the message listhttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-bridge.ts#L82-L107.  When no more tool calls are returned, the assistant’s final response is sent back to the CLI.  All tool metadata and handlers are stored in a map maintained by `ToolRegistryManager` (`src/lib/tool-registry.ts`)https://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-registry.ts#L15-L73.  The registry exposes methods to add tools, check existence, obtain a list of OpenAI tool schemas, and execute a tool by namehttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-registry.ts#L37-L69.

### Built‑in tools

| Tool name       | Parameters                                | Returns                                             | Description |
|-----------------|-------------------------------------------|-----------------------------------------------------|-------------|
| **`get`**       | `url` (string)https://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/get/def.ts#L4-L7        | `html` (string) and `url`, plus `meta.title`https://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/get/handler.ts#L67-L71 | Uses Playwright to fetch a web page.  Only HTML/text resources are loaded; images, stylesheets and fonts are blocked.  If the page text is very long, it extracts the main readable content using Mozilla Readabilityhttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/get/handler.ts#L57-L70. |
| **`web_search`**| `query` (string), `numResults` (number, default 5)https://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/websearch/def.ts#L68-L104 | `results` array, `infoboxes`, `suggestions`, and an HTML summaryhttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/websearch/handler.ts#L30-L68 | Sends a request to the local SearxNG instance (`http://localhost:8080/search?q=…`) and returns the top results.  The assistant can ask the user to select a result by numberhttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/websearch/handler.ts#L41-L51. |
| **`check_weather`**| `location` (string), `unit` (“celsius” or “fahrenheit”, default)https://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/check-weather/def.ts#L4-L8https://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/check-weather/def.ts#L91-L108 | latitude/longitude, temperature, weather code & description, humidity, wind, pressure, cloud cover, and error if anyhttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/check-weather/handler.ts#L240-L257 | First geocodes the location via Open‑Meteo’s geocoding API and then fetches current weather via Open‑Meteo.  If multiple locations are found, it returns them so the user can choosehttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/check-weather/handler.ts#L222-L226. |
| **`forward_geocode`**| `address` (string)https://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/geocode/def.ts#L4-L6https://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/geocode/def.ts#L71-L86 | list of places including `display_name`, `lat`, `lon` and address fieldshttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/geocode/handler.ts#L91-L101 | Converts an address into latitude/longitude using the [maps.co](https://maps.co/) API.  Requires `GEOCODE_API_KEY` to be sethttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/geocode/handler.ts#L11-L27. |
| **`reverse_geocode`**| `latitude` (number), `longitude` (number)https://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/geocode/def.ts#L89-L106 | list of matching places with `display_name`, `lat` and `lon`https://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/geocode/handler.ts#L150-L161 | Converts coordinates back into a human‑readable address using the maps.co API.  Requires `GEOCODE_API_KEY`https://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/geocode/handler.ts#L45-L54. |

Each tool is defined in a `def.ts` file using the `createToolType()` and `createOpenAIToolSchema()` helpershttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-utils.ts#L27-L45.  The corresponding `handler.ts` file implements the tool logic and returns a JSON object that matches the declared return type.  Tools can log debug messages using `printLog()`https://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-utils.ts#L47-L54.

---

## Requirements & Installation

### Prerequisites

* **Node.js 18+ and pnpm** – the project uses ESM and requires Node 18 or newer.  The installation guide explains how to install Node via NVMhttps://github.com/designly1/gptagent/blob/HEAD/INSTALL.md#L3-L45.
* **Docker & Docker Compose** – required to run a local SearxNG instance for web searchhttps://github.com/designly1/gptagent/blob/HEAD/docker-compose.yml#L1-L14.
* **OpenAI API key** – the agent calls the Chat API.  Obtain an API key and set `OPENAI_API_KEY` in your `.env` filehttps://github.com/designly1/gptagent/blob/HEAD/INSTALL.md#L83-L85.
* **GEOCODE API key** – required for forward and reverse geocoding via maps.cohttps://github.com/designly1/gptagent/blob/HEAD/src/lib/tools/geocode/handler.ts#L11-L27.

### Installation steps

1. Clone this repository and navigate into it.
2. Install Node.js using NVM (see `INSTALL.md` for details)https://github.com/designly1/gptagent/blob/HEAD/INSTALL.md#L3-L59.
3. Install dependencies and Playwright browsers:

   ```bash
   pnpm install
   pnpm exec playwright install
   ```

4. Copy `.env.example` to `.env` and fill in your keys and settings.  The important variables are shown belowhttps://github.com/designly1/gptagent/blob/HEAD/INSTALL.md#L83-L90:

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
   pnpm run boot  # equivalent to docker compose up -dhttps://github.com/designly1/gptagent/blob/HEAD/package.json#L17-L19
   ```

   This launches a local SearxNG service on `localhost:8080`.  Wait a few seconds for it to become responsive.

6. Run the agent in interactive mode:

   ```bash
   pnpm dev
   ```

   The CLI will prompt you to type questions.  To run a single query and exit, provide the prompt as an argumenthttps://github.com/designly1/gptagent/blob/HEAD/INSTALL.md#L109-L117:

   ```bash
   pnpm dev "What’s the weather in Tokyo?"
   ```

7. When you are done testing, shut down the SearxNG container:

   ```bash
   pnpm run shutdown  # equivalent to docker compose downhttps://github.com/designly1/gptagent/blob/HEAD/package.json#L17-L20
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

This uses esbuild to generate `dist/agent.js`https://github.com/designly1/gptagent/blob/HEAD/package.json#L17-L20.  You can then run the compiled agent with:

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

If you reply with `1`, the assistant will call the `get` tool to fetch the selected pagehttps://github.com/designly1/gptagent/blob/HEAD/src/lib/system-prompt.md#L8-L9 and then call `check_weather` for Paris.  The final answer will include both textual information and the current temperature.

Conversation history is saved to `data/history.json` and is automatically loaded for subsequent questionshttps://github.com/designly1/gptagent/blob/HEAD/src/lib/client/cli.ts#L67-L104.  To clear the history, delete that file.  To enable verbose debugging of tool calls, set `DEBUG=1` in your `.env` file; log messages will be written to `debug.log`https://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-utils.ts#L47-L54.

---

## Extending the Agent

One of the main learning goals of this project is to show how easy it is to add new capabilities.  Tools are separate modules consisting of a definition and a handler.  Follow these steps to create your own tool:

1. **Create a tool definition**.  Under `src/lib/tools/mytool/def.ts`, define TypeScript interfaces for the input parameters and return value.  Then call `createOpenAIToolSchema(name, description, properties, required)` to build the JSON schema, and wrap it in a tool object using `createToolType()`https://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-utils.ts#L27-L45.  Example:

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

3. **Register the tool** in `ToolBridge.initialize()`.  Import your `jokeTool` and `jokeHandler` and call `toolRegistry.register()`https://github.com/designly1/gptagent/blob/HEAD/src/lib/tool-bridge.ts#L38-L43.  This ensures the tool is exposed to OpenAI and can be invoked via function calls.

4. **Add any environment variables** your tool needs to `.env` and document them.

5. **Update the system prompt** if you want the assistant to know how to use the tool or to adjust formatting guidelineshttps://github.com/designly1/gptagent/blob/HEAD/src/lib/system-prompt.md#L1-L36.

6. Optionally write tests under `src/tests` and run them with `pnpm test` (uses Vitest).

Because the tool registry abstracts away type details, adding a new tool requires only a few lines of code.  The model will automatically receive the tool schema and decide when to call it.

---

## Contributing

Contributions are welcome!  Feel free to open issues or pull requests to fix bugs, add new tools, or improve documentation.  When adding tools, please provide appropriate typings and update this README accordingly.  Tests are encouraged.

## License

This project is released under the MIT license as specified in `package.json`https://github.com/designly1/gptagent/blob/HEAD/package.json#L25-L26.

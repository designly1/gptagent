# Installation Guide

1. **Install NVM (Node Version Manager) and Node.js**

### macOS & Linux

- Install NVM (recommended):
  ```sh
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  # or
  wget -qO- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
  ```
- Add to your shell config if not auto-added (e.g., `~/.bashrc`, `~/.zshrc`, or `~/.profile`):
  ```sh
  export NVM_DIR="$HOME/.nvm"
  [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
  ```
- Reload your shell:
  ```sh
  source ~/.bashrc   # or ~/.zshrc, ~/.profile, etc.
  ```
- Verify installation:
  ```sh
  nvm --version
  ```

### Windows

- Download and install [nvm-windows](https://github.com/coreybutler/nvm-windows/releases):
  1. Download the latest `nvm-setup.exe` from the releases page.
  2. Run the installer and follow the prompts.
  3. Open a new Command Prompt and verify:
     ```sh
     nvm version
     ```

### Install Node.js using NVM

- To install the latest LTS version:
  ```sh
  nvm install --lts
  nvm use --lts
  ```
- To install a specific version:
  ```sh
  nvm install 20
  nvm use 20
  ```
- Verify Node and npm:
  ```sh
  node -v
  npm -v
  ```

### (Optional) Project-specific Node Version
- Add a `.nvmrc` file to your project root with the desired Node version (e.g., `18.17.1`), then run:
  ```sh
  nvm use
  ```

---

2. **Install dependencies**

   ```sh
   pnpm add
   pnpm exec playwright install
   ```

3. **Docker Requirements**

   - You must have a current version of Docker and Docker Compose installed.
   - Docker Desktop is recommended for Mac and Windows users.
   - Make sure Docker is running before starting the project.

---

4. **Create a `.env` file for Docker Compose**

Create a file named `.env` in your project root with the following content (edit as needed):

```env
DEBUG=0
OPENAI_API_KEY="sk-svcacct-xxx..."
GEOCODE_API_KEY="f84hf..."
SEARXNG_HOSTNAME=localhost
SEARXNG_BASE_URL=http://localhost:8080/
SEARXNG_SECRET=your_32_char_hex_secret
SEARXNG_DEBUG=false
```

**How to generate a secure 32-character hex string:**

- **Mac/Linux:**
  ```sh
  openssl rand -hex 16
  ```
- **Windows:**
  - If you have Git Bash, WSL, or OpenSSL, use the same command as above.
  - Or use PowerShell:
    ```powershell
    -join ((1..16) | ForEach-Object { '{0:x2}' -f (Get-Random -Minimum 0 -Maximum 256) })
    ```

---

5. **Start the project in interactive mode:**

   ```sh
   pnpm dev
   ```

   To run a single prompt and exit, provide your prompt as a CLI argument:

   ```sh
   pnpm dev "your prompt here"
   ```


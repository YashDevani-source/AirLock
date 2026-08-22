# GitHub Webhook Automator CLI (`gh-webhook-cli` / `mycli`)

> Production-ready Node.js + TypeScript CLI tool that automates GitHub OAuth authentication (Device Authorization Flow), repository selection, VPS IP/domain and route configuration, and repository webhook management.

---

## Features

- 🔐 **GitHub Device Authorization Flow**: Authenticate securely without storing hardcoded tokens or exposing credentials.
- 📦 **Interactive Repository Picker**: Search and select from accessible user & organization repositories, or manually enter `owner/repository`.
- 🌐 **VPS Server Configuration**: Validate IPv4, IPv6, or domain names, with protocol selection (HTTP/HTTPS), custom ports, and route normalization.
- 🪝 **Automated Webhook Deployment**: Checks for duplicate webhooks on GitHub and supports Keep, Update, or Delete & Recreate workflows.
- 🔒 **Isolated Credential Security**: Non-sensitive settings (`config.json`) are separated from access tokens and webhook secrets (`credentials.json` stored with `0600` file permissions).
- ⚡ **Full CLI Toolsuite**: Dedicated commands for `login`, `setup`, `webhook create`, `config set-ip`, `config set-route`, `status`, and `logout`.

---

## Tech Stack

* **Runtime**: Node.js (v20+) & TypeScript
* **CLI Framework**: Commander.js
* **GitHub Integration**: Octokit (`@octokit/rest`) & GitHub OAuth Device Flow (`@octokit/auth-oauth-device`)
* **Validation**: Zod & custom network host validators
* **Interactive UI**: `@inquirer/prompts`, Chalk, and Ora
* **Config Storage**: `conf` with isolated file permissions
* **Build & Test**: `tsup` & `vitest`

---

## Installation & Setup

### Global Installation

```bash
npm install -g gh-webhook-cli
```

Or clone and build locally:

```bash
git clone https://github.com/your-username/auto-dep.git
cd auto-dep
npm install
npm run build
npm link
```

Now you can use `mycli` or `gh-webhook-cli` directly in your terminal.

---

## GitHub OAuth App Setup (Device Authorization Flow)

To enable GitHub Device Flow authentication:

1. Go to **GitHub Developer Settings**: [GitHub OAuth Apps](https://github.com/settings/developers).
2. Click **New OAuth App**.
3. Fill in:
   - **Application name**: `GitHub Webhook Automator CLI`
   - **Homepage URL**: `https://github.com`
   - **Authorization callback URL**: `https://github.com`
4. Under **Enable Device Flow**, check the box **Enable Device Flow**.
5. Save the **Client ID**.
6. Set the `GITHUB_CLIENT_ID` environment variable or add it to a `.env` file in your workspace:

```bash
GITHUB_CLIENT_ID=your_oauth_app_client_id
```

---

## CLI Usage & Commands

### 1. Complete Interactive Setup Wizard

```bash
mycli setup
```

Guides you step-by-step through authentication, repository selection, VPS IP/domain input, route normalization, and automated webhook creation.

### 2. GitHub Login

```bash
mycli login
```

Initiates the OAuth Device Authorization Flow:
1. Displays verification URL and user code.
2. Waits for authorization on GitHub.
3. Verifies the user account (`✓ Logged in as: username`).
4. Saves credentials securely.

### 3. Webhook Management

```bash
mycli webhook create
```

Interactively selects a repository, configures VPS server IP/domain, route, protocol, and optional webhook secret signature token, then creates or updates the webhook on GitHub.

### 4. Configuration Helpers

Save VPS IP or domain name:

```bash
mycli config set-ip 123.45.67.89
```

Or with a domain name:

```bash
mycli config set-ip server.example.com
```

Save webhook route path:

```bash
mycli config set-route /github-webhook
```

### 5. Check CLI Status

```bash
mycli status
```

Displays:
- Authenticated GitHub user
- Selected repository
- VPS Host / Domain
- Webhook route & generated URL
- Remote GitHub webhook status

### 6. Logout & Secure Wipe

```bash
mycli logout
```

Removes local GitHub authentication tokens securely.

---

## Webhook URL Generation & Normalization

Routes are automatically normalized so both inputs generate the exact same valid URL:

- Input: `github-webhook` $\rightarrow$ `/github-webhook`
- Input: `/github-webhook/` $\rightarrow$ `/github-webhook`

Examples of generated Webhook URLs:

```text
http://123.45.67.89/github-webhook
https://server.example.com/github-webhook
http://123.45.67.89:3000/github-webhook
```

---

## Security Model

1. **No Hardcoded Tokens**: Access tokens are issued dynamically via OAuth Device Authorization.
2. **Credential Separation**: Secrets (`accessToken`, `webhookSecret`) are stored separately from non-sensitive CLI settings, with restricted file system permissions (`0600`).
3. **Secret Masking**: Webhook secrets and authentication tokens are masked in log outputs.
4. **Insecure Protocol Warning**: Displays clear warnings when configuring HTTP instead of HTTPS endpoints.

---

## Development & Testing

Run TypeScript type check:

```bash
npm run type-check
```

Run unit and integration tests:

```bash
npm test
```

Build production binary:

```bash
npm run build
```

Run CLI locally via `tsx`:

```bash
npm run dev -- status
```

---

## License

MIT © 2026

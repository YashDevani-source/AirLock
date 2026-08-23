<p align="center">
  <h1 align="center">🚀 auto-cicd-cli</h1>
  <p align="center">
    <strong>Automate GitHub authentication, webhook setup, and CI/CD pipeline management from your terminal.</strong>
  </p>
  <p align="center">
    <a href="https://www.npmjs.com/package/auto-cicd-cli"><img src="https://img.shields.io/npm/v/auto-cicd-cli?style=flat-square&color=cb3837" alt="npm version"></a>
    <a href="https://www.npmjs.com/package/auto-cicd-cli"><img src="https://img.shields.io/npm/dm/auto-cicd-cli?style=flat-square&color=blue" alt="npm downloads"></a>
    <a href="https://github.com/YashDevani-source/AirLock/blob/main/LICENSE"><img src="https://img.shields.io/npm/l/auto-cicd-cli?style=flat-square" alt="license"></a>
    <img src="https://img.shields.io/node/v/auto-cicd-cli?style=flat-square&color=339933" alt="node version">
  </p>
</p>

---

## What is auto-cicd-cli?

A production-ready **Node.js + TypeScript** CLI tool that handles the full lifecycle of connecting your GitHub repository to your VPS:

1. **Authenticate** with GitHub using secure OAuth Device Flow (no tokens in code).
2. **Select** a repository interactively or by name.
3. **Configure** your VPS IP/domain, port, route, and protocol.
4. **Create** a GitHub webhook automatically — with duplicate detection.
5. **Receive** webhook events on your server with signature verification.

One command to set it all up:

```bash
auto-cicd-cli setup
```

---

## Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [Commands Reference](#commands-reference)
- [Setup Wizard Walkthrough](#setup-wizard-walkthrough)
- [Webhook Server](#webhook-server)
- [GitHub OAuth App Setup](#github-oauth-app-setup)
- [Authentication Flow](#authentication-flow)
- [Webhook URL Generation](#webhook-url-generation)
- [Configuration Storage](#configuration-storage)
- [Security Model](#security-model)
- [Project Architecture](#project-architecture)
- [Development](#development)
- [License](#license)

---

## Quick Start

```bash
# Install globally
npm install -g auto-cicd-cli

# Run the interactive setup wizard
auto-cicd-cli setup

# Start the webhook receiver on your VPS
auto-cicd-cli serve -p 3000
```

That's it. Push to your repository and watch the events roll in.

---

## Installation

### From npm (recommended)

```bash
npm install -g auto-cicd-cli
```

### From source

```bash
git clone https://github.com/YashDevani-source/AirLock.git
cd AirLock
npm install
npm run build
npm link
```

### Verify installation

```bash
auto-cicd-cli --version
auto-cicd-cli --help
```

> **Requires** Node.js v20.0.0 or higher.

---

## Commands Reference

### `auto-cicd-cli setup`

Run the complete interactive setup wizard. Walks you through authentication, repository selection, VPS configuration, and webhook creation in one flow.

```bash
auto-cicd-cli setup
```

---

### `auto-cicd-cli login`

Authenticate with GitHub using the OAuth Device Authorization Flow.

```bash
auto-cicd-cli login
```

The CLI will display a URL and a one-time code. Open the URL in your browser, enter the code, and authorize the app. No tokens are ever typed into the terminal.

```
=== GitHub Authentication Required ===

1. Please visit the authorization URL in your browser:
   https://github.com/login/device

2. Enter the following code:
     ABCD-1234

Waiting for authorization...

✓ Logged in as: YashDevani-source
```

---

### `auto-cicd-cli webhook create`

Interactively create a GitHub webhook for a repository. Includes:

- Repository selection (interactive list or manual `owner/repo` entry)
- VPS IP/domain, protocol, port, and route configuration
- Optional webhook secret for payload signature verification
- Duplicate webhook detection (keep / update / delete & recreate)

```bash
auto-cicd-cli webhook create
```

---

### `auto-cicd-cli serve`

Start the webhook receiver server on your VPS. Listens for incoming GitHub events, verifies signatures (if a secret is configured), and detects pushes to your deploy branch.

```bash
# Use the saved port from config
auto-cicd-cli serve

# Override port
auto-cicd-cli serve -p 3000
```

Output:

```
🚀 Starting webhook server

   route:  /github-webhook
   port:   3000
   branch: main (push here runs the deploy script)
   secret: configured

Webhook server listening on http://0.0.0.0:3000/github-webhook
Waiting for GitHub events... (Ctrl+C to stop)

--> POST /github-webhook
    event: push  delivery: abc-123
    signature: valid

>>> Push to 'main' detected — deploy script hit!
```

---

### `auto-cicd-cli status`

Display the current configuration and remote webhook status at a glance.

```bash
auto-cicd-cli status
```

```
=== GitHub Webhook Automator Status ===

Authenticated GitHub User: ✓ YashDevani-source
Selected Repository:       YashDevani-source/ResumeAI
VPS Host / Domain:         210.79.129.43:3000
Webhook Route:             /resumeai
Generated Webhook URL:     http://210.79.129.43:3000/resumeai
Remote Webhook Status:     Active (Hook ID: #12345, Events: push, pull_request)
```

---

### `auto-cicd-cli config`

Granular configuration commands to update individual settings without re-running the full setup.

| Command | Description | Example |
|---------|-------------|---------|
| `config set-ip <host>` | Save VPS public IP or domain | `auto-cicd-cli config set-ip 210.79.129.43` |
| `config set-port <port>` | Save custom port (`"none"` to clear) | `auto-cicd-cli config set-port 3000` |
| `config set-route <route>` | Save webhook endpoint route | `auto-cicd-cli config set-route /github-webhook` |
| `config set-branch <branch>` | Set deploy trigger branch | `auto-cicd-cli config set-branch main` |
| `config clear-secret` | Remove saved webhook secret | `auto-cicd-cli config clear-secret` |

---

### `auto-cicd-cli logout`

Securely remove stored GitHub authentication credentials from your machine.

```bash
auto-cicd-cli logout
```

---

## Setup Wizard Walkthrough

Running `auto-cicd-cli setup` walks you through the complete flow:

```
🚀 Starting GitHub Webhook Setup Wizard

1. Checking GitHub authentication...
   ✓ Logged in as YashDevani-source

3. Repository Selection
   Fetching accessible GitHub repositories...

   Select a repository:
   ❯ YashDevani-source/ResumeAI
     YashDevani-source/AirLock
     ➕ Manually enter repository (owner/repository)

   ✓ Selected repository: YashDevani-source/ResumeAI

4. Configure Server Settings
   Enter your VPS public IP or domain name: 210.79.129.43
   Select protocol: HTTP
   Enter custom port: 3000
   Enter webhook route: /resumeai
   Configure a webhook secret? No

   Generated Webhook URL:
     http://210.79.129.43:3000/resumeai

5. Checking existing repository webhooks...

6. Creating GitHub webhook...
   ✓ Webhook created successfully!

✓ Webhook Setup Complete!

Repository:
  YashDevani-source/ResumeAI

Webhook URL:
  http://210.79.129.43:3000/resumeai

Events:
  - push
  - pull_request
```

---

## Webhook Server

The `serve` command starts an HTTP server on your VPS that:

- **Listens** on the configured route and port for incoming GitHub webhook deliveries
- **Verifies** payload signatures using HMAC-SHA256 (when a webhook secret is configured)
- **Detects** push events to your deploy branch and logs a deploy trigger
- **Auto-recovers** if the port is already in use (kills the stale process automatically)

### Running on a VPS

```bash
# Install
npm install -g auto-cicd-cli

# Configure (or use `auto-cicd-cli setup`)
auto-cicd-cli config set-ip 210.79.129.43
auto-cicd-cli config set-port 3000
auto-cicd-cli config set-route /resumeai
auto-cicd-cli config set-branch main

# Start the server
auto-cicd-cli serve
```

### Running in the background

Use a process manager like `pm2` or `nohup`:

```bash
# With pm2
pm2 start "auto-cicd-cli serve -p 3000" --name webhook-server

# With nohup
nohup auto-cicd-cli serve -p 3000 > webhook.log 2>&1 &
```

---

## GitHub OAuth App Setup

The CLI uses GitHub's **Device Authorization Flow** for secure, tokenless authentication. It works out of the box with a built-in Client ID, but you can also use your own:

### Using your own OAuth App (optional)

1. Go to [GitHub Developer Settings → OAuth Apps](https://github.com/settings/developers).
2. Click **New OAuth App**.
3. Fill in:
   - **Application name**: `Auto CI/CD CLI`
   - **Homepage URL**: `https://github.com/YashDevani-source/AirLock`
   - **Authorization callback URL**: `https://github.com`
4. Check **Enable Device Flow**.
5. Copy the **Client ID** and set it:

```bash
export GITHUB_CLIENT_ID=your_client_id_here
```

Or add it to a `.env` file in your project root:

```env
GITHUB_CLIENT_ID=your_client_id_here
```

### Required OAuth Scopes

The CLI requests these scopes during authentication:

| Scope | Purpose |
|-------|---------|
| `repo` | Access private and public repositories |
| `read:user` | Read authenticated user profile |
| `admin:repo_hook` | Create and manage repository webhooks |

---

## Authentication Flow

```
┌──────────────┐      ┌───────────────┐      ┌──────────────┐
│   CLI Tool   │      │   GitHub API  │      │   Browser    │
└──────┬───────┘      └───────┬───────┘      └──────┬───────┘
       │                      │                      │
       │  Request device code │                      │
       │─────────────────────>│                      │
       │                      │                      │
       │  device_code +       │                      │
       │  user_code + URL     │                      │
       │<─────────────────────│                      │
       │                      │                      │
       │  Display code & URL to user                 │
       │─────────────────────────────────────────────>│
       │                      │                      │
       │                      │  User enters code    │
       │                      │<─────────────────────│
       │                      │                      │
       │  Poll for token      │                      │
       │─────────────────────>│                      │
       │                      │                      │
       │  Access token        │                      │
       │<─────────────────────│                      │
       │                      │                      │
       │  Store securely      │                      │
       └──────────────────────┘                      │
```

---

## Webhook URL Generation

The CLI constructs webhook URLs from your configuration:

```
protocol://host[:port]/route
```

### Route Normalization

Routes are automatically normalized — both of these produce the same result:

| Input | Normalized |
|-------|-----------|
| `github-webhook` | `/github-webhook` |
| `/github-webhook/` | `/github-webhook` |
| `api/v1/hook` | `/api/v1/hook` |

### URL Examples

| Protocol | Host | Port | Route | Generated URL |
|----------|------|------|-------|---------------|
| `http` | `123.45.67.89` | — | `/github-webhook` | `http://123.45.67.89/github-webhook` |
| `http` | `210.79.129.43` | `3000` | `/resumeai` | `http://210.79.129.43:3000/resumeai` |
| `https` | `example.com` | — | `/webhook` | `https://example.com/webhook` |
| `https` | `server.dev` | `8443` | `/hooks/github` | `https://server.dev:8443/hooks/github` |

> Default ports (80 for HTTP, 443 for HTTPS) are omitted from the URL automatically.

---

## Configuration Storage

Configuration is split into two isolated stores:

### Non-sensitive configuration

Stored in your OS config directory (managed by `conf`):

```json
{
  "github": {
    "username": "YashDevani-source"
  },
  "repository": {
    "owner": "YashDevani-source",
    "name": "ResumeAI",
    "branch": "main"
  },
  "server": {
    "protocol": "http",
    "host": "210.79.129.43",
    "port": 3000,
    "route": "/resumeai"
  }
}
```

### Secrets (credentials)

Stored in a separate file with **0600 permissions** (owner read/write only):

- GitHub access token
- Webhook secret (if configured)

Secrets are **never** printed in CLI output, logs, or error messages.

---

## Security Model

| Principle | Implementation |
|-----------|---------------|
| **No hardcoded tokens** | OAuth Device Flow issues tokens dynamically |
| **Credential isolation** | Secrets stored separately with `0600` file permissions |
| **Secret masking** | Tokens and secrets are never printed in logs or output |
| **Signature verification** | `serve` command verifies HMAC-SHA256 webhook signatures |
| **Timing-safe comparison** | Uses `crypto.timingSafeEqual` to prevent timing attacks |
| **Insecure protocol warnings** | Warns when HTTP is selected instead of HTTPS |
| **Input validation** | All inputs validated with Zod schemas (IP, domain, port, route) |
| **Least privilege scopes** | Only requests necessary GitHub OAuth scopes |

---

## Project Architecture

```
src/
├── index.ts                  # CLI entry point (Commander.js)
├── commands/
│   ├── login.ts              # GitHub OAuth Device Flow
│   ├── logout.ts             # Credential removal
│   ├── setup.ts              # Interactive setup wizard
│   ├── status.ts             # Display current config & webhook status
│   ├── webhook.ts            # Webhook create with duplicate detection
│   ├── config.ts             # set-ip, set-port, set-route, set-branch, clear-secret
│   └── serve.ts              # HTTP webhook receiver server
├── services/
│   ├── auth.service.ts       # GitHub OAuth + token verification
│   ├── github.service.ts     # Repository fetching + permissions
│   ├── webhook.service.ts    # Webhook CRUD via Octokit
│   └── config.service.ts     # Configuration + credential storage
├── config/
│   └── schema.ts             # Zod validation schemas
├── types/
│   └── index.ts              # TypeScript interfaces
└── utils/
    ├── errors.ts             # Custom error classes (CLIError, GitHubAuthError, etc.)
    ├── logger.ts             # Chalk-styled logging + secret masking
    ├── url.ts                # URL building, route normalization, host validation
    └── validation.ts         # Input validation helpers
```

---

## Development

### Prerequisites

- Node.js ≥ 20.0.0
- npm ≥ 10

### Setup

```bash
git clone https://github.com/YashDevani-source/AirLock.git
cd AirLock
npm install
```

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev -- <command>` | Run CLI in development mode via `tsx` |
| `npm run build` | Build production bundle with `tsup` |
| `npm run type-check` | Run TypeScript strict type checking |
| `npm test` | Run unit tests with Vitest |
| `npm run test:watch` | Run tests in watch mode |
| `npm run server` | Start webhook server in dev mode |

### Running tests

```bash
npm test
```

Tests cover:

- URL generation and route normalization
- Host validation (IPv4, IPv6, domain)
- Zod schema validation
- Configuration persistence and credential isolation
- Webhook duplicate detection
- Webhook creation payload mapping

### Publishing

```bash
npm version patch   # bump version
npm publish         # builds automatically via prepublishOnly
```

---

## Error Handling

The CLI provides actionable error messages with suggestions:

```
✗ Failed to create webhook

Reason:
You do not have admin permission for this repository.

Try:
  - Check repository admin permissions.
  - Verify your GitHub OAuth scope includes "admin:repo_hook" or "repo".
```

Handled error scenarios include:

- User cancels GitHub authorization
- Invalid or expired access token
- Repository not found or no access
- Insufficient permissions for webhook management
- Invalid VPS IP/domain or port
- GitHub API rate limiting
- Network failures
- Duplicate webhook detection
- Port already in use (auto-recovery)

---

## License

MIT © 2026 [YashDevani](https://github.com/YashDevani-source)

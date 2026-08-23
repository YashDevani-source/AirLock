import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import chalk from 'chalk';
import killPort from 'kill-port';
import { configService } from '../services/config.service.js';
import { normalizeRoute } from '../utils/url.js';
import { CLIError } from '../utils/errors.js';

function verifySignature(payload: string, signature: string | undefined, secret: string): boolean {
  if (!signature || !signature.startsWith('sha256=')) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function serveCommand(options: { port?: string }): Promise<void> {
  const config = configService.getConfig();
  const server = config.server;

  if (!server || !server.host) {
    throw new CLIError('No server configuration found. Run "auto-cicd-cli setup" or "auto-cicd-cli config set-ip" first.');
  }

  const route = normalizeRoute(server.route);
  const secret = configService.getWebhookSecret();
  const port = Number(options.port) || server.port || (server.protocol === 'https' ? 443 : 80);
  const deployBranch = config.repository?.branch || 'main';

  console.log(chalk.bold.magenta('\n🚀 Starting webhook server\n'));
  console.log(chalk.dim(`   route:  ${route}`));
  console.log(chalk.dim(`   port:   ${port}`));
  console.log(chalk.dim(`   branch: ${deployBranch} (push here runs the deploy script)`));
  console.log(chalk.dim(`   secret: ${secret ? 'configured' : 'not set (signatures will not be verified)'}\n`));

  const httpServer = createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const body = Buffer.concat(chunks).toString('utf8');

      console.log(chalk.bold.blue(`\n--> ${req.method} ${req.url}`));

      if (req.url !== route) {
        console.log(chalk.red(`    no route configured for ${req.url}`));
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'not found' }));
        return;
      }

      const event = req.headers['x-github-event'] ?? '(no event header)';
      const delivery = req.headers['x-github-delivery'] ?? '(no delivery id)';
      const signature = req.headers['x-hub-signature-256'] as string | undefined;

      console.log(chalk.dim(`    event: ${event}  delivery: ${delivery}`));

      if (secret) {
        const valid = verifySignature(body, signature, secret);
        console.log(valid ? chalk.green('    signature: valid') : chalk.red('    signature: INVALID'));
        if (!valid) {
          res.writeHead(401, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'invalid signature' }));
          return;
        }
      }

      let payload: Record<string, unknown> | undefined;
      try {
        payload = JSON.parse(body);
        console.log(JSON.stringify(payload, null, 2));
      } catch {
        console.log(body);
      }

      if (event === 'push' && payload && typeof payload.ref === 'string') {
        const pushedBranch = payload.ref.replace('refs/heads/', '');
        if (pushedBranch === deployBranch) {
          console.log(chalk.bold.green(`\n>>> Push to '${deployBranch}' detected — deploy script hit!`));
        } else {
          console.log(chalk.dim(`    push to '${pushedBranch}' ignored (watching '${deployBranch}')`));
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true }));
    });
  });

  httpServer.on('listening', () => {
    console.log(chalk.bold.green(`Webhook server listening on http://0.0.0.0:${port}${route}`));
    console.log(chalk.dim('Waiting for GitHub events... (Ctrl+C to stop)'));
  });

  httpServer.once('error', async (err: NodeJS.ErrnoException) => {
    if (err.code !== 'EADDRINUSE') throw err;
    console.log(chalk.yellow(`Port ${port} is already in use, freeing it...`));
    await killPort(port, 'tcp');
    httpServer.listen(port);
  });

  httpServer.listen(port);
}

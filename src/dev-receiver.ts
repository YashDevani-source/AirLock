import { createServer } from 'node:http';
import { createHmac, timingSafeEqual } from 'node:crypto';
import chalk from 'chalk';

const PORT = Number(process.env.RECEIVER_PORT) || 4000;
const SECRET = process.env.WEBHOOK_SECRET;

function verifySignature(payload: string, signature: string | undefined, secret: string): boolean {
  if (!signature || !signature.startsWith('sha256=')) return false;
  const expected = 'sha256=' + createHmac('sha256', secret).update(payload).digest('hex');
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const server = createServer((req, res) => {
  const chunks: Buffer[] = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', () => {
    const body = Buffer.concat(chunks).toString('utf8');
    const event = req.headers['x-github-event'] ?? '(no event header)';
    const delivery = req.headers['x-github-delivery'] ?? '(no delivery id)';
    const signature = req.headers['x-hub-signature-256'] as string | undefined;

    console.log('\n' + chalk.bold.blue(`--> ${req.method} ${req.url}`));
    console.log(chalk.dim(`    event: ${event}  delivery: ${delivery}`));

    if (SECRET) {
      const valid = verifySignature(body, signature, SECRET);
      console.log(valid ? chalk.green('    signature: valid') : chalk.red('    signature: INVALID'));
    }

    try {
      console.log(JSON.stringify(JSON.parse(body), null, 2));
    } catch {
      console.log(body);
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true }));
  });
});

server.listen(PORT, () => {
  console.log(chalk.bold.green(`Webhook receiver listening on http://localhost:${PORT}`));
  console.log(chalk.dim('Waiting for GitHub events... (Ctrl+C to stop)'));
});

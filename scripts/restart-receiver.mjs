import kill from 'kill-port';
import { spawn } from 'node:child_process';

const port = Number(process.env.RECEIVER_PORT) || 4000;

try {
  await kill(port, 'tcp');
  console.log(`Freed port ${port}.`);
} catch {
  console.log(`Port ${port} was already free.`);
}

const child = spawn('npx', ['tsx', 'src/dev-receiver.ts'], {
  stdio: 'inherit',
  env: process.env,
  shell: process.platform === 'win32',
});

child.on('exit', (code) => process.exit(code ?? 0));

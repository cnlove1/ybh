import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

// Use Node directly so the same pnpm commands work on Windows, macOS and Linux.
const require = createRequire(import.meta.url);
const root = process.env.WORKSPACE_PATH || path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mode = process.argv[2];
if (!['dev', 'build', 'start'].includes(mode)) {
  console.error('Usage: node scripts/run-next.mjs <dev|build|start>');
  process.exit(1);
}
if (mode === 'build') {
  const check = spawnSync(process.execPath, [path.join(root, 'scripts/check-external-origin.mjs')], { cwd: root, stdio: 'inherit' });
  if (check.error) { console.error(check.error.message); process.exit(1); }
  if (check.status !== 0) process.exit(check.status || 1);
}
const args = [require.resolve('next/dist/bin/next'), mode];
if (mode !== 'build') {
  const port = (mode === 'start' && process.env.DEPLOY_RUN_PORT) || process.env.USER_PROJECT_PORT || process.env.PORT || '5001';
  if (!/^\d+$/.test(port) || Number(port) < 1 || Number(port) > 65535) {
    console.error('Port must be an integer from 1 to 65535.');
    process.exit(1);
  }
  args.push('--port', port);
}
args.push(...process.argv.slice(3));
const child = spawn(process.execPath, args, { cwd: root, stdio: 'inherit', env: process.env });
child.on('error', (error) => { console.error(error.message); process.exitCode = 1; });
child.on('exit', (code, signal) => { process.exitCode = code ?? (signal ? 1 : 0); });
for (const signal of ['SIGINT', 'SIGTERM']) process.on(signal, () => { child.kill(signal); });

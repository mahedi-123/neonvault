/**
 * One command for local development: starts the API (auto-restarts on server
 * changes) and the Vite dev server (hot reload) side by side. Works the same
 * on Windows, macOS and Linux. Ctrl+C stops both.
 */
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const vite = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js');
const colors = { api: '\x1b[36m', web: '\x1b[35m' };
const procs = [];

function run(name, args) {
  const p = spawn(process.execPath, args, { cwd: root, env: { ...process.env, FORCE_COLOR: '1' } });
  const tag = `${colors[name]}[${name}]\x1b[0m `;
  const pipe = (stream, out) => {
    let buf = '';
    stream.on('data', (d) => {
      buf += d;
      const lines = buf.split(/\r?\n/);
      buf = lines.pop();
      for (const l of lines) out.write(tag + l + '\n');
    });
  };
  pipe(p.stdout, process.stdout);
  pipe(p.stderr, process.stderr);
  p.on('exit', (code) => {
    if (!stopping) { console.log(`${tag}exited (${code}). Stopping.`); stop(code || 1); }
  });
  procs.push(p);
}

let stopping = false;
function stop(code = 0) {
  stopping = true;
  for (const p of procs) p.kill();
  setTimeout(() => process.exit(code), 300);
}
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

run('api', ['--disable-warning=ExperimentalWarning', '--watch', 'server/index.js']);
run('web', [vite, '--port', process.env.WEB_PORT || '5173', ...process.argv.slice(2)]);

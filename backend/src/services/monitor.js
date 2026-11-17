import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
const execFileAsync = promisify(execFile);

export async function pingHost(host) {
  const isWin = process.platform === 'win32';
  const args = isWin ? ['-n','1','-w','2500',host] : ['-c','1','-W','2',host];
  try {
    const { stdout } = await execFileAsync('ping', args, { timeout: 4000, windowsHide: true });
    const patterns = [
      /time[=<]([0-9.]+)\s*ms/i,
      /time[=<]\s*([0-9.]+)\s*ms/i
    ];
    let latency = null;
    for (const re of patterns) { const m = stdout.match(re); if (m) { latency = Number(m[1]); break; } }
    return { success: true, latency: latency ?? 1, output: stdout.slice(-500) };
  } catch (error) {
    return { success: false, latency: null, output: String(error.message).slice(0,300) };
  }
}

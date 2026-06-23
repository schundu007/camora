import { execFile } from 'node:child_process';
import { platform } from 'node:os';

export function which(cmd) {
  const whichCmd = platform() === 'win32' ? 'where' : 'which';
  return new Promise((resolve) => {
    execFile(whichCmd, [cmd], (error, stdout) => {
      if (error) return resolve(null);
      const path = stdout.trim().split('\n')[0];
      resolve(path || null);
    });
  });
}

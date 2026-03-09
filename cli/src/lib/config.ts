import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';

interface Config {
  server?: string;
  token?: string;
  username?: string;
}

const CONFIG_DIR = join(homedir(), '.agent-board');
const CONFIG_FILE = join(CONFIG_DIR, 'config.json');

export function getConfig(): Config {
  try {
    if (!existsSync(CONFIG_FILE)) return {};
    return JSON.parse(readFileSync(CONFIG_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

export function saveConfig(config: Config): void {
  mkdirSync(CONFIG_DIR, { recursive: true });
  writeFileSync(CONFIG_FILE, JSON.stringify(config, null, 2) + '\n');
}

export function requireConfig(): Required<Pick<Config, 'server' | 'token'>> & Config {
  const config = getConfig();
  if (!config.server || !config.token) {
    console.error('Not logged in. Run: agent-board login');
    process.exit(1);
  }
  return config as any;
}

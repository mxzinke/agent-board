import { Command } from 'commander';
import { saveConfig, getConfig } from '../lib/config';

export function registerAuthCommands(program: Command) {
  program
    .command('login')
    .description('Login to an agent-board server')
    .requiredOption('-s, --server <url>', 'Server URL (e.g., https://board.unclutter.pro)')
    .option('-u, --username <username>', 'Username (for password login)')
    .option('-p, --password <password>', 'Password')
    .option('-k, --api-key <key>', 'API key (alternative to username/password)')
    .action(async (opts) => {
      const server = opts.server.replace(/\/$/, '');

      if (opts.apiKey) {
        // Test the API key
        const res = await fetch(`${server}/api/v1/auth/me`, {
          headers: { 'Authorization': `ApiKey ${opts.apiKey}` },
        });
        if (!res.ok) {
          console.error('Invalid API key');
          process.exit(1);
        }
        const user = await res.json();
        saveConfig({ server, token: opts.apiKey, username: user.username });
        console.log(`Logged in as ${user.username} (API key)`);
        return;
      }

      if (!opts.username || !opts.password) {
        console.error('Provide either --api-key or --username + --password');
        process.exit(1);
      }

      const res = await fetch(`${server}/api/v1/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: opts.username, password: opts.password }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error(`Login failed: ${body.error || res.statusText}`);
        process.exit(1);
      }

      const { user, token } = await res.json();
      saveConfig({ server, token, username: user.username });
      console.log(`Logged in as ${user.username}`);
    });

  program
    .command('register')
    .description('Register a new account on an agent-board server')
    .requiredOption('-s, --server <url>', 'Server URL')
    .requiredOption('-u, --username <username>', 'Username')
    .requiredOption('-p, --password <password>', 'Password')
    .option('-d, --display-name <name>', 'Display name')
    .option('--agent', 'Register as an AI agent')
    .action(async (opts) => {
      const server = opts.server.replace(/\/$/, '');

      const res = await fetch(`${server}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: opts.username,
          password: opts.password,
          displayName: opts.displayName,
          isAgent: opts.agent || false,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        console.error(`Registration failed: ${body.error || res.statusText}`);
        process.exit(1);
      }

      const { user, token } = await res.json();
      saveConfig({ server, token, username: user.username });
      console.log(`Registered and logged in as ${user.username}`);
    });

  program
    .command('whoami')
    .description('Show current login status')
    .action(() => {
      const config = getConfig();
      if (!config.server || !config.token) {
        console.log('Not logged in');
        return;
      }
      console.log(`Server: ${config.server}`);
      console.log(`User: ${config.username || 'unknown'}`);
      console.log(`Auth: ${config.token?.startsWith('ab_') ? 'API key' : 'JWT token'}`);
    });

  program
    .command('api-key')
    .description('Create a new API key')
    .option('-l, --label <label>', 'Label for the key')
    .action(async (opts) => {
      const { request } = await import('../lib/client');
      const result = await request<{ key: string; keyPrefix: string }>('/auth/api-keys', {
        method: 'POST',
        body: JSON.stringify({ label: opts.label }),
      });
      console.log(`API Key created: ${result.key}`);
      console.log('Store this key securely — it will not be shown again.');
    });
}

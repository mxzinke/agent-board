import { Command } from 'commander';
import { createInterface } from 'readline';
import { saveConfig, getConfig } from '../lib/config';

function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

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
    .command('captcha')
    .description('Request a captcha challenge (for scripted registration)')
    .requiredOption('-s, --server <url>', 'Server URL')
    .option('--mode <mode>', 'Captcha mode: agent or human', 'agent')
    .action(async (opts) => {
      const server = opts.server.replace(/\/$/, '');
      const res = await fetch(`${server}/api/v1/auth/captcha`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mode: opts.mode }),
      });
      if (!res.ok) {
        console.error('Failed to get captcha challenge');
        process.exit(1);
      }
      const data = await res.json();
      // Output as JSON for easy parsing by scripts/bots
      console.log(JSON.stringify(data));
    });

  program
    .command('register')
    .description('Register a new account on an agent-board server')
    .requiredOption('-s, --server <url>', 'Server URL')
    .requiredOption('-u, --username <username>', 'Username')
    .option('-p, --password <password>', 'Password (required for human accounts, ignored for --agent)')
    .option('-d, --display-name <name>', 'Display name')
    .option('--agent', 'Register as an AI agent (no password needed)')
    .option('--captcha-token <token>', 'Captcha token (from captcha command)')
    .option('--captcha-answer <answer>', 'Captcha answer')
    .action(async (opts) => {
      const server = opts.server.replace(/\/$/, '');
      const isAgent = opts.agent || false;

      if (!isAgent && !opts.password) {
        console.error('Password is required for human registration. Use -p to provide one.');
        process.exit(1);
      }

      let captchaToken = opts.captchaToken;
      let captchaAnswer = opts.captchaAnswer;

      // If captcha token/answer not provided via flags, fetch interactively
      if (!captchaToken || !captchaAnswer) {
        const captchaMode = isAgent ? 'agent' : 'human';

        const captchaRes = await fetch(`${server}/api/v1/auth/captcha`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ mode: captchaMode }),
        });

        if (!captchaRes.ok) {
          console.error('Failed to get captcha challenge');
          process.exit(1);
        }

        const captchaData = await captchaRes.json();
        captchaToken = captchaData.token;

        if (captchaData.challenge) {
          // Agent mode: text challenge — print and prompt
          console.log(`\nCaptcha challenge: ${captchaData.challenge}`);
          captchaAnswer = await prompt('Your answer: ');
        } else {
          console.log('\nA visual captcha was generated. For CLI registration with --agent flag, a text challenge is provided instead.');
          console.log('If you are a human, please register via the web UI.');
          captchaAnswer = await prompt('Your answer: ');
        }
      }

      if (!captchaAnswer) {
        console.error('Captcha answer is required');
        process.exit(1);
      }

      const body: Record<string, unknown> = {
        username: opts.username,
        displayName: opts.displayName,
        isAgent,
        captchaToken,
        captchaAnswer,
      };
      if (!isAgent && opts.password) {
        body.password = opts.password;
      }

      const res = await fetch(`${server}/api/v1/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        console.error(`Registration failed: ${errBody.error || res.statusText}`);
        process.exit(1);
      }

      const result = await res.json();

      if (isAgent && result.apiKey) {
        saveConfig({ server, token: result.apiKey, username: result.user.username });
        console.log(`Registered as ${result.user.username}`);
        console.log(`API Key: ${result.apiKey}`);
        console.log('Store this key securely — it will not be shown again.');
      } else {
        saveConfig({ server, token: result.token, username: result.user.username });
        console.log(`Registered and logged in as ${result.user.username}`);
      }
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

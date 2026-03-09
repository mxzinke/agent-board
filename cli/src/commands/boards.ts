import { Command } from 'commander';
import { request } from '../lib/client';

export function registerBoardCommands(program: Command) {
  const boards = program.command('boards').description('Manage boards');

  boards
    .command('list')
    .alias('ls')
    .description('List your boards')
    .action(async () => {
      const items = await request<any[]>('/boards');
      if (items.length === 0) {
        console.log('No boards found. Create one with: agent-board boards create --name "My Board"');
        return;
      }
      console.log('');
      for (const b of items) {
        console.log(`  ${b.id}  ${b.name}  (${b.role})`);
        if (b.description) console.log(`           ${b.description}`);
      }
      console.log('');
    });

  boards
    .command('create')
    .description('Create a new board')
    .requiredOption('-n, --name <name>', 'Board name')
    .option('-d, --description <desc>', 'Board description')
    .action(async (opts) => {
      const board = await request<any>('/boards', {
        method: 'POST',
        body: JSON.stringify({ name: opts.name, description: opts.description }),
      });
      console.log(`Board created: ${board.id}`);
      console.log(`  Name: ${board.name}`);
    });

  boards
    .command('show <boardId>')
    .description('Show board details')
    .action(async (boardId) => {
      const board = await request<any>(`/boards/${boardId}`);
      console.log(`\nBoard: ${board.name}`);
      if (board.description) console.log(`Description: ${board.description}`);
      console.log(`\nMembers:`);
      for (const m of board.members || []) {
        const badge = m.isAgent ? ' [agent]' : '';
        console.log(`  ${m.displayName || m.username}${badge} (${m.role})`);
      }
      console.log('');
    });

  boards
    .command('invite <boardId>')
    .description('Create an invite link')
    .option('--max-uses <n>', 'Maximum number of uses', parseInt)
    .option('--expires <hours>', 'Expires in hours', parseInt)
    .action(async (boardId, opts) => {
      const result = await request<any>(`/boards/${boardId}/invite`, {
        method: 'POST',
        body: JSON.stringify({
          maxUses: opts.maxUses,
          expiresInHours: opts.expires,
        }),
      });
      console.log(`Invite link: ${result.url}`);
      console.log(`Token: ${result.token}`);
    });

  boards
    .command('join <token>')
    .description('Join a board using an invite token')
    .action(async (token) => {
      const result = await request<any>('/boards/join', {
        method: 'POST',
        body: JSON.stringify({ token }),
      });
      console.log(`Joined board: ${result.boardId} as ${result.role}`);
    });
}

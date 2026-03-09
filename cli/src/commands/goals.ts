import { Command } from 'commander';
import { request } from '../lib/client';

const STATUS_SYMBOLS: Record<string, string> = {
  backlog: '○',
  todo: '◎',
  in_progress: '◉',
  review: '◈',
  done: '●',
};

export function registerGoalCommands(program: Command) {
  const goals = program.command('goals').description('Manage goals');

  goals
    .command('list <boardId>')
    .alias('ls')
    .description('List goals on a board')
    .option('-s, --status <status>', 'Filter by status (comma-separated)')
    .action(async (boardId, opts) => {
      const items = await request<any[]>(`/boards/${boardId}/goals${opts.status ? `?status=${opts.status}` : ''}`);
      if (items.length === 0) {
        console.log('No goals found.');
        return;
      }

      // Group by status
      const grouped: Record<string, any[]> = {};
      for (const g of items) {
        if (!grouped[g.status]) grouped[g.status] = [];
        grouped[g.status].push(g);
      }

      console.log('');
      for (const [status, statusGoals] of Object.entries(grouped)) {
        console.log(`  ${STATUS_SYMBOLS[status] || '○'} ${status.toUpperCase().replace('_', ' ')}`);
        for (const g of statusGoals) {
          console.log(`    ${g.id.slice(0, 8)}  ${g.title}`);
        }
        console.log('');
      }
    });

  goals
    .command('create <boardId>')
    .description('Create a new goal')
    .requiredOption('-t, --title <title>', 'Goal title')
    .option('-d, --description <desc>', 'Goal description')
    .option('-s, --status <status>', 'Initial status', 'backlog')
    .action(async (boardId, opts) => {
      const goal = await request<any>(`/boards/${boardId}/goals`, {
        method: 'POST',
        body: JSON.stringify({
          title: opts.title,
          description: opts.description,
          status: opts.status,
        }),
      });
      console.log(`Goal created: ${goal.id}`);
      console.log(`  Title: ${goal.title}`);
      console.log(`  Status: ${goal.status}`);
    });

  goals
    .command('show <boardId> <goalId>')
    .description('Show goal details')
    .action(async (boardId, goalId) => {
      const goal = await request<any>(`/boards/${boardId}/goals/${goalId}`);
      console.log(`\n${STATUS_SYMBOLS[goal.status] || '○'} ${goal.title}`);
      console.log(`  Status: ${goal.status}`);
      console.log(`  ID: ${goal.id}`);
      if (goal.description) console.log(`\n${goal.description}`);

      if (goal.subtasks?.length > 0) {
        const done = goal.subtasks.filter((s: any) => s.done).length;
        console.log(`\n  Subtasks (${done}/${goal.subtasks.length}):`);
        for (const s of goal.subtasks) {
          console.log(`    ${s.done ? '☑' : '☐'} ${s.title}`);
        }
      }

      if (goal.comments?.length > 0) {
        console.log(`\n  Comments (${goal.comments.length}):`);
        for (const c of goal.comments) {
          const who = c.authorDisplayName || c.authorUsername;
          const when = new Date(c.createdAt).toLocaleString();
          const badge = c.authorIsAgent ? ' [agent]' : '';
          console.log(`    ${who}${badge} (${when}):`);
          console.log(`    ${c.body}`);
          console.log('');
        }
      }
      console.log('');
    });

  goals
    .command('update <boardId> <goalId>')
    .description('Update a goal')
    .option('-t, --title <title>', 'New title')
    .option('-d, --description <desc>', 'New description')
    .option('-s, --status <status>', 'New status')
    .action(async (boardId, goalId, opts) => {
      const updates: any = {};
      if (opts.title) updates.title = opts.title;
      if (opts.description) updates.description = opts.description;
      if (opts.status) updates.status = opts.status;

      if (Object.keys(updates).length === 0) {
        console.error('No updates provided. Use --title, --description, or --status.');
        process.exit(1);
      }

      const goal = await request<any>(`/boards/${boardId}/goals/${goalId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates),
      });
      console.log(`Goal updated: ${goal.title} [${goal.status}]`);
    });

  goals
    .command('move <boardId> <goalId> <status>')
    .description('Move a goal to a different status')
    .action(async (boardId, goalId, status) => {
      const goal = await request<any>(`/boards/${boardId}/goals/${goalId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      console.log(`${goal.title} → ${goal.status}`);
    });

  goals
    .command('delete <boardId> <goalId>')
    .description('Delete a goal')
    .action(async (boardId, goalId) => {
      await request(`/boards/${boardId}/goals/${goalId}`, { method: 'DELETE' });
      console.log('Goal deleted.');
    });
}

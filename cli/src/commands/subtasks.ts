import { Command } from 'commander';
import { request } from '../lib/client';

export function registerSubtaskCommands(program: Command) {
  const subtasks = program.command('subtasks').description('Manage subtasks on goals');

  subtasks
    .command('list <goalId>')
    .alias('ls')
    .description('List subtasks of a goal')
    .action(async (goalId) => {
      const items = await request<any[]>(`/goals/${goalId}/subtasks`);
      if (items.length === 0) {
        console.log('No subtasks.');
        return;
      }
      console.log('');
      for (const s of items) {
        console.log(`  ${s.done ? '☑' : '☐'} ${s.id.slice(0, 8)}  ${s.title}`);
      }
      console.log('');
    });

  subtasks
    .command('add <goalId>')
    .description('Add a subtask')
    .requiredOption('-t, --title <title>', 'Subtask title')
    .action(async (goalId, opts) => {
      const subtask = await request<any>(`/goals/${goalId}/subtasks`, {
        method: 'POST',
        body: JSON.stringify({ title: opts.title }),
      });
      console.log(`Subtask added: ${subtask.id}`);
    });

  subtasks
    .command('check <goalId> <subtaskId>')
    .description('Mark a subtask as done')
    .action(async (goalId, subtaskId) => {
      await request(`/goals/${goalId}/subtasks/${subtaskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ done: true }),
      });
      console.log('Subtask marked as done.');
    });

  subtasks
    .command('uncheck <goalId> <subtaskId>')
    .description('Mark a subtask as not done')
    .action(async (goalId, subtaskId) => {
      await request(`/goals/${goalId}/subtasks/${subtaskId}`, {
        method: 'PATCH',
        body: JSON.stringify({ done: false }),
      });
      console.log('Subtask marked as not done.');
    });
}

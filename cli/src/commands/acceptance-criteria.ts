import { Command } from 'commander';
import { request } from '../lib/client';

export function registerCriteriaCommands(program: Command) {
  const criteria = program.command('criteria').description('Manage acceptance criteria on goals');

  criteria
    .command('list <goalId>')
    .alias('ls')
    .description('List acceptance criteria of a goal')
    .action(async (goalId) => {
      const items = await request<any[]>(`/goals/${goalId}/acceptance-criteria`);
      if (items.length === 0) {
        console.log('No acceptance criteria.');
        return;
      }
      console.log('');
      for (const c of items) {
        console.log(`  ${c.met ? '\u2611' : '\u2610'} ${c.id.slice(0, 8)}  ${c.text}`);
      }
      console.log('');
    });

  criteria
    .command('add <goalId>')
    .description('Add an acceptance criterion')
    .requiredOption('-t, --text <text>', 'Criterion text')
    .action(async (goalId, opts) => {
      const criterion = await request<any>(`/goals/${goalId}/acceptance-criteria`, {
        method: 'POST',
        body: JSON.stringify({ text: opts.text }),
      });
      console.log(`Acceptance criterion added: ${criterion.id}`);
    });

  criteria
    .command('check <goalId> <criterionId>')
    .description('Mark an acceptance criterion as met')
    .action(async (goalId, criterionId) => {
      await request(`/goals/${goalId}/acceptance-criteria/${criterionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ met: true }),
      });
      console.log('Acceptance criterion marked as met.');
    });

  criteria
    .command('uncheck <goalId> <criterionId>')
    .description('Mark an acceptance criterion as not met')
    .action(async (goalId, criterionId) => {
      await request(`/goals/${goalId}/acceptance-criteria/${criterionId}`, {
        method: 'PATCH',
        body: JSON.stringify({ met: false }),
      });
      console.log('Acceptance criterion marked as not met.');
    });
}

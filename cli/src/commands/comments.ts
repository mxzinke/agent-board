import { Command } from 'commander';
import { request } from '../lib/client';

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function registerCommentCommands(program: Command) {
  const comments = program.command('comments').description('Manage comments on goals');

  comments
    .command('list <goalId>')
    .alias('ls')
    .description('List comments on a goal')
    .action(async (goalId) => {
      const items = await request<any[]>(`/goals/${goalId}/comments`);
      if (items.length === 0) {
        console.log('No comments.');
        return;
      }
      console.log('');
      for (const c of items) {
        const who = c.authorDisplayName || c.authorUsername;
        const when = new Date(c.createdAt).toLocaleString();
        const badge = c.authorIsAgent ? ' [agent]' : '';
        console.log(`  ${who}${badge} — ${when}  [${c.id}]`);
        console.log(`  ${c.body}`);
        if (c.attachments && c.attachments.length > 0) {
          for (const a of c.attachments) {
            const size = formatSize(a.size);
            console.log(`    📎 ${a.filename} (${size}, ${a.mimeType}) [${a.id}]`);
          }
        }
        console.log('');
      }
    });

  comments
    .command('add <goalId>')
    .description('Add a comment to a goal')
    .requiredOption('-b, --body <text>', 'Comment body')
    .action(async (goalId, opts) => {
      const comment = await request<any>(`/goals/${goalId}/comments`, {
        method: 'POST',
        body: JSON.stringify({ body: opts.body }),
      });
      console.log(`Comment added (${comment.id})`);
    });
}

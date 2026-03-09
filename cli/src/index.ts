#!/usr/bin/env node
import { Command } from 'commander';
import { registerAuthCommands } from './commands/auth';
import { registerBoardCommands } from './commands/boards';
import { registerGoalCommands } from './commands/goals';
import { registerCommentCommands } from './commands/comments';
import { registerSubtaskCommands } from './commands/subtasks';

const program = new Command();

program
  .name('agent-board')
  .description('CLI for agent-board — project management for human + AI agent collaboration')
  .version('0.1.0');

registerAuthCommands(program);
registerBoardCommands(program);
registerGoalCommands(program);
registerCommentCommands(program);
registerSubtaskCommands(program);

program.parse();

import { Hono } from 'hono';
import auth from './routes/auth';
import boardsRouter from './routes/boards';
import goalsRouter from './routes/goals';
import subtasksRouter from './routes/subtasks';
import commentsRouter from './routes/comments';
import webhooksRouter from './routes/webhooks';
import attachmentsRouter from './routes/attachments';
import eventsRouter from './routes/events';

const api = new Hono();

api.route('/auth', auth);
api.route('/boards', boardsRouter);
api.route('/', goalsRouter); // /boards/:boardId/goals
api.route('/', subtasksRouter); // /goals/:goalId/subtasks
api.route('/', commentsRouter); // /goals/:goalId/comments
api.route('/', webhooksRouter); // /boards/:boardId/webhooks
api.route('/', attachmentsRouter); // /goals/:goalId/attachments & /attachments/:id/*
api.route('/', eventsRouter); // /boards/:boardId/events (SSE)

export default api;

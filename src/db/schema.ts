import { pgTable, text, timestamp, uuid, varchar, boolean, integer, pgEnum, primaryKey } from 'drizzle-orm/pg-core';

export const goalStatusEnum = pgEnum('goal_status', [
  'backlog', 'todo', 'in_progress', 'review', 'done'
]);

export const users = pgTable('users', {
  id: uuid('id').defaultRandom().primaryKey(),
  username: varchar('username', { length: 64 }).notNull().unique(),
  passwordHash: text('password_hash').notNull(),
  displayName: varchar('display_name', { length: 128 }),
  isAgent: boolean('is_agent').notNull().default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const passkeys = pgTable('passkeys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  credentialId: text('credential_id').notNull().unique(),
  publicKey: text('public_key').notNull(),
  counter: integer('counter').notNull().default(0),
  deviceType: text('device_type'),
  backedUp: boolean('backed_up').default(false),
  transports: text('transports'),
  name: text('name'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
});

export const apiKeys = pgTable('api_keys', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  keyHash: text('key_hash').notNull(),
  keyPrefix: varchar('key_prefix', { length: 12 }).notNull(),
  label: varchar('label', { length: 128 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  lastUsedAt: timestamp('last_used_at'),
});

export const boards = pgTable('boards', {
  id: uuid('id').defaultRandom().primaryKey(),
  name: varchar('name', { length: 256 }).notNull(),
  description: text('description'),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const boardMembers = pgTable('board_members', {
  boardId: uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  role: varchar('role', { length: 16 }).notNull().default('member'),
  joinedAt: timestamp('joined_at').defaultNow().notNull(),
}, (table) => [
  primaryKey({ columns: [table.boardId, table.userId] }),
]);

export const inviteTokens = pgTable('invite_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  token: varchar('token', { length: 64 }).notNull().unique(),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  expiresAt: timestamp('expires_at'),
  maxUses: integer('max_uses'),
  uses: integer('uses').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const goals = pgTable('goals', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 512 }).notNull(),
  description: text('description'),
  status: goalStatusEnum('status').notNull().default('backlog'),
  position: integer('position').notNull().default(0),
  assigneeId: uuid('assignee_id').references(() => users.id),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const subtasks = pgTable('subtasks', {
  id: uuid('id').defaultRandom().primaryKey(),
  goalId: uuid('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
  title: varchar('title', { length: 512 }).notNull(),
  done: boolean('done').notNull().default(false),
  position: integer('position').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const comments = pgTable('comments', {
  id: uuid('id').defaultRandom().primaryKey(),
  goalId: uuid('goal_id').notNull().references(() => goals.id, { onDelete: 'cascade' }),
  authorId: uuid('author_id').notNull().references(() => users.id),
  body: text('body').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const webhooks = pgTable('webhooks', {
  id: uuid('id').defaultRandom().primaryKey(),
  boardId: uuid('board_id').notNull().references(() => boards.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  events: text('events').notNull().default('*'),
  secret: varchar('secret', { length: 128 }),
  active: boolean('active').notNull().default(true),
  createdBy: uuid('created_by').notNull().references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

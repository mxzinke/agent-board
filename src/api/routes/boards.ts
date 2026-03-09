import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { db } from '../../db';
import { boards, boardMembers, inviteTokens, users } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { notFound, forbidden, badRequest } from '../lib/errors';
import { nanoid } from 'nanoid';

const boardsRouter = new Hono();
boardsRouter.use('*', authMiddleware);

// List boards the user is a member of
boardsRouter.get('/', async (c) => {
  const { sub } = c.get('user');
  const memberBoards = await db
    .select({
      id: boards.id,
      name: boards.name,
      description: boards.description,
      role: boardMembers.role,
      createdAt: boards.createdAt,
    })
    .from(boardMembers)
    .innerJoin(boards, eq(boards.id, boardMembers.boardId))
    .where(eq(boardMembers.userId, sub));
  return c.json(memberBoards);
});

// Create board
boardsRouter.post('/',
  zValidator('json', z.object({
    name: z.string().min(1).max(256),
    description: z.string().max(2000).optional(),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const { name, description } = c.req.valid('json');

    const [board] = await db.insert(boards).values({
      name,
      description,
      createdBy: sub,
    }).returning();

    // Add creator as owner
    await db.insert(boardMembers).values({
      boardId: board.id,
      userId: sub,
      role: 'owner',
    });

    return c.json(board, 201);
  }
);

// Get board detail
boardsRouter.get('/:id', async (c) => {
  const { sub } = c.get('user');
  const id = c.req.param('id');

  const [membership] = await db.select().from(boardMembers)
    .where(and(eq(boardMembers.boardId, id), eq(boardMembers.userId, sub))).limit(1);
  if (!membership) throw notFound('Board not found');

  const [board] = await db.select().from(boards).where(eq(boards.id, id)).limit(1);
  if (!board) throw notFound('Board not found');

  const members = await db
    .select({
      userId: boardMembers.userId,
      role: boardMembers.role,
      joinedAt: boardMembers.joinedAt,
      username: users.username,
      displayName: users.displayName,
      isAgent: users.isAgent,
    })
    .from(boardMembers)
    .innerJoin(users, eq(users.id, boardMembers.userId))
    .where(eq(boardMembers.boardId, id));

  return c.json({ ...board, members });
});

// Update board
boardsRouter.patch('/:id',
  zValidator('json', z.object({
    name: z.string().min(1).max(256).optional(),
    description: z.string().max(2000).optional(),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    const updates = c.req.valid('json');

    const [membership] = await db.select().from(boardMembers)
      .where(and(eq(boardMembers.boardId, id), eq(boardMembers.userId, sub))).limit(1);
    if (!membership) throw notFound('Board not found');
    if (membership.role !== 'owner') throw forbidden('Only owners can update boards');

    const [board] = await db.update(boards)
      .set({ ...updates, updatedAt: new Date() })
      .where(eq(boards.id, id))
      .returning();

    return c.json(board);
  }
);

// Delete board
boardsRouter.delete('/:id', async (c) => {
  const { sub } = c.get('user');
  const id = c.req.param('id');

  const [membership] = await db.select().from(boardMembers)
    .where(and(eq(boardMembers.boardId, id), eq(boardMembers.userId, sub))).limit(1);
  if (!membership || membership.role !== 'owner') throw forbidden('Only owners can delete boards');

  await db.delete(boards).where(eq(boards.id, id));
  return c.json({ ok: true });
});

// Get members
boardsRouter.get('/:id/members', async (c) => {
  const { sub } = c.get('user');
  const id = c.req.param('id');

  const [membership] = await db.select().from(boardMembers)
    .where(and(eq(boardMembers.boardId, id), eq(boardMembers.userId, sub))).limit(1);
  if (!membership) throw notFound('Board not found');

  const members = await db
    .select({
      userId: boardMembers.userId,
      role: boardMembers.role,
      joinedAt: boardMembers.joinedAt,
      username: users.username,
      displayName: users.displayName,
      isAgent: users.isAgent,
    })
    .from(boardMembers)
    .innerJoin(users, eq(users.id, boardMembers.userId))
    .where(eq(boardMembers.boardId, id));

  return c.json(members);
});

// Create invite token
boardsRouter.post('/:id/invite',
  zValidator('json', z.object({
    maxUses: z.number().int().positive().optional(),
    expiresInHours: z.number().positive().optional(),
  }).optional()),
  async (c) => {
    const { sub } = c.get('user');
    const id = c.req.param('id');
    const body = c.req.valid('json') || {};

    const [membership] = await db.select().from(boardMembers)
      .where(and(eq(boardMembers.boardId, id), eq(boardMembers.userId, sub))).limit(1);
    if (!membership) throw notFound('Board not found');

    const token = nanoid(32);
    const expiresAt = body.expiresInHours
      ? new Date(Date.now() + body.expiresInHours * 60 * 60 * 1000)
      : undefined;

    const [invite] = await db.insert(inviteTokens).values({
      boardId: id,
      token,
      createdBy: sub,
      expiresAt,
      maxUses: body.maxUses,
    }).returning();

    return c.json({ ...invite, url: `${c.req.url.split('/api')[0]}/join/${token}` }, 201);
  }
);

// Join board via token
boardsRouter.post('/join',
  zValidator('json', z.object({
    token: z.string(),
  })),
  async (c) => {
    const { sub } = c.get('user');
    const { token } = c.req.valid('json');

    const [invite] = await db.select().from(inviteTokens)
      .where(eq(inviteTokens.token, token)).limit(1);
    if (!invite) throw badRequest('Invalid invite token');
    if (invite.expiresAt && invite.expiresAt < new Date()) throw badRequest('Invite token expired');
    if (invite.maxUses && invite.uses >= invite.maxUses) throw badRequest('Invite token used up');

    // Check if already a member
    const [existing] = await db.select().from(boardMembers)
      .where(and(eq(boardMembers.boardId, invite.boardId), eq(boardMembers.userId, sub))).limit(1);
    if (existing) throw badRequest('Already a member');

    await db.insert(boardMembers).values({
      boardId: invite.boardId,
      userId: sub,
      role: 'member',
    });

    // Increment uses
    await db.update(inviteTokens)
      .set({ uses: invite.uses + 1 })
      .where(eq(inviteTokens.id, invite.id));

    return c.json({ boardId: invite.boardId, role: 'member' });
  }
);

export default boardsRouter;

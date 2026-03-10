import { Hono } from 'hono';
import { db } from '../../db';
import { attachments, goals, boardMembers } from '../../db/schema';
import { eq, and, sql, gte } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth';
import { suspensionMiddleware } from '../middleware/suspension';
import { rateLimitMiddleware } from '../middleware/rateLimit';
import { badRequest, notFound, forbidden } from '../lib/errors';
import { getStorage } from '../lib/storage';
import { config } from '../../config';
import { nanoid } from 'nanoid';
import { broadcastBoardEvent } from '../lib/broadcast';
import { deliverWebhooks } from '../lib/webhookDelivery';

const ALLOWED_MIME_TYPES = new Set([
  // Images
  'image/png', 'image/jpeg', 'image/gif', 'image/webp', 'image/svg+xml', 'image/bmp', 'image/avif',
  // Documents
  'application/pdf',
  'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  'application/vnd.oasis.opendocument.text', 'application/vnd.oasis.opendocument.spreadsheet',
  // Text
  'text/plain', 'text/csv', 'text/markdown',
  // Archives
  'application/zip', 'application/gzip',
  // JSON/XML
  'application/json', 'application/xml', 'text/xml',
]);

const attachmentsRouter = new Hono();
attachmentsRouter.use('*', authMiddleware, suspensionMiddleware, rateLimitMiddleware);

// Helper: verify user has access to goal's board
async function verifyGoalAccess(goalId: string, userId: string) {
  const [goal] = await db.select({
    id: goals.id,
    boardId: goals.boardId,
  }).from(goals).where(eq(goals.id, goalId)).limit(1);
  if (!goal) throw notFound('Goal not found');

  const [member] = await db.select().from(boardMembers)
    .where(and(eq(boardMembers.boardId, goal.boardId), eq(boardMembers.userId, userId))).limit(1);
  if (!member) throw forbidden('Not a board member');

  return goal;
}

// List attachments for a goal
attachmentsRouter.get('/goals/:goalId/attachments', async (c) => {
  const { sub } = c.get('user');
  const goalId = c.req.param('goalId');
  await verifyGoalAccess(goalId, sub);

  const files = await db.select({
    id: attachments.id,
    filename: attachments.filename,
    mimeType: attachments.mimeType,
    size: attachments.size,
    uploadedBy: attachments.uploadedBy,
    createdAt: attachments.createdAt,
  }).from(attachments).where(eq(attachments.goalId, goalId));

  return c.json(files);
});

// Upload attachment
attachmentsRouter.post('/goals/:goalId/attachments', async (c) => {
  const { sub } = c.get('user');
  const goalId = c.req.param('goalId');
  await verifyGoalAccess(goalId, sub);

  // Check daily upload limit
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [uploadCount] = await db.select({
    count: sql<number>`count(*)::int`,
  }).from(attachments)
    .where(and(eq(attachments.uploadedBy, sub), gte(attachments.createdAt, today)));

  if (uploadCount && uploadCount.count >= config.maxUploadsPerDay) {
    return c.json({ error: `Daily upload limit reached (${config.maxUploadsPerDay})` }, 429);
  }

  // Parse multipart form data
  const formData = await c.req.formData();
  const file = formData.get('file');
  if (!file || !(file instanceof File)) {
    throw badRequest('No file provided');
  }

  // Check file size
  const maxBytes = config.maxUploadSizeMB * 1024 * 1024;
  if (file.size > maxBytes) {
    throw badRequest(`File too large. Max ${config.maxUploadSizeMB}MB`);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const filename = file.name || 'unnamed';
  const mimeType = file.type || 'application/octet-stream';

  if (!ALLOWED_MIME_TYPES.has(mimeType)) {
    throw badRequest(`File type '${mimeType}' is not allowed`);
  }

  let storageKey: string | null = null;
  let data: string | null = null;

  if (config.storageBackend === 's3') {
    storageKey = `${goalId}/${nanoid(16)}_${filename}`;
    const storage = getStorage();
    await storage.upload(storageKey, buffer, mimeType);
  } else {
    // Inline: store as base64 in DB
    data = buffer.toString('base64');
  }

  const goal = await verifyGoalAccess(goalId, sub);

  const [attachment] = await db.insert(attachments).values({
    goalId,
    uploadedBy: sub,
    filename,
    mimeType,
    size: file.size,
    storageBackend: config.storageBackend,
    storageKey,
    data,
  }).returning({
    id: attachments.id,
    filename: attachments.filename,
    mimeType: attachments.mimeType,
    size: attachments.size,
    createdAt: attachments.createdAt,
  });

  broadcastBoardEvent(goal.boardId, { type: 'goal-updated', goalId });
  deliverWebhooks(goal.boardId, { type: 'attachment-uploaded', goalId }, sub);

  return c.json(attachment, 201);
});

// Download attachment
attachmentsRouter.get('/attachments/:id/download', async (c) => {
  const { sub } = c.get('user');
  const id = c.req.param('id');

  const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
  if (!attachment) throw notFound('Attachment not found');

  // Verify access
  await verifyGoalAccess(attachment.goalId, sub);

  let fileData: Buffer;

  if (attachment.storageBackend === 's3' && attachment.storageKey) {
    const storage = getStorage();
    const result = await storage.download(attachment.storageKey);
    fileData = result.data;
  } else if (attachment.data) {
    fileData = Buffer.from(attachment.data, 'base64');
  } else {
    throw notFound('File data not found');
  }

  // Force safe content type for non-image downloads to prevent XSS
  const isImage = attachment.mimeType.startsWith('image/');
  const contentType = isImage ? attachment.mimeType : 'application/octet-stream';

  return new Response(new Uint8Array(fileData), {
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${attachment.filename.replace(/["\\\r\n]/g, '_')}"`,
      'Content-Length': fileData.length.toString(),
      'X-Content-Type-Options': 'nosniff',
    },
  });
});

// Delete attachment
attachmentsRouter.delete('/attachments/:id', async (c) => {
  const { sub } = c.get('user');
  const id = c.req.param('id');

  const [attachment] = await db.select().from(attachments).where(eq(attachments.id, id)).limit(1);
  if (!attachment) throw notFound('Attachment not found');

  // Verify access (must be uploader or board owner)
  const goal = await verifyGoalAccess(attachment.goalId, sub);

  if (attachment.uploadedBy !== sub) {
    // Check if board owner
    const [member] = await db.select().from(boardMembers)
      .where(and(eq(boardMembers.boardId, goal.boardId), eq(boardMembers.userId, sub))).limit(1);
    if (!member || member.role !== 'owner') {
      throw forbidden('Only the uploader or board owner can delete');
    }
  }

  // Delete from storage
  if (attachment.storageBackend === 's3' && attachment.storageKey) {
    try {
      const storage = getStorage();
      await storage.delete(attachment.storageKey);
    } catch { /* ignore storage errors on delete */ }
  }

  await db.delete(attachments).where(eq(attachments.id, id));

  broadcastBoardEvent(goal.boardId, { type: 'goal-updated', goalId: attachment.goalId });
  deliverWebhooks(goal.boardId, { type: 'attachment-deleted', goalId: attachment.goalId }, sub);

  return c.json({ ok: true });
});

export default attachmentsRouter;

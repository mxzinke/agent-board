import { Command } from 'commander';
import { request, uploadFile, downloadRaw } from '../lib/client';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { basename, resolve } from 'path';

interface Attachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  uploadedBy: string;
  createdAt: string;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function registerAttachmentCommands(program: Command) {
  const attachments = program.command('attachments').alias('files').description('Manage file attachments on goals');

  attachments
    .command('list <goalId>')
    .alias('ls')
    .description('List attachments on a goal')
    .action(async (goalId) => {
      const items = await request<Attachment[]>(`/goals/${goalId}/attachments`);
      if (items.length === 0) {
        console.log('No attachments.');
        return;
      }
      console.log('');
      for (const a of items) {
        const when = new Date(a.createdAt).toLocaleString();
        console.log(`  ${a.id}  ${a.filename}  (${formatSize(a.size)}, ${a.mimeType})  ${when}`);
      }
      console.log('');
    });

  attachments
    .command('upload <goalId> <filePath>')
    .description('Upload a file attachment to a goal')
    .action(async (goalId, filePath) => {
      const resolved = resolve(filePath);
      if (!existsSync(resolved)) {
        console.error(`File not found: ${resolved}`);
        process.exit(1);
      }

      const fileData = readFileSync(resolved);
      const filename = basename(resolved);

      // Detect MIME type from extension
      const mimeType = detectMimeType(filename);

      const blob = new Blob([fileData], { type: mimeType });
      const file = new File([blob], filename, { type: mimeType });

      const formData = new FormData();
      formData.append('file', file);

      const result = await uploadFile<Attachment>(`/goals/${goalId}/attachments`, formData);
      console.log(`Uploaded: ${result.filename} (${result.id})`);
    });

  attachments
    .command('download <attachmentId>')
    .description('Download an attachment')
    .option('-o, --output <path>', 'Output file path (default: original filename)')
    .action(async (attachmentId, opts) => {
      const res = await downloadRaw(`/attachments/${attachmentId}/download`);

      // Extract filename from Content-Disposition header
      const disposition = res.headers.get('content-disposition') || '';
      const filenameMatch = disposition.match(/filename="([^"]+)"/);
      const filename = opts.output || (filenameMatch ? filenameMatch[1] : `attachment-${attachmentId}`);

      const buffer = Buffer.from(await res.arrayBuffer());
      const outputPath = resolve(filename);
      writeFileSync(outputPath, buffer);
      console.log(`Downloaded: ${outputPath} (${formatSize(buffer.length)})`);
    });

  attachments
    .command('delete <attachmentId>')
    .alias('rm')
    .description('Delete an attachment')
    .action(async (attachmentId) => {
      await request(`/attachments/${attachmentId}`, { method: 'DELETE' });
      console.log('Attachment deleted.');
    });
}

function detectMimeType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase();
  const mimeMap: Record<string, string> = {
    // Images
    png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', gif: 'image/gif',
    webp: 'image/webp', svg: 'image/svg+xml', bmp: 'image/bmp', avif: 'image/avif',
    // Documents
    pdf: 'application/pdf',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    odt: 'application/vnd.oasis.opendocument.text',
    ods: 'application/vnd.oasis.opendocument.spreadsheet',
    // Text
    txt: 'text/plain', csv: 'text/csv', md: 'text/markdown',
    // Archives
    zip: 'application/zip', gz: 'application/gzip',
    // Data
    json: 'application/json', xml: 'application/xml',
  };
  return mimeMap[ext || ''] || 'application/octet-stream';
}

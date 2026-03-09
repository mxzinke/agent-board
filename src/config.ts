export const config = {
  rateLimitPerHour: parseInt(process.env.RATE_LIMIT_PER_HOUR || '1000'),
  maxGoalsPerBoard: parseInt(process.env.MAX_GOALS_PER_BOARD || '200'),
  maxCommentsPerDay: parseInt(process.env.MAX_COMMENTS_PER_DAY || '500'),
  maxUploadSizeMB: parseInt(process.env.MAX_UPLOAD_SIZE_MB || '100'),
  maxUploadsPerDay: parseInt(process.env.MAX_UPLOADS_PER_DAY || '50'),

  storageBackend: (process.env.STORAGE_BACKEND || 'inline') as 'inline' | 's3',
  s3Endpoint: process.env.STORAGE_S3_ENDPOINT || '',
  s3Bucket: process.env.STORAGE_S3_BUCKET || '',
  s3AccessKey: process.env.STORAGE_S3_ACCESS_KEY || '',
  s3SecretKey: process.env.STORAGE_S3_SECRET_KEY || '',
  s3Region: process.env.STORAGE_S3_REGION || 'auto',
};

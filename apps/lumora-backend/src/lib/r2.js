import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

export const r2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY || '',
  },
});

export const R2_BUCKET = process.env.R2_BUCKET || 'camora-prep-docs';

export async function fetchR2Text(r2Key) {
  const cmd = new GetObjectCommand({ Bucket: R2_BUCKET, Key: r2Key });
  const resp = await r2.send(cmd);
  const chunks = [];
  for await (const chunk of resp.Body) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf-8');
}

import { S3Client, DeleteObjectCommand, HeadObjectCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let _client = null;

export function getR2Client() {
  if (_client) return _client;
  const id = process.env.R2_ACCOUNT_ID;
  const key = process.env.R2_ACCESS_KEY_ID;
  const secret = process.env.R2_SECRET_ACCESS_KEY;
  if (!id || !key || !secret) throw new Error('R2 credentials not configured');
  _client = new S3Client({
    region: 'auto',
    endpoint: `https://${id}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: key, secretAccessKey: secret },
  });
  return _client;
}

export function r2Bucket() {
  const b = process.env.R2_BUCKET;
  if (!b) throw new Error('R2_BUCKET not configured');
  return b;
}

export async function presignPut(key, expiresIn = 3600) {
  const cmd = new PutObjectCommand({ Bucket: r2Bucket(), Key: key });
  return getSignedUrl(getR2Client(), cmd, { expiresIn });
}

export async function presignGet(key, expiresIn = 3600) {
  const cmd = new GetObjectCommand({ Bucket: r2Bucket(), Key: key });
  return getSignedUrl(getR2Client(), cmd, { expiresIn });
}

export async function deleteObject(key) {
  await getR2Client().send(new DeleteObjectCommand({ Bucket: r2Bucket(), Key: key }));
}

export async function headObject(key) {
  const res = await getR2Client().send(new HeadObjectCommand({ Bucket: r2Bucket(), Key: key }));
  return { ContentLength: res.ContentLength ?? 0 };
}

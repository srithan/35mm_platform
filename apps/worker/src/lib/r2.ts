import { GetObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import type { WorkerEnv } from "./env.js";

var s3Client: S3Client | null = null;

export function getWorkerR2Client(env: WorkerEnv): S3Client {
  if (s3Client) return s3Client;
  s3Client = new S3Client({
    region: "auto",
    endpoint: "https://" + env.R2_ACCOUNT_ID + ".r2.cloudflarestorage.com",
    credentials: {
      accessKeyId: env.R2_ACCESS_KEY_ID,
      secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true,
  });
  return s3Client;
}

export async function getWorkerR2ObjectBytes(
  env: WorkerEnv,
  key: string
): Promise<Uint8Array> {
  var response = await getWorkerR2Client(env).send(
    new GetObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
    })
  );
  if (!response.Body) {
    throw new Error("Missing R2 body for key: " + key);
  }
  return response.Body.transformToByteArray();
}

export async function putWorkerR2WebpObject(
  env: WorkerEnv,
  key: string,
  body: Buffer
): Promise<void> {
  await getWorkerR2Client(env).send(
    new PutObjectCommand({
      Bucket: env.R2_BUCKET,
      Key: key,
      Body: body,
      ContentType: "image/webp",
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
}

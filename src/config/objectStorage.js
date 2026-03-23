import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from "@aws-sdk/client-s3";

import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { v4 as uuidv4 } from "uuid";
import { config } from "./config.js"

const s3 = new S3Client({
  // region: config.elasticlakeRegion,
  region: "auto",
  endpoint: config.elasticlakeEndpoint,
  credentials: {
    accessKeyId: config.elasticlakeKey,
    secretAccessKey: config.elasticlakeSecret,
  },
  forcePathStyle: true, // ⚠️ important for S3-compatible services
});

const BUCKET = config.elasticlakeBucket;

// Upload
export const uploadToStorage = async (file, spaceId) => {
  const fileKey = `spaces/${spaceId}/${uuidv4()}-${file.originalname}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3.send(command);

  return { fileKey };
};

// Signed URL
export const generateSignedUrl = async (fileKey) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
  });

  return await getSignedUrl(s3, command, {
    expiresIn: 60 * 5, // 5 minutes
  });
};

// Delete
export const deleteFromStorage = async (fileKey) => {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET,
    Key: fileKey,
  });

  await s3.send(command);
};
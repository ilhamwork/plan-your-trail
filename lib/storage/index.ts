import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"
import { env } from "../env"

export interface StorageOptions {
  contentType?: string
  contentEncoding?: string
}

export interface SignedUrlOptions {
  expiresInSeconds: number
  downloadFilename?: string
}

export interface StorageBackend {
  putObject(
    key: string,
    body: Uint8Array,
    opts?: StorageOptions
  ): Promise<void>
  getObject(key: string): Promise<Uint8Array>
  deleteObject(key: string): Promise<void>
  signedUrl(key: string, opts: SignedUrlOptions): Promise<string>
}

let testBackend: StorageBackend | null = null
let s3ClientInstance: S3Client | null = null

function getR2Client(): { client: S3Client; bucket: string } {
  const envVars = env()
  const accountId = envVars.R2_ACCOUNT_ID
  const accessKeyId = envVars.R2_ACCESS_KEY_ID
  const secretAccessKey = envVars.R2_SECRET_ACCESS_KEY
  const bucket = envVars.R2_BUCKET_NAME

  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) {
    throw new Error(
      "Cloudflare R2 storage credentials (R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME) are not configured."
    )
  }

  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId,
        secretAccessKey,
      },
    })
  }

  return { client: s3ClientInstance, bucket }
}

const defaultR2Backend: StorageBackend = {
  async putObject(key: string, body: Uint8Array, opts?: StorageOptions) {
    const { client, bucket } = getR2Client()
    const command = new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: body,
      ContentType: opts?.contentType,
      ContentEncoding: opts?.contentEncoding,
    })
    await client.send(command)
  },

  async getObject(key: string): Promise<Uint8Array> {
    const { client, bucket } = getR2Client()
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
    })
    const response = await client.send(command)
    if (!response.Body) {
      throw new Error(`Object ${key} has no body`)
    }
    return await response.Body.transformToByteArray()
  },

  async deleteObject(key: string): Promise<void> {
    const { client, bucket } = getR2Client()
    const command = new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    })
    await client.send(command)
  },

  async signedUrl(key: string, opts: SignedUrlOptions): Promise<string> {
    const { client, bucket } = getR2Client()
    const command = new GetObjectCommand({
      Bucket: bucket,
      Key: key,
      ResponseContentDisposition: opts.downloadFilename
        ? `attachment; filename="${opts.downloadFilename}"`
        : undefined,
    })
    return await getSignedUrl(client, command, {
      expiresIn: opts.expiresInSeconds,
    })
  },
}

let devMemoryStorage: (StorageBackend & { files: Map<string, unknown> }) | null = null

function getBackend(): StorageBackend {
  if (testBackend) return testBackend

  const envVars = env()
  const hasR2 =
    envVars.R2_ACCOUNT_ID &&
    envVars.R2_ACCESS_KEY_ID &&
    envVars.R2_SECRET_ACCESS_KEY &&
    envVars.R2_BUCKET_NAME

  if (!hasR2 && process.env.NODE_ENV !== "production") {
    if (!devMemoryStorage) {
      devMemoryStorage = createInMemoryStorage()
    }
    return devMemoryStorage
  }

  return defaultR2Backend
}

/**
 * Puts an object into storage.
 * DB stores object keys, never full URLs.
 * Format: gpx/{userId}/{routeId}.gpx.gz
 */
export async function putObject(
  key: string,
  body: Uint8Array,
  opts?: StorageOptions
): Promise<void> {
  return await getBackend().putObject(key, body, opts)
}

/**
 * Retrieves raw object bytes from storage.
 */
export async function getObject(key: string): Promise<Uint8Array> {
  return await getBackend().getObject(key)
}

/**
 * Permanently deletes an object from storage.
 */
export async function deleteObject(key: string): Promise<void> {
  return await getBackend().deleteObject(key)
}

/**
 * Generates a short-lived presigned URL for secure direct downloads.
 */
export async function signedUrl(
  key: string,
  opts: SignedUrlOptions
): Promise<string> {
  return await getBackend().signedUrl(key, opts)
}

/**
 * Helper for testing: inject a custom backend or in-memory store.
 */
export function _setStorageBackendForTesting(
  backend: StorageBackend | null
): void {
  testBackend = backend
}

/**
 * Creates an in-memory storage backend for unit testing without live S3/R2 network calls.
 */
export function createInMemoryStorage(): StorageBackend & {
  files: Map<
    string,
    { body: Uint8Array; contentType?: string; contentEncoding?: string }
  >
} {
  const files = new Map<
    string,
    { body: Uint8Array; contentType?: string; contentEncoding?: string }
  >()

  return {
    files,
    async putObject(key, body, opts) {
      files.set(key, {
        body,
        contentType: opts?.contentType,
        contentEncoding: opts?.contentEncoding,
      })
    },
    async getObject(key) {
      const found = files.get(key)
      if (!found) {
        throw new Error(`Object not found: ${key}`)
      }
      return found.body
    },
    async deleteObject(key) {
      files.delete(key)
    },
    async signedUrl(key, opts) {
      if (!files.has(key)) {
        throw new Error(`Object not found for signing: ${key}`)
      }
      const filename = opts.downloadFilename ? `&filename=${encodeURIComponent(opts.downloadFilename)}` : ""
      return `https://mock-r2.cloudflarestorage.com/mock-bucket/${key}?expires=${opts.expiresInSeconds}${filename}`
    },
  }
}

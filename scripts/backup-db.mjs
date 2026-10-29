#!/usr/bin/env node

/**
 * E7 Offsite Database Backup Script (PRD Section 9.6 & 9.8).
 * Runs pg_dump --no-owner --no-acl, gzips the SQL output, and uploads
 * to S3-compatible offsite storage (Cloudflare R2 / Backblaze B2) or writes locally.
 */

import { execFile } from "node:child_process"
import { promisify } from "node:util"
import zlib from "node:zlib"
import fs from "node:fs/promises"
import path from "node:path"
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3"

const execFileAsync = promisify(execFile)
const gzipAsync = promisify(zlib.gzip)

export async function runBackup({
  databaseUrl = process.env.DATABASE_URL,
  localOut = process.env.BACKUP_LOCAL_OUT,
  r2AccountId = process.env.R2_ACCOUNT_ID,
  r2AccessKeyId = process.env.R2_ACCESS_KEY_ID,
  r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY,
  r2BucketName = process.env.R2_BUCKET_NAME,
} = {}) {
  if (!databaseUrl) {
    throw new Error("DATABASE_URL is required to run pg_dump backup.")
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
  const objectKey = `backups/pg_dump-${timestamp}.sql.gz`

  const { stdout } = await execFileAsync(
    "pg_dump",
    ["--no-owner", "--no-acl", "--clean", "--if-exists", databaseUrl],
    { maxBuffer: 100 * 1024 * 1024 }
  )

  const compressed = await gzipAsync(Buffer.from(stdout, "utf-8"))

  if (localOut) {
    const resolved = path.resolve(localOut)
    await fs.mkdir(path.dirname(resolved), { recursive: true })
    await fs.writeFile(resolved, compressed)
    console.info(`[Backup] Wrote ${compressed.byteLength} bytes to ${resolved}`)
  }

  if (r2AccountId && r2AccessKeyId && r2SecretAccessKey && r2BucketName) {
    const client = new S3Client({
      region: "auto",
      endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: r2AccessKeyId,
        secretAccessKey: r2SecretAccessKey,
      },
    })

    await client.send(
      new PutObjectCommand({
        Bucket: r2BucketName,
        Key: objectKey,
        Body: compressed,
        ContentType: "application/sql",
        ContentEncoding: "gzip",
      })
    )
    console.info(
      `[Backup] Uploaded ${compressed.byteLength} bytes to s3://${r2BucketName}/${objectKey}`
    )
  } else if (!localOut) {
    throw new Error(
      "Neither R2 credentials nor BACKUP_LOCAL_OUT were provided for backup destination."
    )
  }

  return {
    key: objectKey,
    bytes: compressed.byteLength,
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runBackup().catch((err) => {
    console.error("[Backup Failed]", err instanceof Error ? err.message : err)
    process.exit(1)
  })
}


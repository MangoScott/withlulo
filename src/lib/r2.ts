import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// R2 Configuration
const R2_ACCOUNT_ID = process.env.CLOUDFLARE_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || 'lulo-recordings';
const R2_PUBLIC_URL = process.env.R2_PUBLIC_URL; // Optional: Custom domain for public access

// Create S3 client configured for Cloudflare R2
function getR2Client() {
    if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
        throw new Error('Missing R2 environment variables');
    }

    return new S3Client({
        region: 'auto',
        endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId: R2_ACCESS_KEY_ID,
            secretAccessKey: R2_SECRET_ACCESS_KEY
        }
    });
}

// Generate a presigned URL for uploading
export async function getUploadUrl(
    key: string,
    contentType: string,
    expiresIn: number = 900 // 15 minutes
): Promise<string> {
    const client = getR2Client();

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key,
        ContentType: contentType
    });

    return getSignedUrl(client, command, { expiresIn });
}

// Generate a presigned URL for downloading (private files)
export async function getDownloadUrl(
    key: string,
    expiresIn: number = 3600 // 1 hour
): Promise<string> {
    const client = getR2Client();

    const command = new GetObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key
    });

    return getSignedUrl(client, command, { expiresIn });
}

// Get public URL for a file (if bucket has public access configured)
export function getPublicUrl(key: string): string {
    if (R2_PUBLIC_URL) {
        return `${R2_PUBLIC_URL}/${key}`;
    }
    // Fallback to R2.dev URL if configured
    return `https://${R2_BUCKET_NAME}.${R2_ACCOUNT_ID}.r2.dev/${key}`;
}

// Delete a file from R2
export async function deleteFile(key: string): Promise<void> {
    const client = getR2Client();

    const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET_NAME,
        Key: key
    });

    await client.send(command);
}

// Generate a unique key for storing files
export function generateFileKey(
    userId: string,
    type: 'recordings' | 'thumbnails' | 'exports' | 'images',
    filename: string
): string {
    const timestamp = Date.now();
    const sanitizedFilename = filename.replace(/[^a-zA-Z0-9.-]/g, '_');
    return `${type}/${userId}/${timestamp}-${sanitizedFilename}`;
}

// Helper to get file extension from content type
export function getExtensionFromContentType(contentType: string): string {
    const extensions: Record<string, string> = {
        'video/webm': 'webm',
        'video/mp4': 'mp4',
        'image/png': 'png',
        'image/jpeg': 'jpg',
        'image/webp': 'webp'
    };
    return extensions[contentType] || 'bin';
}

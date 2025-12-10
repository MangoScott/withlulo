import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { getEnv } from './env-server';

// R2 Configuration
// Use getEnv to support both Node and Edge runtimes
const getR2Config = () => ({
    accountId: getEnv('CLOUDFLARE_ACCOUNT_ID') || getEnv('R2_ACCOUNT_ID'),
    accessKeyId: getEnv('R2_ACCESS_KEY_ID'),
    secretAccessKey: getEnv('R2_SECRET_ACCESS_KEY'),
    bucketName: getEnv('R2_BUCKET_NAME') || 'lulo-recordings',
    publicUrl: getEnv('R2_PUBLIC_URL')
});

// Create S3 client configured for Cloudflare R2
function getR2Client() {
    const { accountId, accessKeyId, secretAccessKey } = getR2Config();

    if (!accountId || !accessKeyId || !secretAccessKey) {
        throw new Error('Missing R2 environment variables');
    }

    return new S3Client({
        region: 'auto',
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
            accessKeyId,
            secretAccessKey
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
    const { bucketName } = getR2Config();

    const command = new PutObjectCommand({
        Bucket: bucketName,
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
    const { bucketName } = getR2Config();

    const command = new GetObjectCommand({
        Bucket: bucketName,
        Key: key
    });

    return getSignedUrl(client, command, { expiresIn });
}

// Get public URL for a file (if bucket has public access configured)
export function getPublicUrl(key: string): string {
    const { publicUrl, bucketName, accountId } = getR2Config();
    if (publicUrl) {
        return `${publicUrl}/${key}`;
    }
    // Fallback to R2.dev URL if configured
    return `https://${bucketName}.${accountId}.r2.dev/${key}`;
}

// Delete a file from R2
export async function deleteFile(key: string): Promise<void> {
    const client = getR2Client();
    const { bucketName } = getR2Config();

    const command = new DeleteObjectCommand({
        Bucket: bucketName,
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

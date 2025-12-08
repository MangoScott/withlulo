import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase';
import { generateFileKey, getUploadUrl, getPublicUrl, deleteFile } from '@/lib/r2';
import { nanoid } from 'nanoid';

export const runtime = 'edge';

// GET: List images for user
export const GET = async (request: NextRequest) => {
    return withAuth(request, async (req, userId) => {
        const supabase = createServerClient();

        const { data, error } = await supabase
            .from('images' as any)
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) {
            return NextResponse.json({ error: error.message }, { status: 500 });
        }

        return NextResponse.json({ images: data });
    });
};

// POST: Upload Image (Step 1: Get Upload URL & Create Record)
// For extension, we might be sending binary data directly or asking for a signed URL to upload to.
// The content script logic I wrote sends FormData with the file.
// So this endpoint needs to handle a standard multipart upload? 
// Edge functions don't like multipart parsing easily.
// Alternative: Content Script requests an upload URL, then uploads directly to R2. 
// BUT, the content script logic I wrote:
// `const uploadRes = await fetch(API_URL, { method: 'POST', body: formData ... })`
// This implies the server handles the upload.
// Since we are on Cloudflare Pages (Edge), parsing FormData is okay.

export const POST = async (request: NextRequest) => {
    return withAuth(request, async (req, userId) => {
        try {
            const formData = await request.formData();
            const file = formData.get('file') as File;

            if (!file) {
                return NextResponse.json({ error: 'No file provided' }, { status: 400 });
            }

            // 1. Upload to R2 (Direct Put)
            // We can't use 'PutObjectCommand' directly efficiently with large files in Edge?
            // Actually, for screenshots (small), it's fine.
            // But AWS SDK on Edge is fine.
            const { R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ACCOUNT_ID, R2_BUCKET_NAME } = process.env;
            if (!R2_BUCKET_NAME) throw new Error('R2 Config missing');

            // We'll reuse our r2.ts helpers? 
            // `getUploadUrl` returns a presigned URL.
            // We can try to PUT directly from here if we read the stream.

            const key = generateFileKey(userId, 'images', file.name);
            const arrayBuffer = await file.arrayBuffer();

            // We need to use the S3 Client to put object.
            // Importing getR2Client isn't exported, let's export it or duplicate.
            // Wait, r2.ts doesn't export the client.
            // Let's modify r2.ts to export client or add a uploadFile function.
            // Or just use a Put fetch to the presigned url? No that's round trip.
            // Let's just use the S3Client.

            const { S3Client, PutObjectCommand } = await import('@aws-sdk/client-s3');
            const client = new S3Client({
                region: 'auto',
                endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
                credentials: {
                    accessKeyId: R2_ACCESS_KEY_ID!,
                    secretAccessKey: R2_SECRET_ACCESS_KEY!
                }
            });

            await client.send(new PutObjectCommand({
                Bucket: R2_BUCKET_NAME,
                Key: key,
                ContentType: file.type,
                Body: new Uint8Array(arrayBuffer)
            }));

            // 2. Save to Database
            const publicUrl = getPublicUrl(key);
            const supabase = createServerClient();

            const { data, error } = await supabase
                .from('images' as any)
                .insert({
                    user_id: userId,
                    title: file.name.replace('.png', ''),
                    url: publicUrl
                })
                .select()
                .single();

            if (error) throw error;

            return NextResponse.json({ success: true, image: data });

        } catch (error: any) {
            console.error('Upload error:', error);
            return NextResponse.json({ error: error.message }, { status: 500 });
        }
    });
};

export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { getUserFromToken } from '@/lib/supabase-server';
import { getUploadUrl, generateFileKey, getExtensionFromContentType } from '@/lib/r2';
import { handleCors, withCors, withAuth } from '@/lib/auth';

// POST /api/recordings/upload - Get presigned upload URL
export async function POST(request: NextRequest) {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    return withAuth(request, async (req, userId) => {
        try {
            const body = await req.json();
            const { filename, contentType, size } = body;

            if (!filename || !contentType) {
                return withCors(NextResponse.json(
                    { error: 'Filename and contentType are required' },
                    { status: 400 }
                ));
            }

            // Validate content type
            const allowedTypes = ['video/webm', 'video/mp4', 'image/png', 'image/jpeg', 'image/webp'];
            if (!allowedTypes.includes(contentType)) {
                return withCors(NextResponse.json(
                    { error: 'Invalid content type' },
                    { status: 400 }
                ));
            }

            // Validate file size (max 500MB)
            const maxSize = 500 * 1024 * 1024;
            if (size && size > maxSize) {
                return withCors(NextResponse.json(
                    { error: 'File too large. Maximum size is 500MB' },
                    { status: 400 }
                ));
            }

            // Generate unique key for the file
            const extension = getExtensionFromContentType(contentType);
            const key = generateFileKey(userId, 'recordings', `recording.${extension}`);

            // Get presigned upload URL
            const uploadUrl = await getUploadUrl(key, contentType);

            return withCors(NextResponse.json({
                uploadUrl,
                key,
                expiresIn: 900 // 15 minutes
            }));
        } catch (error) {
            console.error('Upload URL error:', error);
            return withCors(NextResponse.json(
                { error: error instanceof Error ? error.message : 'Failed to generate upload URL' },
                { status: 500 }
            ));
        }
    });
}

export async function OPTIONS(request: NextRequest) {
    return handleCors(request) || new NextResponse(null, { status: 204 });
}

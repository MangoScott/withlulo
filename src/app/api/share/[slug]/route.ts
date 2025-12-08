export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { getDownloadUrl, getPublicUrl } from '@/lib/r2';
import { handleCors, withCors } from '@/lib/auth';

interface RouteParams {
    params: Promise<{ slug: string }>;
}

// GET /api/share/[slug] - Get public recording (no auth required)
export async function GET(request: NextRequest, { params }: RouteParams) {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const { slug } = await params;

    try {
        const supabase = createServerClient();

        // Get public recording by share slug
        const { data: recording, error } = await supabase
            .from('recordings')
            .select(`
                id,
                title,
                description,
                duration_seconds,
                webm_key,
                mp4_key,
                thumbnail_key,
                view_count,
                created_at,
                profiles:user_id (
                    display_name,
                    avatar_url
                )
            `)
            .eq('share_slug', slug)
            .eq('is_public', true)
            .single();

        if (error || !recording) {
            return withCors(NextResponse.json(
                { error: 'Recording not found or is private' },
                { status: 404 }
            ));
        }

        // Increment view count
        await supabase
            .from('recordings')
            .update({ view_count: (recording.view_count || 0) + 1 })
            .eq('id', recording.id);

        // Get video URL (prefer MP4 for better compatibility)
        let videoUrl = null;
        if (recording.mp4_key) {
            videoUrl = await getDownloadUrl(recording.mp4_key, 7200); // 2 hours
        } else if (recording.webm_key) {
            videoUrl = await getDownloadUrl(recording.webm_key, 7200);
        }

        let thumbnailUrl = null;
        if (recording.thumbnail_key) {
            thumbnailUrl = await getDownloadUrl(recording.thumbnail_key, 7200);
        }

        return withCors(NextResponse.json({
            recording: {
                id: recording.id,
                title: recording.title,
                description: recording.description,
                duration_seconds: recording.duration_seconds,
                view_count: recording.view_count + 1,
                created_at: recording.created_at,
                video_url: videoUrl,
                thumbnail_url: thumbnailUrl,
                author: recording.profiles
            }
        }));
    } catch (error) {
        console.error('Share error:', error);
        return withCors(NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        ));
    }
}

export async function OPTIONS(request: NextRequest) {
    return handleCors(request) || new NextResponse(null, { status: 204 });
}

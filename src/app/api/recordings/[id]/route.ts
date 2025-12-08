export const runtime = 'edge';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient, getUserFromToken } from '@/lib/supabase-server';
import { getDownloadUrl, deleteFile } from '@/lib/r2';
import { handleCors, withCors, withAuth, generateShareSlug } from '@/lib/auth';

interface RouteParams {
    params: Promise<{ id: string }>;
}

// GET /api/recordings/[id] - Get single recording
export async function GET(request: NextRequest, { params }: RouteParams) {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const { id } = await params;

    return withAuth(request, async (req, userId) => {
        try {
            const supabase = createServerClient();

            const { data: recording, error } = await supabase
                .from('recordings')
                .select('*')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (error || !recording) {
                return withCors(NextResponse.json(
                    { error: 'Recording not found' },
                    { status: 404 }
                ));
            }

            // Get signed URLs for video files
            let videoUrl = null;
            let thumbnailUrl = null;

            if (recording.mp4_key) {
                videoUrl = await getDownloadUrl(recording.mp4_key);
            } else if (recording.webm_key) {
                videoUrl = await getDownloadUrl(recording.webm_key);
            }

            if (recording.thumbnail_key) {
                thumbnailUrl = await getDownloadUrl(recording.thumbnail_key);
            }

            return withCors(NextResponse.json({
                recording: {
                    ...recording,
                    video_url: videoUrl,
                    thumbnail_url: thumbnailUrl
                }
            }));
        } catch (error) {
            console.error('Get recording error:', error);
            return withCors(NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            ));
        }
    });
}

// PATCH /api/recordings/[id] - Update recording
export async function PATCH(request: NextRequest, { params }: RouteParams) {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const { id } = await params;

    return withAuth(request, async (req, userId) => {
        try {
            const body = await req.json();
            const { title, description, project_id, is_public } = body;

            const supabase = createServerClient();

            // Build update object
            const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
            if (title !== undefined) updates.title = title;
            if (description !== undefined) updates.description = description;
            if (project_id !== undefined) updates.project_id = project_id;
            if (is_public !== undefined) {
                updates.is_public = is_public;
                // Generate share slug if making public
                if (is_public) {
                    updates.share_slug = generateShareSlug();
                }
            }

            const { data: recording, error } = await supabase
                .from('recordings')
                .update(updates)
                .eq('id', id)
                .eq('user_id', userId)
                .select()
                .single();

            if (error || !recording) {
                return withCors(NextResponse.json(
                    { error: 'Recording not found' },
                    { status: 404 }
                ));
            }

            return withCors(NextResponse.json({ recording }));
        } catch (error) {
            console.error('Update recording error:', error);
            return withCors(NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            ));
        }
    });
}

// DELETE /api/recordings/[id] - Delete recording
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const corsResponse = handleCors(request);
    if (corsResponse) return corsResponse;

    const { id } = await params;

    return withAuth(request, async (req, userId) => {
        try {
            const supabase = createServerClient();

            // Get recording first to delete files
            const { data: recording } = await supabase
                .from('recordings')
                .select('webm_key, mp4_key, thumbnail_key')
                .eq('id', id)
                .eq('user_id', userId)
                .single();

            if (!recording) {
                return withCors(NextResponse.json(
                    { error: 'Recording not found' },
                    { status: 404 }
                ));
            }

            // Delete files from R2
            const deletePromises = [];
            if (recording.webm_key) deletePromises.push(deleteFile(recording.webm_key));
            if (recording.mp4_key) deletePromises.push(deleteFile(recording.mp4_key));
            if (recording.thumbnail_key) deletePromises.push(deleteFile(recording.thumbnail_key));

            await Promise.allSettled(deletePromises);

            // Delete from database
            await supabase
                .from('recordings')
                .delete()
                .eq('id', id)
                .eq('user_id', userId);

            return withCors(NextResponse.json({ success: true }));
        } catch (error) {
            console.error('Delete recording error:', error);
            return withCors(NextResponse.json(
                { error: 'Internal server error' },
                { status: 500 }
            ));
        }
    });
}

export async function OPTIONS(request: NextRequest) {
    return handleCors(request) || new NextResponse(null, { status: 204 });
}

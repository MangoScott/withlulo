import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase-server';
import { getDownloadUrl } from '@/lib/r2';

export const runtime = 'edge';

export const GET = async (request: NextRequest) => {
    return withAuth(request, async (req, userId) => {
        const url = new URL(request.url);
        const recordingId = url.searchParams.get('id');
        const format = url.searchParams.get('format') || 'webm';

        if (!recordingId) {
            return NextResponse.json({ error: 'Missing recording ID' }, { status: 400 });
        }

        const supabase = createServerClient();

        // 1. Get Recording
        const { data: recording, error } = await supabase
            .from('recordings')
            .select('*')
            .eq('id', recordingId)
            .single();

        if (error || !recording) {
            return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
        }

        // 2. Check Permissions (Owner or it's public? Actually for raw download usually owner only unless public)
        // Let's restrict download raw file to owner for now for security/cost, unless we want public downloads.
        // User requested "from within the dashboard", so owner context is implied.
        if (recording.user_id !== userId) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }

        // 3. Determine Key
        let fileKey = recording.webm_key;
        let filename = `${recording.title || 'recording'}.webm`;

        if (format === 'mp4' && recording.mp4_key) {
            fileKey = recording.mp4_key;
            filename = `${recording.title || 'recording'}.mp4`;
        } else if (format === 'mp4' && !recording.mp4_key) {
            // Fallback logic handled by frontend usually, but if requested mp4 and don't have it, return webm?
            // Let's stick to what we have.
            // If they ask for MP4 but we don't have it, we default to WebM but warn?
            // For simplicity, just return what we defined above (default webm).
        }

        if (!fileKey) {
            return NextResponse.json({ error: 'File not found' }, { status: 404 });
        }

        // 4. Generate URL
        // We use r2.getDownloadUrl which signs it.
        try {
            const downloadUrl = await getDownloadUrl(fileKey);
            return NextResponse.json({ url: downloadUrl, filename });
        } catch (e: any) {
            return NextResponse.json({ error: e.message }, { status: 500 });
        }
    });
};

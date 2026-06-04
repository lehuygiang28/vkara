import { NextResponse } from 'next/server';

import { env } from '@/env';

const MAX_AUDIO_BYTES = 12 * 1024 * 1024;

function whisperTranscribeUrl(baseUrl: string): string {
    const trimmed = baseUrl.replace(/\/$/, '');
    if (trimmed.endsWith('/v1/audio/transcriptions')) {
        return trimmed;
    }
    return `${trimmed}/v1/audio/transcriptions`;
}

export async function POST(request: Request) {
    const whisperUrl = env.WHISPER_URL?.trim();
    if (!whisperUrl) {
        return NextResponse.json({ error: 'Whisper is not configured' }, { status: 503 });
    }

    const incoming = await request.formData();
    const file = incoming.get('file');
    if (!(file instanceof File) || file.size === 0) {
        return NextResponse.json({ error: 'Missing audio file' }, { status: 400 });
    }

    if (file.size > MAX_AUDIO_BYTES) {
        return NextResponse.json({ error: 'Audio file is too large' }, { status: 413 });
    }

    const language = incoming.get('language');
    const upstream = new FormData();
    upstream.append('file', file, file.name || 'recording.webm');
    if (typeof language === 'string' && language.trim()) {
        upstream.append('language', language.trim());
    }

    const headers = new Headers();
    const hfToken = env.HF_TOKEN?.trim();
    if (hfToken) {
        headers.set('Authorization', `Bearer ${hfToken}`);
    }

    let upstreamResponse: Response;
    try {
        upstreamResponse = await fetch(whisperTranscribeUrl(whisperUrl), {
            method: 'POST',
            headers,
            body: upstream,
            signal: AbortSignal.timeout(120_000),
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Upstream request failed';
        return NextResponse.json({ error: message }, { status: 502 });
    }

    const responseText = await upstreamResponse.text();
    if (!upstreamResponse.ok) {
        return NextResponse.json(
            { error: responseText || upstreamResponse.statusText },
            { status: upstreamResponse.status },
        );
    }

    try {
        return NextResponse.json(JSON.parse(responseText) as { text: string });
    } catch {
        return NextResponse.json({ error: 'Invalid upstream response' }, { status: 502 });
    }
}

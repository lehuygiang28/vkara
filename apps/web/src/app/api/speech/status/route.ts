import { NextResponse } from 'next/server';

import { env } from '@/env';

export function GET() {
    const whisperUrl = env.WHISPER_URL?.trim();

    return NextResponse.json({
        whisperAvailable: Boolean(whisperUrl),
    });
}

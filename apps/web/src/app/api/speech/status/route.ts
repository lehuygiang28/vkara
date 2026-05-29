import { NextResponse } from 'next/server';

export function GET() {
    const whisperUrl = process.env.WHISPER_URL?.trim();

    return NextResponse.json({
        whisperAvailable: Boolean(whisperUrl),
    });
}

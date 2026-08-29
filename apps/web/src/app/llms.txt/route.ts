import { buildLlmsTxtContent, resolveLlmsOriginsFromRequest } from '@/lib/llms-txt';

export function GET(request: Request): Response {
    const origins = resolveLlmsOriginsFromRequest(request);
    const body = buildLlmsTxtContent(origins);

    return new Response(body, {
        headers: {
            'Content-Type': 'text/plain; charset=utf-8',
            'Cache-Control': 'public, max-age=300',
        },
    });
}

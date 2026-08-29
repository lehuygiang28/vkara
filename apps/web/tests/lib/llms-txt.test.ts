import { describe, expect, it } from 'vitest';

import {
    buildLlmsTxtContent,
    getRequestAppOrigin,
    resolveApiOriginForRequest,
    resolveLlmsOriginsFromRequest,
} from '@/lib/llms-txt';

describe('llms.txt route content', () => {
    it('inlines app and API origins for this deployment', () => {
        const text = buildLlmsTxtContent({
            appOrigin: 'https://app.test',
            apiOrigin: 'https://api.test',
        });

        expect(text.startsWith('# vkara')).toBe(true);
        expect(text).toContain('**App origin:** https://app.test');
        expect(text).toContain('**API origin:** https://api.test');
        expect(text).toContain('**Factory base:** https://api.test/url-commands');
        expect(text).toContain('https://app.test/llms.txt');
        expect(text).toContain('POST https://api.test/url-commands/validate');
        expect(text).toContain('https://app.test/?roomId=4821');
        expect(text).toContain('YouTube');
        expect(text).not.toContain('{appOrigin}');
        expect(text).not.toContain('{apiOrigin}');
        expect(text).toContain('## Agent onboarding (read this first)');
        expect(text).toContain('Case A — invite only');
        expect(text).toContain('Case B — invite + task');
        expect(text).toContain('What you can do (tell the user');
        expect(text).toContain('Thêm bài vào hàng đợi');
        expect(text).toContain('POST https://api.test/search');
    });

    it('resolves request origin from forwarded headers', () => {
        const request = new Request('http://internal/llms.txt', {
            headers: {
                'x-forwarded-host': 'vkara-local.giang.io.vn',
                'x-forwarded-proto': 'https',
            },
        });

        expect(getRequestAppOrigin(request)).toBe('https://vkara-local.giang.io.vn');
    });

    it('defaults API to localhost:8000 when app is localhost:3000', () => {
        const prev = process.env.NEXT_PUBLIC_API_URL;
        delete process.env.NEXT_PUBLIC_API_URL;
        try {
            expect(resolveApiOriginForRequest('http://localhost:3000')).toBe(
                'http://localhost:8000',
            );
        } finally {
            if (prev === undefined) {
                delete process.env.NEXT_PUBLIC_API_URL;
            } else {
                process.env.NEXT_PUBLIC_API_URL = prev;
            }
        }
    });

    it('joins relative NEXT_PUBLIC_API_URL to the request app origin', () => {
        const prev = process.env.NEXT_PUBLIC_API_URL;
        process.env.NEXT_PUBLIC_API_URL = '/api/vkara';
        try {
            expect(resolveApiOriginForRequest('https://self.hosted')).toBe(
                'https://self.hosted/api/vkara',
            );
            const request = new Request('https://self.hosted/llms.txt');
            const origins = resolveLlmsOriginsFromRequest(request);
            const text = buildLlmsTxtContent(origins);
            expect(text).toContain('**API origin:** https://self.hosted/api/vkara');
        } finally {
            if (prev === undefined) {
                delete process.env.NEXT_PUBLIC_API_URL;
            } else {
                process.env.NEXT_PUBLIC_API_URL = prev;
            }
        }
    });
});

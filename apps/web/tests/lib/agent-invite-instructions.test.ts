import { describe, expect, it } from 'vitest';

import { buildAgentInviteInstructions } from '@/lib/agent-invite-instructions';

describe('buildAgentInviteInstructions', () => {
    it('returns one Vietnamese line with llms.txt and room id', () => {
        const text = buildAgentInviteInstructions({
            llmsTxtUrl: 'https://vkara.vercel.app/llms.txt',
            roomId: '2690',
            locale: 'vi',
        });

        expect(text).toBe(
            'Đọc https://vkara.vercel.app/llms.txt và vào phòng 2690 để giúp tôi điều khiển phòng.',
        );
    });

    it('returns one English line with llms.txt and room id', () => {
        const text = buildAgentInviteInstructions({
            llmsTxtUrl: 'https://vkara.vercel.app/llms.txt',
            roomId: '2690',
            locale: 'en',
        });

        expect(text).toBe(
            'Read https://vkara.vercel.app/llms.txt and join room 2690 to help me control the room.',
        );
    });

    it('includes password when the host has it', () => {
        expect(
            buildAgentInviteInstructions({
                llmsTxtUrl: 'https://vkara.vercel.app/llms.txt',
                roomId: '2690',
                locale: 'vi',
                password: 'party',
            }),
        ).toBe(
            'Đọc https://vkara.vercel.app/llms.txt và vào phòng 2690 (mật khẩu: party) để giúp tôi điều khiển phòng.',
        );

        expect(
            buildAgentInviteInstructions({
                llmsTxtUrl: 'https://vkara.vercel.app/llms.txt',
                roomId: '2690',
                locale: 'en',
                password: 'party',
            }),
        ).toBe(
            'Read https://vkara.vercel.app/llms.txt and join room 2690 (password: party) to help me control the room.',
        );
    });

    it('includes joinToken when the room has no password', () => {
        expect(
            buildAgentInviteInstructions({
                llmsTxtUrl: 'https://vkara.vercel.app/llms.txt',
                roomId: '2690',
                locale: 'vi',
                joinToken: 'tok_abc',
            }),
        ).toBe(
            'Đọc https://vkara.vercel.app/llms.txt và vào phòng 2690 (joinToken: tok_abc) để giúp tôi điều khiển phòng.',
        );
    });
});

export type AgentInviteInstructionsInput = {
    llmsTxtUrl: string;
    roomId: string;
    locale: 'vi' | 'en';
};

export function buildAgentInviteInstructions(input: AgentInviteInstructionsInput): string {
    const { llmsTxtUrl, roomId, locale } = input;

    if (locale === 'vi') {
        return `Đọc ${llmsTxtUrl} và vào phòng ${roomId} để giúp tôi điều khiển phòng.`;
    }

    return `Read ${llmsTxtUrl} and join room ${roomId} to help me control the room.`;
}

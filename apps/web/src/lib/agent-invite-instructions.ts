export type AgentInviteInstructionsInput = {
    llmsTxtUrl: string;
    roomId: string;
    locale: 'vi' | 'en';
    /** When the host knows the room password (same source as share URL). */
    password?: string;
};

export function buildAgentInviteInstructions(input: AgentInviteInstructionsInput): string {
    const { llmsTxtUrl, roomId, locale, password } = input;
    const trimmedPassword = password?.trim();

    if (locale === 'vi') {
        if (trimmedPassword) {
            return `Đọc ${llmsTxtUrl} và vào phòng ${roomId} (mật khẩu: ${trimmedPassword}) để giúp tôi điều khiển phòng.`;
        }
        return `Đọc ${llmsTxtUrl} và vào phòng ${roomId} để giúp tôi điều khiển phòng.`;
    }

    if (trimmedPassword) {
        return `Read ${llmsTxtUrl} and join room ${roomId} (password: ${trimmedPassword}) to help me control the room.`;
    }
    return `Read ${llmsTxtUrl} and join room ${roomId} to help me control the room.`;
}

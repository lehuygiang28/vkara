export type AgentInviteInstructionsInput = {
    llmsTxtUrl: string;
    roomId: string;
    locale: 'vi' | 'en';
    /** When the host knows the room password (same source as share URL). */
    password?: string;
    /** Capability for passwordless rooms (HTTP session). Not used on QR. */
    joinToken?: string;
};

export function buildAgentInviteInstructions(input: AgentInviteInstructionsInput): string {
    const { llmsTxtUrl, roomId, locale, password, joinToken } = input;
    const trimmedPassword = password?.trim();
    const trimmedToken = joinToken?.trim();

    const secret =
        trimmedPassword != null && trimmedPassword.length > 0
            ? locale === 'vi'
                ? ` (mật khẩu: ${trimmedPassword})`
                : ` (password: ${trimmedPassword})`
            : trimmedToken
              ? ` (joinToken: ${trimmedToken})`
              : '';

    if (locale === 'vi') {
        return `Đọc ${llmsTxtUrl} và vào phòng ${roomId}${secret} để giúp tôi điều khiển phòng.`;
    }

    return `Read ${llmsTxtUrl} and join room ${roomId}${secret} to help me control the room.`;
}

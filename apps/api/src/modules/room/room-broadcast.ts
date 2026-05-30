import type { ServerMessage } from '@vkara/shared-types';

type PublishFn = (topic: string, payload: string) => void;

let publishToTopic: PublishFn | null = null;

export function bindRoomPublisher(publish: PublishFn): void {
    publishToTopic = publish;
}

export function publishToRoom(roomId: string, message: ServerMessage): void {
    publishToTopic?.(roomId, JSON.stringify(message));
}

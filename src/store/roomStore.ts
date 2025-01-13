import { create } from 'zustand';
import { YouTubeVideo } from '@/types/youtube.type';
import { Room, ServerMessage } from '@/types/websocket.type';

interface RoomState {
    room: Room | null;
    setRoom: (room: Room | null) => void;
    addVideo: (video: YouTubeVideo) => void;
    removeVideo: (videoId: string) => void;
    playNow: (video: YouTubeVideo) => void;
    nextVideo: () => void;
    setVolume: (volume: number) => void;
    setIsPlaying: (isPlaying: boolean) => void;
    setCurrentTime: (time: number) => void;
    handleServerMessage: (message: ServerMessage) => void;
}

export const useRoomStore = create<RoomState>((set) => ({
    room: null,
    setRoom: (room) => set({ room }),
    addVideo: (video) =>
        set((state) => ({
            room: state.room
                ? {
                      ...state.room,
                      videoQueue: [...state.room.videoQueue, video],
                  }
                : null,
        })),
    removeVideo: (videoId) =>
        set((state) => ({
            room: state.room
                ? {
                      ...state.room,
                      videoQueue: state.room.videoQueue.filter((v) => v.id.videoId !== videoId),
                  }
                : null,
        })),
    playNow: (video) =>
        set((state) => ({
            room: state.room
                ? {
                      ...state.room,
                      playingNow: video,
                      isPlaying: true,
                      currentTime: 0,
                      videoQueue: state.room.videoQueue.filter(
                          (v) => v.id.videoId !== video.id.videoId,
                      ),
                      historyQueue: state.room.playingNow
                          ? [state.room.playingNow, ...state.room.historyQueue]
                          : state.room.historyQueue,
                  }
                : null,
        })),
    nextVideo: () =>
        set((state) => {
            if (!state.room) return { room: null };
            const nextVideo = state.room.videoQueue[0];
            return {
                room: {
                    ...state.room,
                    playingNow: nextVideo || null,
                    isPlaying: Boolean(nextVideo),
                    currentTime: 0,
                    videoQueue: state.room.videoQueue.slice(1),
                    historyQueue: state.room.playingNow
                        ? [state.room.playingNow, ...state.room.historyQueue]
                        : state.room.historyQueue,
                },
            };
        }),
    setVolume: (volume) =>
        set((state) => ({
            room: state.room ? { ...state.room, volume } : null,
        })),
    setIsPlaying: (isPlaying) =>
        set((state) => ({
            room: state.room ? { ...state.room, isPlaying } : null,
        })),
    setCurrentTime: (currentTime) =>
        set((state) => ({
            room: state.room ? { ...state.room, currentTime } : null,
        })),
    handleServerMessage: (message) => {
        switch (message.type) {
            case 'roomUpdate':
                set({ room: message.room });
                break;
            case 'roomClosed':
                set({ room: null });
                break;
        }
    },
}));

/* eslint-disable @next/next/no-img-element */
import React from 'react';

import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore } from '@/store/websocketStore';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useScopedI18n } from '@/locales/client';

export function VideoQueue() {
    const { room, removeVideo } = useYouTubeStore();
    const { sendMessage } = useWebSocketStore();

    const t = useScopedI18n('videoQueue');

    const removeVideoHandler = (videoId: string) => {
        if (room) {
            sendMessage({ type: 'removeVideo', videoId });
        } else {
            removeVideo(videoId);
        }
    };

    return (
        <ScrollArea className="h-[calc(100vh-30rem)] sm:h-[calc(100vh-20rem)] md:h-[calc(100vh-10rem)] pb-0">
            <div className="divide-y">
                {!room?.videoQueue || room.videoQueue.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                        {t('noVideos')}
                    </div>
                ) : (
                    room.videoQueue.map((video, index) => (
                        <div
                            key={video.id}
                            className="flex w-full items-start gap-3 p-4 text-left text-sm group"
                        >
                            <div className="relative aspect-video w-32 flex-shrink-0 overflow-hidden rounded-md">
                                <div className="absolute top-0 left-0 bg-background/80 backdrop-blur-sm px-2 py-1 text-xs font-medium">
                                    #{index + 1}
                                </div>
                                <img
                                    src={video.thumbnail?.url}
                                    alt={video.title}
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                            </div>
                            <div className="flex flex-col flex-grow min-w-0">
                                <div className="font-medium leading-snug mb-1 line-clamp-2">
                                    {video.title}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {video.channel?.name}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="self-start mt-2"
                                    onClick={() => removeVideoHandler(video.id || String(index))}
                                >
                                    {t('remove')}
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </ScrollArea>
    );
}

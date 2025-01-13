import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useYouTubeStore } from '@/store/youtubeStore';

export function VideoQueue() {
    const { room, removeVideo } = useYouTubeStore();

    return (
        <ScrollArea className="h-[calc(100vh-13rem)]">
            <div className="divide-y">
                {!room?.videoQueue || room.videoQueue.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                        No videos in queue
                    </div>
                ) : (
                    room.videoQueue.map((video, index) => (
                        <div
                            key={video.id.videoId}
                            className="flex w-full items-start gap-3 p-4 text-left text-sm group"
                        >
                            <div className="relative aspect-video w-32 flex-shrink-0 overflow-hidden rounded-md">
                                <div className="absolute top-0 left-0 bg-background/80 backdrop-blur-sm px-2 py-1 text-xs font-medium">
                                    #{index + 1}
                                </div>
                                <img
                                    src={video.snippet.thumbnails.default.url}
                                    alt=""
                                    className="absolute inset-0 h-full w-full object-cover"
                                />
                            </div>
                            <div className="flex flex-col flex-grow min-w-0">
                                <div className="font-medium leading-snug mb-1 line-clamp-2">
                                    {video.snippet.title}
                                </div>
                                <div className="text-xs text-muted-foreground truncate">
                                    {video.snippet.channelTitle}
                                </div>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="self-start mt-2"
                                    onClick={() => removeVideo(video.id.videoId)}
                                >
                                    Remove
                                </Button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </ScrollArea>
    );
}

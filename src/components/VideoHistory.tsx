import React from 'react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Play, ListVideo } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useYouTubeStore } from '@/store/youtubeStore';

export function VideoHistory() {
    const { room, selectedVideo, setSelectedVideo, playNow, addVideo } = useYouTubeStore();

    return (
        <ScrollArea className="h-[calc(100vh-13rem)]">
            <div className="divide-y">
                {!room?.historyQueue || room.historyQueue.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                        No watch history
                    </div>
                ) : (
                    room.historyQueue.map((video) => (
                        <div
                            key={video.id.videoId}
                            onClick={() => setSelectedVideo(video.id.videoId)}
                            className={cn(
                                'flex w-full items-start gap-3 p-4 text-left text-sm transition-colors hover:bg-accent/50 cursor-pointer',
                                selectedVideo === video.id.videoId && 'bg-accent',
                            )}
                        >
                            <div className="relative aspect-video w-32 flex-shrink-0 overflow-hidden rounded-md">
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
                                {selectedVideo === video.id.videoId && (
                                    <div className="flex gap-2 mt-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                playNow(video);
                                            }}
                                        >
                                            <Play className="h-4 w-4 mr-2" />
                                            Play Now
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addVideo(video);
                                            }}
                                        >
                                            <ListVideo className="h-4 w-4 mr-2" />
                                            Add to Queue
                                        </Button>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </ScrollArea>
    );
}

/* eslint-disable @next/next/no-img-element */
import React from 'react';
import { Play, ListVideo } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore } from '@/store/websocketStore';
import { YouTubeVideo } from '@/types/youtube.type';

import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { useI18n, useScopedI18n } from '@/locales/client';
import { toast } from '@/hooks/use-toast';

export function VideoHistory() {
    const { room, selectedVideo, setSelectedVideo, playNow, addVideo } = useYouTubeStore();
    const { sendMessage } = useWebSocketStore();
    const t_global = useI18n();
    const t = useScopedI18n('videoHistory');

    const playNowHandler = (video: YouTubeVideo) => {
        if (room) {
            sendMessage({ type: 'playNow', video });
        } else {
            playNow(video);
        }
        toast({
            title: t_global('videoSearch.playThisNow'),
            description: video.title,
        });
    };

    const addVideoHandler = (video: YouTubeVideo) => {
        if (room) {
            sendMessage({ type: 'addVideo', video });
        } else {
            addVideo(video);
        }
        toast({
            title: t_global('videoSearch.videoAdded'),
            description: video.title,
        });
    };

    return (
        <ScrollArea className="h-[calc(100vh-30rem)] sm:h-[calc(100vh-20rem)] md:h-[calc(100vh-10rem)] pb-0">
            <div className="divide-y">
                {!room?.historyQueue || room.historyQueue.length === 0 ? (
                    <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                        {t('noHistory')}
                    </div>
                ) : (
                    room.historyQueue.map((video, index) => (
                        <div
                            key={video.id}
                            onClick={() => setSelectedVideo(video?.id || String(index))}
                            className={cn(
                                'flex w-full items-start gap-3 p-4 text-left text-sm transition-colors hover:bg-accent/50 cursor-pointer',
                                selectedVideo === video.id && 'bg-accent',
                            )}
                        >
                            <div className="relative aspect-video w-32 flex-shrink-0 overflow-hidden rounded-md">
                                <img
                                    src={video.thumbnail?.url}
                                    alt=""
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
                                {selectedVideo === video.id && (
                                    <div className="flex gap-2 mt-2">
                                        <Button
                                            variant="secondary"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                playNowHandler(video);
                                            }}
                                        >
                                            <Play className="h-4 w-4" />
                                            {t('playNow')}
                                        </Button>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                addVideoHandler(video);
                                            }}
                                        >
                                            <ListVideo className="h-4 w-4" />
                                            {t('addToQueue')}
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

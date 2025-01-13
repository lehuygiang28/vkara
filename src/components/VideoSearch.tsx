import React from 'react';
import { Search, Mic, Loader2, Play, ListVideo } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { VideoSkeleton } from '@/components/video-skeleton';
import { cn } from '@/lib/utils';
import { useYouTubeStore } from '@/store/youtubeStore';

export function VideoSearch() {
    const {
        isKaraoke,
        setIsKaraoke,
        searchQuery,
        setSearchQuery,
        isLoading,
        searchResults,
        selectedVideo,
        setSelectedVideo,
        error,
        playNow,
        addVideo,
    } = useYouTubeStore();

    return (
        <>
            <div className="sticky top-[41px] z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 p-4 border-b space-y-4">
                <div className="flex flex-col gap-4">
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Input
                                type="search"
                                placeholder="Search YouTube videos..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="pr-10"
                            />
                            <Button
                                size="sm"
                                variant="ghost"
                                className="absolute right-0 top-0 h-full px-3"
                                disabled={isLoading}
                            >
                                {isLoading ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Search className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <Switch
                            checked={isKaraoke}
                            onCheckedChange={setIsKaraoke}
                            id="karaoke-mode"
                        />
                        <label htmlFor="karaoke-mode" className="text-sm font-medium">
                            Karaoke Mode
                        </label>
                        <Mic
                            className={cn(
                                'h-4 w-4 transition-opacity',
                                isKaraoke ? 'opacity-100' : 'opacity-50',
                            )}
                        />
                    </div>
                </div>
            </div>
            <ScrollArea className="h-[calc(100vh-14rem)] pb-0">
                <div className="divide-y">
                    {isLoading && searchResults.length === 0 ? (
                        <div className="space-y-4 p-4">
                            {[...Array(5)].map((_, i) => (
                                <VideoSkeleton key={i} />
                            ))}
                        </div>
                    ) : error ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                            {error}
                        </div>
                    ) : searchResults.length === 0 && searchQuery ? (
                        <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
                            No results found
                        </div>
                    ) : (
                        <div className="divide-y">
                            {searchResults.map((video) => (
                                <div
                                    key={video.id.videoId}
                                    onClick={() =>
                                        setSelectedVideo(
                                            selectedVideo === video.id.videoId
                                                ? null
                                                : video.id.videoId,
                                        )
                                    }
                                    className={cn(
                                        'video-item group flex w-full items-start gap-3 p-4 text-left text-sm transition-all relative overflow-hidden',
                                        'hover:bg-accent/50 cursor-pointer',
                                        selectedVideo === video.id.videoId && 'bg-accent',
                                    )}
                                >
                                    <div className="relative aspect-video w-32 flex-shrink-0 overflow-hidden rounded-md">
                                        <div
                                            className={cn(
                                                'absolute inset-0 transition-all duration-200',
                                                selectedVideo === video.id.videoId && 'bg-black/20',
                                            )}
                                        />
                                        <img
                                            src={video.snippet.thumbnails.default.url}
                                            alt=""
                                            className="absolute inset-0 h-full w-full object-cover"
                                        />
                                    </div>
                                    <div className="flex flex-col flex-grow min-w-0 relative">
                                        <div className="font-medium leading-snug mb-1 line-clamp-2">
                                            {video.snippet.title}
                                        </div>
                                        <div className="text-xs text-muted-foreground truncate mb-2">
                                            {video.snippet.channelTitle}
                                        </div>
                                        <div
                                            className={cn(
                                                'absolute inset-x-0 bottom-0 flex items-center justify-center gap-1.5 px-4 pb-3 pt-8',
                                                'bg-gradient-to-t from-background/80 to-transparent',
                                                'transition-all duration-200',
                                                'rounded-sm',
                                                selectedVideo === video.id.videoId
                                                    ? 'translate-y-0 opacity-100'
                                                    : 'translate-y-full opacity-0',
                                            )}
                                            onClick={(e) => e.stopPropagation()}
                                        >
                                            <Button
                                                variant="secondary"
                                                size="sm"
                                                className="h-7 px-2.5 transition-all hover:scale-105"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    playNow(video);
                                                }}
                                            >
                                                <Play className="h-3.5 w-3.5 mr-1.5" />
                                                Play
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="h-7 px-2.5 transition-all hover:scale-105"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    addVideo(video);
                                                }}
                                            >
                                                <ListVideo className="h-3.5 w-3.5 mr-1.5" />
                                                Queue
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </ScrollArea>
        </>
    );
}

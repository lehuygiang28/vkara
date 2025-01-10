'use client';

import * as React from 'react';
import YouTube from 'react-youtube';
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    Volume2,
    VolumeX,
    Search,
    Mic,
    History,
    Heart,
    Settings,
    Sparkles,
    Maximize2,
} from 'lucide-react';
import { useDebounce } from 'use-debounce';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Slider } from '@/components/ui/slider';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { SearchResults, YouTubeVideo } from '@/types/youtube.type';
import { searchYouTube } from '@/actions/youtube';
import { ThemeToggle } from '../theme-toggle';

export default function YouTubePlayerLayout() {
    const [player, setPlayer] = React.useState<any>(null);
    const [isPlaying, setIsPlaying] = React.useState(false);
    const [isMuted, setIsMuted] = React.useState(false);
    const [isKaraoke, setIsKaraoke] = React.useState(false);
    const [searchQuery, setSearchQuery] = React.useState('');
    const [debouncedSearch] = useDebounce(searchQuery, 500);
    const [volume, setVolume] = React.useState(60);
    const [currentVideo, setCurrentVideo] = React.useState<string | null>(null);
    const [searchResults, setSearchResults] = React.useState<YouTubeVideo[]>([]);
    const [history, setHistory] = React.useState<YouTubeVideo[]>([]);
    const [favorites, setFavorites] = React.useState<YouTubeVideo[]>([]);
    const [isLoading, setIsLoading] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        const fetchResults = async () => {
            if (debouncedSearch) {
                setIsLoading(true);
                setError(null);
                try {
                    const results: SearchResults = await searchYouTube(debouncedSearch, isKaraoke);
                    setSearchResults(results?.items || []);
                } catch (err) {
                    setError('Failed to fetch search results');
                    setSearchResults([]);
                } finally {
                    setIsLoading(false);
                }
            }
        };
        fetchResults();
    }, [debouncedSearch, isKaraoke]);

    const onPlayerReady = (event: any) => {
        setPlayer(event.target);
    };

    const onPlayerStateChange = (event: any) => {
        setIsPlaying(event.data === 1);
    };

    const handleVideoSelect = (video: YouTubeVideo) => {
        setCurrentVideo(video.id.videoId);
        setHistory((prev) => [video, ...prev.slice(0, 49)]);
    };

    const togglePlayPause = () => {
        if (player) {
            if (isPlaying) {
                player.pauseVideo();
            } else {
                player.playVideo();
            }
            setIsPlaying(!isPlaying);
        }
    };

    const handleVolumeChange = (value: number[]) => {
        const newVolume = value[0];
        setVolume(newVolume);
        if (player) {
            player.setVolume(newVolume);
            setIsMuted(newVolume === 0);
        }
    };

    const toggleMute = () => {
        if (player) {
            if (isMuted) {
                player.unMute();
                player.setVolume(volume);
            } else {
                player.mute();
            }
            setIsMuted(!isMuted);
        }
    };

    const toggleFavorite = (video: YouTubeVideo) => {
        setFavorites((prev) => {
            const exists = prev.find((v) => v.id.videoId === video.id.videoId);
            if (exists) {
                return prev.filter((v) => v.id.videoId !== video.id.videoId);
            }
            return [video, ...prev];
        });
    };

    const toggleFullscreen = () => {
        if (player) {
            const iframe = player.getIframe();
            if (iframe.requestFullscreen) {
                iframe.requestFullscreen();
            } else if (iframe.mozRequestFullScreen) {
                iframe.mozRequestFullScreen();
            } else if (iframe.webkitRequestFullscreen) {
                iframe.webkitRequestFullscreen();
            } else if (iframe.msRequestFullscreen) {
                iframe.msRequestFullscreen();
            }
        }
    };

    return (
        <div className="flex flex-col h-screen bg-background">
            <main className="flex flex-1 overflow-hidden">
                <div className="flex flex-col w-full md:w-2/3 lg:w-3/4">
                    <div className="relative flex-1 bg-black">
                        {currentVideo ? (
                            <YouTube
                                videoId={currentVideo}
                                opts={{
                                    height: '100%',
                                    width: '100%',
                                    playerVars: {
                                        autoplay: 1,
                                        controls: 1,
                                        cc_load_policy: 0,
                                        iv_load_policy: 3,
                                        origin: 'https://youtube.com',
                                    },
                                }}
                                onReady={onPlayerReady}
                                onStateChange={onPlayerStateChange}
                                className="absolute inset-0"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center">
                                <p className="text-muted-foreground">
                                    Search and select a video to play
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <div className="flex flex-wrap items-center justify-between gap-4">
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={togglePlayPause}>
                                    {isPlaying ? (
                                        <Pause className="h-4 w-4 mr-2" />
                                    ) : (
                                        <Play className="h-4 w-4 mr-2" />
                                    )}
                                    {isPlaying ? 'Pause' : 'Play'}
                                </Button>
                                <Button variant="ghost" size="sm">
                                    <SkipBack className="h-4 w-4 mr-2" />
                                    Previous
                                </Button>
                                <Button variant="ghost" size="sm">
                                    <SkipForward className="h-4 w-4 mr-2" />
                                    Next
                                </Button>
                            </div>
                            <div className="flex items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={toggleMute}>
                                    {isMuted ? (
                                        <VolumeX className="h-4 w-4 mr-2" />
                                    ) : (
                                        <Volume2 className="h-4 w-4 mr-2" />
                                    )}
                                    {isMuted ? 'Unmute' : 'Mute'}
                                </Button>
                                <Slider
                                    value={[volume]}
                                    max={100}
                                    step={1}
                                    className="w-[80px] md:w-[120px]"
                                    onValueChange={handleVolumeChange}
                                />
                                <Button variant="ghost" size="sm" onClick={toggleFullscreen}>
                                    <Maximize2 className="h-4 w-4 mr-2" />
                                    Fullscreen
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="w-full md:w-1/3 lg:w-1/4 border-l overflow-hidden">
                    <SidePanel
                        searchQuery={searchQuery}
                        setSearchQuery={setSearchQuery}
                        isLoading={isLoading}
                        error={error}
                        searchResults={searchResults}
                        currentVideo={currentVideo}
                        handleVideoSelect={handleVideoSelect}
                        toggleFavorite={toggleFavorite}
                        favorites={favorites}
                        history={history}
                    />
                </div>
            </main>
            <footer className="flex items-center justify-between p-4 border-t">
                <div className="flex items-center gap-2">
                    <Switch checked={isKaraoke} onCheckedChange={setIsKaraoke} id="karaoke-mode" />
                    <label htmlFor="karaoke-mode" className="text-sm font-medium">
                        Karaoke Mode
                    </label>
                    <Mic
                        className={cn(
                            'h-5 w-5 transition-opacity',
                            isKaraoke ? 'opacity-100' : 'opacity-50',
                        )}
                    />
                </div>
                <ThemeToggle />
            </footer>
        </div>
    );
}

interface SidePanelProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    isLoading: boolean;
    error: string | null;
    searchResults: YouTubeVideo[];
    currentVideo: string | null;
    handleVideoSelect: (video: YouTubeVideo) => void;
    toggleFavorite: (video: YouTubeVideo) => void;
    favorites: YouTubeVideo[];
    history: YouTubeVideo[];
}

function SidePanel({
    searchQuery,
    setSearchQuery,
    isLoading,
    error,
    searchResults,
    currentVideo,
    handleVideoSelect,
    toggleFavorite,
    favorites,
    history,
}: SidePanelProps) {
    return (
        <Card className="flex flex-col h-full rounded-none border-0">
            <Tabs defaultValue="search" className="flex-1">
                <TabsList className="flex flex-wrap h-auto w-full justify-start rounded-none border-b">
                    <TabsTrigger value="search" className="flex-grow basis-1/3 py-2 px-1">
                        <Search className="h-4 w-4 mr-2" />
                        Search
                    </TabsTrigger>
                    <TabsTrigger value="recommended" className="flex-grow basis-1/3 py-2 px-1">
                        <Sparkles className="h-4 w-4 mr-2" />
                        For You
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex-grow basis-1/3 py-2 px-1">
                        <History className="h-4 w-4 mr-2" />
                        History
                    </TabsTrigger>
                    <TabsTrigger value="favorites" className="flex-grow basis-1/3 py-2 px-1">
                        <Heart className="h-4 w-4 mr-2" />
                        Favorites
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex-grow basis-1/3 py-2 px-1">
                        <Settings className="h-4 w-4 mr-2" />
                        Settings
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="search" className="flex-1 p-4">
                    <Input
                        type="search"
                        placeholder="Search YouTube videos..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="mb-4"
                    />
                    <ScrollArea className="h-[calc(100vh-13rem)]">
                        {isLoading && searchResults.length === 0 ? (
                            <div className="flex items-center justify-center py-8">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
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
                            <div className="space-y-4">
                                {searchResults.map((video) => (
                                    <button
                                        key={video.id.videoId}
                                        onClick={() => handleVideoSelect(video)}
                                        className={cn(
                                            'group flex w-full items-start gap-3 rounded-lg p-2 text-left text-sm transition-colors hover:bg-accent',
                                            currentVideo === video.id.videoId && 'bg-accent',
                                        )}
                                    >
                                        <div className="relative aspect-video w-32 flex-shrink-0 overflow-hidden rounded-md">
                                            <img
                                                src={video.snippet.thumbnails.default.url}
                                                alt=""
                                                className="absolute inset-0 h-full w-full object-cover"
                                            />
                                        </div>
                                        <div className="flex flex-col flex-grow">
                                            <div className="font-medium leading-snug mb-1 line-clamp-2">
                                                {video.snippet.title}
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                                {video.snippet.channelTitle}
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                className="self-start mt-2 opacity-0 transition-opacity group-hover:opacity-100"
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    toggleFavorite(video);
                                                }}
                                            >
                                                <Heart
                                                    className={cn(
                                                        'h-4 w-4 mr-2',
                                                        favorites.some(
                                                            (v) =>
                                                                v.id.videoId === video.id.videoId,
                                                        )
                                                            ? 'fill-current text-red-500'
                                                            : 'text-muted-foreground',
                                                    )}
                                                />
                                                Favorite
                                            </Button>
                                        </div>
                                    </button>
                                ))}
                                {isLoading && searchResults.length > 0 && (
                                    <div className="flex items-center justify-center py-4">
                                        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
                                    </div>
                                )}
                            </div>
                        )}
                    </ScrollArea>
                </TabsContent>
                <TabsContent value="history" className="flex-1 p-4">
                    <ScrollArea className="h-[calc(100vh-13rem)]">
                        <div className="space-y-2">
                            {history.map((video) => (
                                <button
                                    key={video.id.videoId}
                                    onClick={() => handleVideoSelect(video)}
                                    className={cn(
                                        'flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm transition-colors hover:bg-accent',
                                        currentVideo === video.id.videoId && 'bg-accent',
                                    )}
                                >
                                    <img
                                        src={video.snippet.thumbnails.default.url}
                                        alt=""
                                        className="h-12 w-12 rounded object-cover"
                                    />
                                    <div className="flex-1 truncate">
                                        <div className="font-medium leading-none">
                                            {video.snippet.title}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            {video.snippet.channelTitle}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </TabsContent>
                <TabsContent value="favorites" className="flex-1 p-4">
                    <ScrollArea className="h-[calc(100vh-13rem)]">
                        <div className="space-y-2">
                            {favorites.map((video) => (
                                <button
                                    key={video.id.videoId}
                                    onClick={() => handleVideoSelect(video)}
                                    className={cn(
                                        'flex w-full items-center gap-3 rounded-lg p-2 text-left text-sm transition-colors hover:bg-accent',
                                        currentVideo === video.id.videoId && 'bg-accent',
                                    )}
                                >
                                    <img
                                        src={video.snippet.thumbnails.default.url}
                                        alt=""
                                        className="h-12 w-12 rounded object-cover"
                                    />
                                    <div className="flex-1 truncate">
                                        <div className="font-medium leading-none">
                                            {video.snippet.title}
                                        </div>
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            {video.snippet.channelTitle}
                                        </div>
                                    </div>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="ml-auto"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleFavorite(video);
                                        }}
                                    >
                                        <Heart className="h-4 w-4 mr-2 fill-current text-red-500" />
                                        Remove
                                    </Button>
                                </button>
                            ))}
                        </div>
                    </ScrollArea>
                </TabsContent>
                <TabsContent value="recommended" className="flex-1 p-4">
                    <div className="grid place-items-center h-full">
                        <p className="text-sm text-muted-foreground">
                            Recommendations will appear as you watch videos
                        </p>
                    </div>
                </TabsContent>
                <TabsContent value="settings" className="flex-1 p-4">
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <h3 className="text-sm font-medium">Playback Settings</h3>
                            <div className="flex items-center gap-2">
                                <Switch id="autoplay" />
                                <label htmlFor="autoplay" className="text-sm">
                                    Autoplay next video
                                </label>
                            </div>
                        </div>
                    </div>
                </TabsContent>
            </Tabs>
        </Card>
    );
}

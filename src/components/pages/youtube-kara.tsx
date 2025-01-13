'use client';

import * as React from 'react';
import YouTube, { YouTubeEvent } from 'react-youtube';
import {
    Play,
    Pause,
    SkipForward,
    Volume2,
    VolumeX,
    Search,
    History,
    ListVideo,
    Settings,
    Plus,
    Minus,
    RotateCcw,
} from 'lucide-react';
import { useDebounce } from 'use-debounce';

import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore } from '@/store/websocketStore';
import { searchYouTube } from '@/actions/youtube';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoomSettings } from '@/components/RoomSettings';
import { VideoQueue } from '@/components/VideoQueue';
import { VideoSearch } from '@/components/VideoSearch';
import { VideoHistory } from '@/components/VideoHistory';
import { SeekToInput } from '../seek-to-input';

export default function YouTubePlayerLayout() {
    const {
        player,
        setPlayer,
        isKaraoke,
        searchQuery,
        volume,
        setVolume,
        currentTab,
        setCurrentTab,
        room,
        setSearchResults,
        setIsLoading,
        setError,
        nextVideo,
        setIsPlaying,
        handleServerMessage,
    } = useYouTubeStore();

    const [debouncedSearch] = useDebounce(searchQuery, 500);

    const { sendMessage, lastMessage, connectionStatus } = useWebSocketStore();

    React.useLayoutEffect(() => {
        if (connectionStatus === 'Open') {
            sendMessage({ type: 'joinRoom', roomId: room?.id || '' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connectionStatus]);

    React.useEffect(() => {
        if (lastMessage) {
            handleServerMessage(lastMessage);
        }
    }, [lastMessage, handleServerMessage]);

    React.useEffect(() => {
        const performSearch = async () => {
            if (debouncedSearch) {
                setIsLoading(true);
                setError(null);
                try {
                    const results = await searchYouTube(debouncedSearch, isKaraoke);
                    setSearchResults(results?.items || []);
                } catch (err) {
                    setError('Failed to fetch search results. Please try again.');
                    console.error('Search error:', err);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setSearchResults([]);
            }
        };

        performSearch();
    }, [debouncedSearch, isKaraoke, setSearchResults, setIsLoading, setError]);

    const onPlayerReady = (event: YouTubeEvent) => {
        setPlayer(event.target);
    };

    const onPlayerStateChange = (event: YouTubeEvent) => {
        setIsPlaying(event.data === 1);
        if (event.data === 0) {
            // Video ended
            handleVideoFinished();
        }
    };

    const handleVideoFinished = () => {
        if (room) {
            sendMessage({ type: 'videoFinished' });
        } else {
            nextVideo();
        }
    };

    const handlePlayNext = () => {
        if (room) {
            sendMessage({ type: 'nextVideo' });
        } else {
            nextVideo();
        }
    };

    const playHandler = () => {
        if (room) {
            sendMessage({ type: 'play' });
        } else if (player) {
            player.playVideo();
        }
    };

    const pauseHandler = () => {
        if (room) {
            sendMessage({ type: 'pause' });
        } else if (player) {
            player.pauseVideo();
        }
    };

    const handleVolumeChange = (volume: number) => {
        setVolume(volume);
        if (player) {
            player.setVolume(volume);
        }
        if (room) {
            sendMessage({ type: 'setVolume', volume: volume });
        }
    };

    const replayVideoHandler = () => {
        if (room) {
            sendMessage({ type: 'replay' });
        } else if (player) {
            player.seekTo(0, true);
        }
    };

    const seekToHandler = (seconds: number) => {
        if (room) {
            sendMessage({ type: 'seek', time: seconds });
        } else if (player) {
            player.seekTo(seconds, true);
        }
    };

    return (
        <div className="flex flex-col md:flex-row h-screen bg-background">
            <main className="flex flex-col md:flex-row flex-1 overflow-hidden">
                <div className="flex flex-col w-full md:w-2/3 lg:w-3/4">
                    <div className="relative w-full pt-[56.25%] md:pt-0 md:h-0 md:flex-grow">
                        {room?.playingNow ? (
                            <YouTube
                                videoId={room.playingNow.id.videoId}
                                opts={{
                                    height: '100%',
                                    width: '100%',
                                    playerVars: {
                                        autoplay: 1,
                                        controls: 1,
                                        cc_load_policy: 1,
                                        iv_load_policy: 3,
                                        origin: 'https://youtube.com',
                                    },
                                }}
                                onReady={onPlayerReady}
                                onStateChange={onPlayerStateChange}
                                className="absolute inset-0"
                            />
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center bg-black">
                                <p className="text-muted-foreground">
                                    Search and select a video to play
                                </p>
                            </div>
                        )}
                    </div>
                    <div className="p-2 md:p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                        <div className="flex flex-wrap items-center justify-center md:justify-between gap-2 md:gap-4">
                            <div className="flex flex-wrap items-center gap-2">
                                <Button variant="ghost" size="sm" onClick={playHandler}>
                                    <Play className="h-4 w-4" />
                                    <span className="hidden sm:inline">Play</span>
                                </Button>

                                <Button variant="ghost" size="sm" onClick={pauseHandler}>
                                    <Pause className="h-4 w-4" />
                                    <span className="hidden sm:inline">Pause</span>
                                </Button>

                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={handlePlayNext}
                                    disabled={!room?.videoQueue.length}
                                >
                                    <SkipForward className="h-4 w-4" />
                                    <span className="hidden sm:inline">Next</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={replayVideoHandler}
                                    disabled={!room?.playingNow}
                                >
                                    <RotateCcw className="h-4 w-4" />
                                    <span className="hidden sm:inline">Replay</span>
                                </Button>
                                <SeekToInput onSeek={seekToHandler} disabled={!room?.playingNow} />
                            </div>
                            <div className="flex flex-wrap items-center gap-2">
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleVolumeChange(0)}
                                >
                                    <VolumeX className="h-4 w-4" />
                                    <span className="hidden sm:inline">Mute</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleVolumeChange(100)}
                                >
                                    <Volume2 className="h-4 w-4" />
                                    <span className="hidden sm:inline">Unmute</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleVolumeChange(Math.min(volume + 10, 100))}
                                >
                                    <Plus className="h-4 w-4" />
                                    <span className="hidden sm:inline">Up</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleVolumeChange(Math.max(volume - 10, 0))}
                                >
                                    <Minus className="h-4 w-4" />
                                    <span className="hidden sm:inline">Down</span>
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="w-full md:w-1/3 lg:w-1/4 md:border-l overflow-hidden">
                    <Card className="flex flex-col h-full rounded-none border-0">
                        <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1">
                            <TabsList className="flex flex-wrap h-auto w-full justify-start rounded-none border-b sticky top-0 z-10 bg-background">
                                <TabsTrigger
                                    value="search"
                                    className="flex-grow basis-1/4 py-2 px-1"
                                >
                                    <Search className="h-4 w-4" />
                                    <span className="hidden sm:inline">Search</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="history"
                                    className="flex-grow basis-1/4 py-2 px-1"
                                >
                                    <History className="h-4 w-4" />
                                    <span className="hidden sm:inline">History</span>
                                </TabsTrigger>
                                <TabsTrigger
                                    value="queue"
                                    className="flex-grow basis-1/4 py-2 px-1"
                                >
                                    <ListVideo className="h-4 w-4 mr-2" />
                                    <span className="hidden sm:inline">List</span> (
                                    {room?.videoQueue.length || 0})
                                </TabsTrigger>
                                <TabsTrigger
                                    value="settings"
                                    className="flex-grow basis-1/4 py-2 px-1"
                                >
                                    <Settings className="h-4 w-4" />
                                    <span className="hidden sm:inline">Settings</span>
                                </TabsTrigger>
                            </TabsList>
                            <TabsContent value="search" className="flex-1 overflow-auto">
                                <VideoSearch />
                            </TabsContent>
                            <TabsContent value="history" className="flex-1 overflow-auto p-0">
                                <VideoHistory />
                            </TabsContent>
                            <TabsContent value="queue" className="flex-1 overflow-auto p-0">
                                <VideoQueue />
                            </TabsContent>
                            <TabsContent value="settings" className="flex-1 overflow-auto p-4">
                                <RoomSettings />
                            </TabsContent>
                        </Tabs>
                    </Card>
                </div>
            </main>
        </div>
    );
}

'use client';

import { useEffect, useState, useRef } from 'react';
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
    ChevronRight,
} from 'lucide-react';
import { useDebounce } from 'use-debounce';
import { motion, AnimatePresence } from 'framer-motion';

import { useYouTubeStore } from '@/store/youtubeStore';
import { useWebSocketStore } from '@/store/websocketStore';
import { searchYouTube } from '@/actions/youtube';
import { useScopedI18n } from '@/locales/client';

import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { RoomSettings } from '@/components/RoomSettings';
import { VideoQueue } from '@/components/VideoQueue';
import { VideoSearch } from '@/components/VideoSearch';
import { VideoHistory } from '@/components/VideoHistory';
import { SeekToInput } from '@/components/seek-to-input';

export default function YoutubePlayerPage() {
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
        layoutMode,
    } = useYouTubeStore();

    const t = useScopedI18n('youtubePage');
    const [debouncedSearch] = useDebounce(searchQuery, 500);
    const [showSidebar, setShowSidebar] = useState(false);
    const sidebarRef = useRef<HTMLDivElement>(null);

    const { sendMessage, lastMessage } = useWebSocketStore();

    useEffect(() => {
        if (lastMessage) {
            handleServerMessage(lastMessage);
        }
    }, [lastMessage, handleServerMessage]);

    useEffect(() => {
        const performSearch = async () => {
            if (debouncedSearch) {
                setIsLoading(true);
                setError(null);
                try {
                    const results = await searchYouTube(debouncedSearch, isKaraoke);
                    setSearchResults(results?.items || []);
                } catch (err) {
                    setError(t('failedToFetch'));
                    console.error('Search error:', err);
                } finally {
                    setIsLoading(false);
                }
            } else {
                setSearchResults([]);
            }
        };

        performSearch();
    }, [debouncedSearch, isKaraoke, setSearchResults, setIsLoading, setError, t]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
                setShowSidebar(false);
            }
        };

        if (showSidebar) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [showSidebar]);

    const onPlayerReady = (event: YouTubeEvent) => {
        setPlayer(event.target);
    };

    const onPlayerStateChange = (event: YouTubeEvent) => {
        setIsPlaying(event.data === 1);
        if (event.data === 0) {
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

    const renderSidebar = () => (
        <Card className="flex flex-col h-full rounded-none border-0">
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1">
                <TabsList className="flex flex-wrap h-auto w-full justify-start rounded-none border-b sticky top-0 z-10 bg-background">
                    <TabsTrigger value="search" className="flex-grow basis-1/4 py-2 px-1">
                        <Search className="h-4 w-4 mr-0 md:mr-2" />
                        <span className="hidden sm:inline">{t('search')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="history" className="flex-grow basis-1/4 py-2 px-1">
                        <History className="h-4 w-4 mr-0 md:mr-2" />
                        <span className="hidden sm:inline">{t('history')}</span>
                    </TabsTrigger>
                    <TabsTrigger value="queue" className="flex-grow basis-1/4 py-2 px-1">
                        <ListVideo className="h-4 w-4 mr-0 md:mr-2" />
                        <span className="hidden sm:inline">
                            {t('list')} ({room?.videoQueue.length || 0})
                        </span>
                    </TabsTrigger>
                    <TabsTrigger value="settings" className="flex-grow basis-1/4 py-2 px-1">
                        <Settings className="h-4 w-4 mr-0 md:mr-2" />
                        <span className="hidden sm:inline">{t('settings')}</span>
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
    );

    const renderControls = () => (
        <div className="flex flex-wrap items-center justify-center md:justify-between gap-2 md:gap-4">
            <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={playHandler}>
                    <Play className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('play')}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={pauseHandler}>
                    <Pause className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('pause')}</span>
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePlayNext}
                    disabled={!room?.videoQueue.length}
                >
                    <SkipForward className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('next')}</span>
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={replayVideoHandler}
                    disabled={!room?.playingNow}
                >
                    <RotateCcw className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('replay')}</span>
                </Button>
                <SeekToInput onSeek={seekToHandler} disabled={!room?.playingNow} />
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => handleVolumeChange(0)}>
                    <VolumeX className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('mute')}</span>
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleVolumeChange(100)}>
                    <Volume2 className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('unmute')}</span>
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVolumeChange(Math.min(volume + 10, 100))}
                >
                    <Plus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('volumeUp')}</span>
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleVolumeChange(Math.max(volume - 10, 0))}
                >
                    <Minus className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('volumeDown')}</span>
                </Button>
            </div>
        </div>
    );

    return (
        <div
            className={`flex flex-col ${
                layoutMode === 'player' ? 'h-screen w-screen' : 'h-screen'
            } bg-background`}
        >
            <main
                className={`flex flex-col md:flex-row flex-1 overflow-hidden ${
                    layoutMode === 'player' ? 'h-full w-full' : ''
                }`}
            >
                {layoutMode !== 'remote' && (
                    <div
                        className={`flex flex-col ${
                            layoutMode === 'both' ? 'w-full md:w-2/3 lg:w-3/4' : 'w-full h-full'
                        }`}
                    >
                        <div
                            className={`relative w-full ${
                                layoutMode === 'player'
                                    ? 'h-full'
                                    : 'pt-[56.25%] md:pt-0 md:h-0 md:flex-grow'
                            }`}
                        >
                            {room?.playingNow ? (
                                <YouTube
                                    videoId={room.playingNow.id}
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
                                <div className="absolute inset-0 flex items-center justify-center bg-black">
                                    <p className="text-muted-foreground">
                                        {t('playerPlaceholder')}
                                    </p>
                                </div>
                            )}
                            {layoutMode === 'player' && (
                                <div className="absolute top-4 right-4 flex gap-2">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setShowSidebar(true);
                                            setCurrentTab('settings');
                                        }}
                                    >
                                        <Settings className="h-4 w-4" />
                                    </Button>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setShowSidebar(true);
                                            setCurrentTab('queue');
                                        }}
                                    >
                                        <ListVideo className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                        {layoutMode !== 'player' && (
                            <div className="p-2 md:p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                                {renderControls()}
                            </div>
                        )}
                    </div>
                )}
                {layoutMode === 'remote' && (
                    <div className="w-full overflow-hidden">
                        <div className="p-2 md:p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
                            {renderControls()}
                        </div>
                        {renderSidebar()}
                    </div>
                )}
                {layoutMode === 'both' && (
                    <div className="w-full md:w-1/3 lg:w-1/4 md:border-l overflow-hidden">
                        {renderSidebar()}
                    </div>
                )}
                <AnimatePresence>
                    {layoutMode === 'player' && showSidebar && (
                        <motion.div
                            ref={sidebarRef}
                            initial={{ x: '100%' }}
                            animate={{ x: 0 }}
                            exit={{ x: '100%' }}
                            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                            className="fixed inset-y-0 right-0 z-50 w-full sm:w-96 bg-background shadow-lg"
                        >
                            {renderSidebar()}
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute top-1/2 -left-6 transform -translate-y-1/2 h-16 w-8 rounded-l-full bg-background/80 hover:bg-background"
                                onClick={() => setShowSidebar(false)}
                                aria-label="Close sidebar"
                            >
                                <ChevronRight className="h-6 w-6" />
                            </Button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

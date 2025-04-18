/* eslint-disable @next/next/no-img-element */
'use client';

import { useEffect, useState } from 'react';
import YouTube from 'react-youtube';
import {
    ChevronRight,
    Search,
    Settings,
    History,
    SlidersVertical,
    ListVideo,
    Maximize,
    Minimize,
    Sparkles,
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { QRCode } from 'react-qrcode-logo';

import { useYouTubeStore } from '@/store/youtubeStore';
import { useScopedI18n } from '@/locales/client';
import { cn, generateShareableUrl } from '@/lib/utils';
import { useFullscreen } from '@/hooks/use-fullscreen';
import { useCountdownStore } from '@/store/countdownTimersStore';
import { useWebSocket } from '@/providers/websocket-provider';

import { CountdownTimer } from '@/components/countdown-timer';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

import { RoomSettings } from './RoomSettings';
import { VideoQueue } from './VideoQueue';
import { VideoSearch } from './VideoSearch';
import { VideoHistory } from './VideoHistory';
import { PlayerControls } from './PlayerControls';
import { PlayerControlsTabs } from './PlayerControlsTabs';
import { ScrollToTop } from '@/components/scroll-to-top';
import { VideoRelated } from './VideoRelated';

export default function YoutubePlayerPage() {
    const {
        room,
        currentTab,
        layoutMode,
        showQRInPlayer,
        showBottomControls,
        opacityOfButtonsInPlayer,
        setPlayer,
        setCurrentTab,
        nextVideo,
        setIsPlaying,
        handleServerMessage,
        setLayoutMode,
    } = useYouTubeStore();

    const t = useScopedI18n('youtubePage');
    const t_Toast = useScopedI18n('toast');
    const [showSidebar, setShowSidebar] = useState(false);
    const { isFullScreen, toggleFullScreen } = useFullscreen();
    const { shouldShowTimer, setShouldShowTimer, cancelCountdown } = useCountdownStore();

    const { ensureConnectedAndSend, lastMessage } = useWebSocket();

    useEffect(() => {
        if (lastMessage) {
            handleServerMessage(lastMessage, t_Toast);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastMessage, handleServerMessage]);

    const onPlayerReady = (event: YT.PlayerEvent) => {
        setPlayer(event.target);
    };

    const onPlayerStateChange = (event: YT.PlayerEvent) => {
        setIsPlaying(event.target.getPlayerState() === YT.PlayerState.PLAYING);

        if (event.target.getPlayerState() === YT.PlayerState.PLAYING) {
            cancelCountdown();
        }

        if (event.target.getPlayerState() === YT.PlayerState.ENDED) {
            setShouldShowTimer(true);
        }
    };

    const handleVideoFinished = () => {
        if (room) {
            ensureConnectedAndSend({ type: 'videoFinished' });
        } else {
            nextVideo();
        }
    };

    const handleOverlayClick = () => {
        setShowSidebar(false);
    };

    const handlerToggleFullScreen = () => {
        toggleFullScreen();
        setShowSidebar(false);
        if (!isFullScreen) {
            setLayoutMode('player');
        } else {
            setLayoutMode('both');
        }
    };

    const renderSidebar = () => (
        <Card className="flex flex-col h-full rounded-none border-0">
            <Tabs value={currentTab} onValueChange={setCurrentTab} className="flex-1">
                <TabsList className="flex flex-wrap h-auto w-full justify-start rounded-none border-b sticky top-0 z-10 bg-background">
                    <TabsTrigger value="search" className="flex-grow basis-1/4">
                        <Search className="h-4 w-4 mr-1" />
                        <span>{t('search')}</span>
                    </TabsTrigger>

                    <TabsTrigger value="queue" className="flex-grow basis-1/4">
                        <ListVideo className="h-4 w-4 mr-1" />
                        <span>
                            {t('list')} ({room?.videoQueue.length || 0})
                        </span>
                    </TabsTrigger>

                    <TabsTrigger value="history" className="flex-grow basis-1/4">
                        <History className="h-4 w-4 mr-1" />
                        <span>{t('history')}</span>
                    </TabsTrigger>

                    <TabsTrigger value="related" className="flex-grow basis-1/4">
                        <Sparkles className="h-4 w-4 mr-1" />
                        <span>{t('related')}</span>
                    </TabsTrigger>

                    <TabsTrigger value="controls" className="flex-grow basis-1/4">
                        <SlidersVertical className="h-4 w-4 mr-1" />
                        <span>{t('controls')}</span>
                    </TabsTrigger>

                    <TabsTrigger value="settings" className="flex-grow basis-1/4">
                        <Settings className="h-4 w-4 mr-1" />
                        <span>{t('settings')}</span>
                    </TabsTrigger>
                </TabsList>
                <TabsContent value="search" className="flex-1 overflow-auto">
                    <VideoSearch />
                </TabsContent>

                <TabsContent value="related" className="flex-1 overflow-auto">
                    <VideoRelated />
                </TabsContent>

                <TabsContent value="history" className="flex-1 overflow-auto">
                    <VideoHistory />
                </TabsContent>

                <TabsContent value="queue" className="flex-1 overflow-auto">
                    <VideoQueue />
                </TabsContent>

                <TabsContent value="controls" className="flex-1 overflow-auto">
                    <PlayerControlsTabs />
                </TabsContent>

                <TabsContent value="settings" className="flex-1 overflow-auto">
                    <RoomSettings />
                </TabsContent>
            </Tabs>
        </Card>
    );

    const renderPlayer = () => (
        <div className="relative w-full h-full z-0">
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
                    className="absolute inset-0 z-0"
                />
            ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black">
                    <motion.h1
                        initial={{ opacity: 0.5, y: 100 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        transition={{
                            delay: 0.3,
                            duration: 0.8,
                            ease: 'easeInOut',
                        }}
                        className="bg-gradient-to-br from-slate-300 to-slate-500 py-4 bg-clip-text text-center text-xl font-medium tracking-tight text-transparent md:text-3xl"
                    >
                        {t('playerPlaceholder', { br: <br /> })}
                    </motion.h1>
                </div>
            )}

            {room?.playingNow && shouldShowTimer && room?.videoQueue.length > 0 && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-center p-4 z-10">
                    <h3 className="text-xl font-semibold mb-4">{t('nextUp')}</h3>
                    <div className="flex flex-col items-center gap-4 max-w-md">
                        <img
                            src={room.videoQueue[0].thumbnail.url}
                            alt={room.videoQueue[0].title}
                            className="w-48 h-27 object-cover rounded-lg"
                        />
                        <div className="space-y-2">
                            <p className="font-medium line-clamp-2">{room.videoQueue[0].title}</p>
                            <p className="text-sm text-muted-foreground">
                                {room.videoQueue[0].channel.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                                {t('startingIn')}:{' '}
                                <CountdownTimer
                                    classNames={cn('text-sm font-medium', 'text-white')}
                                    initialSeconds={3}
                                    onCountdownComplete={handleVideoFinished}
                                />
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {(layoutMode === 'player' || layoutMode === 'both') && (
                <>
                    {room?.id && showQRInPlayer && (
                        // QR in player
                        <div
                            className="absolute top-2 left-2 hidden lg:flex flex-col opacity-30 hover:opacity-80 z-10 cursor-auto"
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowSidebar(true);
                                setCurrentTab('settings');
                            }}
                        >
                            <div className="flex justify-center cursor-none">
                                <QRCode
                                    value={generateShareableUrl({
                                        roomId: room.id,
                                        password: room?.password || '',
                                        layoutMode: 'remote',
                                    })}
                                    size={80}
                                    qrStyle="dots"
                                    eyeRadius={5}
                                    quietZone={2}
                                    ecLevel="L"
                                />
                            </div>
                            <span className="text-md text-center font-semibold">
                                {room.id?.slice(0, Math.round(room.id.length / 2)) +
                                    ' ' +
                                    room.id?.slice(-Math.round(room.id.length / 2))}
                            </span>
                        </div>
                    )}

                    {/* Buttons in player (settings/queue/fullscreen) */}
                    <div
                        className={cn(
                            'absolute top-2 right-2 flex flex-col gap-2 z-10 hover:opacity-80',
                            `opacity-${opacityOfButtonsInPlayer}`,
                        )}
                    >
                        <Button
                            className="z-10 text-center font-medium justify-center px-3 py-7 text-sm hover:text-white border hover:bg-gray-900 dark:hover:text-white dark:hover:bg-gray-600 dark:text-gray-400 dark:border-gray-700 rounded-lg flex flex-col items-center text-white border-transparent"
                            variant="ghost"
                            onClick={() => {
                                setShowSidebar(true);
                                setCurrentTab('queue');
                            }}
                        >
                            <ListVideo className="scale-150" />
                            <span className="text-sm">
                                {t('queue')} ({room?.videoQueue.length || 0})
                            </span>
                        </Button>
                        <Button
                            className="z-10 text-center font-medium justify-center px-3 py-7 text-sm hover:text-white border hover:bg-gray-900 dark:hover:text-white dark:hover:bg-gray-600 dark:text-gray-400 dark:border-gray-700 rounded-lg flex flex-col items-center text-white border-transparent"
                            variant="ghost"
                            onClick={() => {
                                setShowSidebar(true);
                                setCurrentTab('settings');
                            }}
                        >
                            <Settings className="scale-150" />
                            <span className="text-sm">{t('settings')}</span>
                        </Button>
                        <Button
                            className="z-10 text-center font-medium justify-center px-3 py-7 text-sm hover:text-white border hover:bg-gray-900 dark:hover:text-white dark:hover:bg-gray-600 dark:text-gray-400 dark:border-gray-700 rounded-lg flex flex-col items-center text-white border-transparent"
                            variant="ghost"
                            onClick={handlerToggleFullScreen}
                        >
                            {isFullScreen ? (
                                <Minimize className="scale-150" />
                            ) : (
                                <Maximize className="scale-150" />
                            )}
                            <span className="text-sm">
                                {isFullScreen ? t('exitFullscreen') : t('fullscreen')}
                            </span>
                        </Button>
                    </div>
                </>
            )}
        </div>
    );

    return (
        <div className={cn('flex flex-col bg-background w-screen', 'h-full md:h-screen')}>
            <ScrollToTop />
            <main className={`flex flex-col md:flex-row flex-1 overflow-hidden`}>
                {layoutMode !== 'remote' && (
                    <div
                        className={cn(
                            'flex flex-col w-full',
                            layoutMode === 'both' && 'md:w-2/3 lg:w-3/4 h-[20rem] md:h-full',
                            layoutMode === 'player' && 'h-full',
                        )}
                    >
                        {renderPlayer()}
                        {layoutMode === 'both' && showBottomControls && (
                            <div className="p-2 md:p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 hidden lg:block">
                                <PlayerControls />
                            </div>
                        )}
                    </div>
                )}
                {(layoutMode === 'remote' || layoutMode === 'both') && (
                    <div
                        className={cn(
                            'w-full overflow-hidden',
                            layoutMode === 'both' && 'md:w-1/3 lg:w-1/4 md:border-l',
                            layoutMode === 'remote' && 'mx-auto max-w-3xl border-l border-r',
                        )}
                    >
                        {layoutMode === 'remote' && room?.playingNow && (
                            <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 py-2 border-b">
                                <h2 className="text-lg font-semibold">{t('nowPlaying')}</h2>
                                <div className="flex items-center space-x-4">
                                    <img
                                        src={room.playingNow.thumbnail.url}
                                        alt={room.playingNow.title}
                                        className="w-16 h-16 object-cover rounded"
                                    />
                                    <div>
                                        <p className="font-medium line-clamp-2">
                                            {room.playingNow.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground line-clamp-1">
                                            {room.playingNow.channel.name}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {renderSidebar()}
                    </div>
                )}
                <AnimatePresence>
                    {layoutMode === 'player' && showSidebar && (
                        <>
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.3 }}
                                className="fixed inset-0 bg-black/50 z-40"
                                onClick={handleOverlayClick}
                            />
                            <motion.div
                                initial={{ x: '100%' }}
                                animate={{ x: 0 }}
                                exit={{ x: '100%' }}
                                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                                className="fixed inset-y-0 right-0 z-50 w-11/12 md:w-3/4 lg:w-1/4 bg-background shadow-lg"
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
                        </>
                    )}
                </AnimatePresence>
            </main>
        </div>
    );
}

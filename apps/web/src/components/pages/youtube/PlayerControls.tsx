'use client';

import { Play, Pause, SkipForward, Volume2, VolumeX, RotateCcw, Plus, Minus } from 'lucide-react';
import { useScopedI18n } from '@/locales/client';
import { usePlayerAction } from '@/hooks/use-player-action';
import { useYouTubeStore } from '@/store/youtubeStore';

import { Button } from '@/components/ui/button';
import { SeekToInput } from '@/components/seek-to-input';

interface PlayerControlsProps {
    type?: 'playback' | 'volume' | 'all';
}

export function PlayerControls({ type = 'all' }: PlayerControlsProps) {
    const t = useScopedI18n('youtubePage');
    const { volume, room } = useYouTubeStore();
    const {
        handlePlayerPlay,
        handlePlayerPause,
        handleReplayVideo,
        handlePlayNextVideo,
        handleSeekToSeconds,
        handleSetVideoVolume,
    } = usePlayerAction();

    const renderPlaybackControls = () => (
        <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
                variant="outline"
                size="sm"
                onClick={handlePlayerPlay}
                disabled={!room?.playingNow}
            >
                <Play className="h-4 w-4 mr-2" />
                {t('play')}
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={handlePlayerPause}
                disabled={!room?.playingNow}
            >
                <Pause className="h-4 w-4 mr-2" />
                {t('pause')}
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={handlePlayNextVideo}
                disabled={!room?.videoQueue.length}
            >
                <SkipForward className="h-4 w-4 mr-2" />
                {t('next')}
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={handleReplayVideo}
                disabled={!room?.playingNow}
            >
                <RotateCcw className="h-4 w-4 mr-2" />
                {t('replay')}
            </Button>
            <SeekToInput onSeek={handleSeekToSeconds} disabled={!room?.playingNow} />
        </div>
    );

    const renderVolumeControls = () => (
        <div className="flex flex-wrap items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => handleSetVideoVolume(0)}>
                <VolumeX className="h-4 w-4 mr-2" />
                {t('mute')}
            </Button>
            <Button variant="outline" size="sm" onClick={() => handleSetVideoVolume(100)}>
                <Volume2 className="h-4 w-4 mr-2" />
                {t('unmute')}
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetVideoVolume(Math.min(volume + 10, 100))}
            >
                <Plus className="h-4 w-4 mr-2" />
                {t('volumeUp')}
            </Button>
            <Button
                variant="outline"
                size="sm"
                onClick={() => handleSetVideoVolume(Math.max(volume - 10, 0))}
            >
                <Minus className="h-4 w-4 mr-2" />
                {t('volumeDown')}
            </Button>
        </div>
    );

    return (
        <div className="flex flex-wrap items-center justify-center md:justify-between gap-2 md:gap-4">
            {(type === 'all' || type === 'playback') && renderPlaybackControls()}
            {(type === 'all' || type === 'volume') && renderVolumeControls()}
        </div>
    );
}

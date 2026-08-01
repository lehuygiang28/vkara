'use client';

import { useCallback, useRef } from 'react';
import { setFocus } from '@noriginmedia/norigin-spatial-navigation-core';
import { isValidRoomId } from '@vkara/room';
import { LogIn, Plus } from 'lucide-react';

import { useJoinRoom } from '@/hooks/use-join-room';
import { useWebSocket } from '@/providers/websocket-provider';
import { useScopedI18n } from '@/locales/client';
import { useRoomSettingsStore } from '@/store/roomSettingsStore';
import { useYouTubeStore } from '@/store/youtubeStore';
import { roomSecretFieldProps } from '@/lib/room-field-autofill';
import { TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
import { tvSettingsIconPlate, tvSettingsLabel, tvSettingsRow } from '@/lib/tv-focus-styles';
import { cn } from '@/lib/utils';

import { TvFocusable } from './tv-focusable';
import { TvRoomCodeInput } from './tv-room-code-input';
import { TvSpatialOverlayShell } from './tv-spatial-overlay-shell';

function LobbyActionRow({
    focusKey,
    label,
    icon,
    onEnterPress,
    onArrowPress,
    disabled,
}: {
    focusKey: string;
    label: string;
    icon: React.ReactNode;
    onEnterPress: () => void;
    onArrowPress?: (direction: string) => boolean;
    disabled?: boolean;
}) {
    return (
        <TvFocusable
            focusKey={focusKey}
            accessibilityLabel={label}
            disabled={disabled}
            suppressFocusChrome
            onEnterPress={onEnterPress}
            onArrowPress={onArrowPress}
            className={({ focused }) => cn(tvSettingsRow(focused), 'tv-lobby-action')}
        >
            {({ focused }) => (
                <>
                    <span className={tvSettingsIconPlate(focused)}>{icon}</span>
                    <p className={cn('min-w-0 flex-1 text-left', tvSettingsLabel(focused))}>
                        {label}
                    </p>
                </>
            )}
        </TvFocusable>
    );
}

export function TvLobby() {
    const t = useScopedI18n('tvLobby');
    const { connectionStatus, ensureConnectedAndSend } = useWebSocket();
    const { roomPassword } = useRoomSettingsStore();
    const tvLobbyBanner = useYouTubeStore((s) => s.tvLobbyBanner);
    const { joinRoom, joinRoomId, joinRoomPassword, setJoinRoomId, setJoinRoomPassword } =
        useJoinRoom();

    const passwordInputRef = useRef<HTMLInputElement>(null);
    const isConnected = connectionStatus === 'OPEN';
    const canJoin = isConnected && isValidRoomId(joinRoomId);

    const clearLobbyBanner = useCallback(() => {
        useYouTubeStore.setState({ tvLobbyBanner: null });
    }, []);

    const createRoom = useCallback(() => {
        clearLobbyBanner();
        const password = roomPassword.trim();
        ensureConnectedAndSend({
            type: 'createRoom',
            password: password || undefined,
            isTvClient: true,
        });
    }, [roomPassword, ensureConnectedAndSend, clearLobbyBanner]);

    const handleJoinRoom = useCallback(() => {
        clearLobbyBanner();
        joinRoom();
    }, [clearLobbyBanner, joinRoom]);

    const focusJoinSection = useCallback((direction: string) => {
        if (direction === 'down' || direction === 'right') {
            setFocus(TV_FOCUS_KEYS.lobbyCodeDigit(0));
            return false;
        }
        return true;
    }, []);

    return (
        <div className="tv-lobby">
            <TvSpatialOverlayShell
                focusKey={TV_FOCUS_KEYS.lobby}
                preferredChildFocusKey={TV_FOCUS_KEYS.lobbyCreate}
                className="tv-lobby-shell"
                aria-label={t('title')}
            >
                <div className="tv-lobby-grid">
                    <header className="tv-lobby-grid__header">
                        <h1 className="tv-lobby-title">{t('title')}</h1>
                        {tvLobbyBanner ? (
                            <div
                                className="mx-auto mt-4 max-w-xl rounded-xl border border-red-400/40 bg-red-950/80 px-4 py-3 text-left text-red-50"
                                role="alert"
                                aria-live="assertive"
                            >
                                <p className="text-base font-semibold">{tvLobbyBanner.title}</p>
                                <p className="mt-1 text-sm text-red-100/90">
                                    {tvLobbyBanner.description}
                                </p>
                            </div>
                        ) : null}
                    </header>

                    <TvFocusable
                        focusKey={TV_FOCUS_KEYS.lobbyCreate}
                        accessibilityLabel={t('createButton')}
                        disabled={!isConnected}
                        suppressFocusChrome
                        onEnterPress={createRoom}
                        onArrowPress={focusJoinSection}
                        className={({ focused }) =>
                            cn(
                                'tv-lobby-grid__create tv-lobby-create-hero',
                                focused && 'tv-lobby-create-hero--focused',
                            )
                        }
                    >
                        <span className="tv-lobby-create-hero__icon" aria-hidden>
                            <Plus className="h-10 w-10" strokeWidth={2.25} />
                        </span>
                        <span className="tv-lobby-create-hero__label">{t('createButton')}</span>
                    </TvFocusable>

                    <div className="tv-lobby-grid__split tv-lobby-split" aria-hidden>
                        <span>{t('or')}</span>
                    </div>

                    <section
                        className="tv-lobby-panel tv-lobby-panel--join tv-lobby-grid__join"
                        aria-labelledby="tv-lobby-join-label"
                    >
                        <p id="tv-lobby-join-label" className="tv-lobby-panel__badge">
                            {t('joinPanelLabel')}
                        </p>

                        <div className="tv-lobby-join-block">
                            <p className="tv-settings-desc">{t('roomIdLabel')}</p>
                            <TvRoomCodeInput value={joinRoomId} onChangeAction={setJoinRoomId} />
                        </div>

                        <div className="tv-lobby-join-block">
                            <p className="tv-settings-desc">{t('passwordLabel')}</p>
                            <TvFocusable
                                focusKey={TV_FOCUS_KEYS.lobbyPassword}
                                accessibilityLabel={t('passwordLabel')}
                                suppressFocusChrome
                                onEnterPress={() => passwordInputRef.current?.focus()}
                                onArrowPress={(direction) => {
                                    if (direction === 'left') {
                                        setFocus(TV_FOCUS_KEYS.lobbyCodeDigit(3));
                                        return false;
                                    }
                                    return true;
                                }}
                                className={({ focused }) =>
                                    cn('tv-lobby-password', focused && 'tv-lobby-password--focused')
                                }
                            >
                                <input
                                    ref={passwordInputRef}
                                    type="password"
                                    value={joinRoomPassword}
                                    onChange={(event) => setJoinRoomPassword(event.target.value)}
                                    placeholder={t('passwordPlaceholder')}
                                    tabIndex={-1}
                                    className="tv-lobby-password__input"
                                    {...roomSecretFieldProps}
                                />
                            </TvFocusable>
                        </div>

                        <LobbyActionRow
                            focusKey={TV_FOCUS_KEYS.lobbyJoin}
                            label={t('joinButton')}
                            icon={<LogIn className="h-6 w-6" strokeWidth={2.5} aria-hidden />}
                            disabled={!canJoin}
                            onEnterPress={handleJoinRoom}
                            onArrowPress={(direction) => {
                                if (direction === 'left') {
                                    setFocus(TV_FOCUS_KEYS.lobbyPassword);
                                    return false;
                                }
                                if (direction === 'up') {
                                    setFocus(TV_FOCUS_KEYS.lobbyCreate);
                                    return false;
                                }
                                return true;
                            }}
                        />
                    </section>
                </div>
            </TvSpatialOverlayShell>
        </div>
    );
}

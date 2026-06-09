'use client';

import { useCallback, useRef } from 'react';
import { setFocus } from '@noriginmedia/norigin-spatial-navigation-core';
import { isValidRoomId } from '@vkara/room';
import { LogIn, Plus } from 'lucide-react';

import { useJoinRoom } from '@/hooks/use-join-room';
import { useWebSocket } from '@/providers/websocket-provider';
import { useScopedI18n } from '@/locales/client';
import { useRoomSettingsStore } from '@/store/roomSettingsStore';
import { roomSecretFieldProps } from '@/lib/room-field-autofill';
import { TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
import {
    tvSettingsIconPlate,
    tvSettingsLabel,
    tvSettingsRow,
} from '@/lib/tv-focus-styles';
import { cn } from '@/lib/utils';

import { TvFocusable } from './tv-focusable';
import { TvRoomCodeInput } from './tv-room-code-input';
import { TvSpatialOverlayShell } from './tv-spatial-overlay-shell';

type TvLobbyProps = {
    isOffline?: boolean;
};

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
                    <p className={cn('min-w-0 flex-1 text-left', tvSettingsLabel(focused))}>{label}</p>
                </>
            )}
        </TvFocusable>
    );
}

export function TvLobby({ isOffline = false }: TvLobbyProps) {
    const t = useScopedI18n('tvLobby');
    const tTv = useScopedI18n('tvPage');
    const { connectionStatus, ensureConnectedAndSend } = useWebSocket();
    const { roomPassword, resetJoinFormState } = useRoomSettingsStore();
    const { joinRoom, joinRoomId, joinRoomPassword, setJoinRoomId, setJoinRoomPassword } =
        useJoinRoom();

    const passwordInputRef = useRef<HTMLInputElement>(null);
    const isConnected = connectionStatus === 'OPEN';
    const canJoin = isConnected && isValidRoomId(joinRoomId);

    const createRoom = useCallback(() => {
        const password = roomPassword.trim();
        ensureConnectedAndSend({
            type: 'createRoom',
            password: password || undefined,
        });
        resetJoinFormState();
    }, [roomPassword, ensureConnectedAndSend, resetJoinFormState]);

    const focusJoinSection = useCallback((direction: string) => {
        if (direction === 'down' || direction === 'right') {
            setFocus(TV_FOCUS_KEYS.lobbyCodeDigit(0));
            return false;
        }
        return true;
    }, []);

    return (
        <div className="tv-lobby absolute inset-0">
            <TvSpatialOverlayShell
                focusKey={TV_FOCUS_KEYS.lobby}
                preferredChildFocusKey={TV_FOCUS_KEYS.lobbyCreate}
                className="tv-lobby-shell"
                aria-label={t('title')}
            >
                <div className="tv-lobby-grid">
                    <header className="tv-lobby-grid__header">
                        <h1 className="tv-lobby-title">{t('title')}</h1>
                        {isOffline ? (
                            <p className="tv-lobby-offline">{tTv('offlineHint')}</p>
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
                            cn('tv-lobby-grid__create tv-lobby-create-hero', focused && 'tv-lobby-create-hero--focused')
                        }
                    >
                        <span className="tv-lobby-create-hero__icon" aria-hidden>
                            <Plus className="h-8 w-8" strokeWidth={2.25} />
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
                            <TvRoomCodeInput
                                value={joinRoomId}
                                onChangeAction={setJoinRoomId}
                            />
                            <p className="tv-lobby-code-hint">{t('roomCodeHint')}</p>
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
                            onEnterPress={joinRoom}
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

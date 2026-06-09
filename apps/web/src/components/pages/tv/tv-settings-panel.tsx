'use client';

import { useCallback, type ReactNode } from 'react';
import { isValidRoomId, ROOM_ID_LENGTH } from '@vkara/room';
import { LogOut, DoorClosed, Plus, LogIn } from 'lucide-react';

import { useJoinRoom } from '@/hooks/use-join-room';
import { useWebSocket } from '@/providers/websocket-provider';
import { useRoomSettingsStore } from '@/store/roomSettingsStore';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useI18n, useScopedI18n } from '@/locales/client';
import { toastSessionNotReady } from '@/lib/session-toast';
import {
    roomCodeFieldProps,
    roomCodeOtpSlotClassName,
    roomSecretFieldProps,
} from '@/lib/room-field-autofill';
import { TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
import {
    tvSettingsCloseButton,
    tvSettingsIconPlate,
    tvSettingsRow,
    tvSettingsSegment,
} from '@/lib/tv-focus-styles';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';
import { cn } from '@/lib/utils';

import { TvFocusable } from './tv-focusable';
import { TvSpatialOverlayShell } from './tv-spatial-overlay-shell';

type TvSettingsPanelProps = {
    onCloseAction: () => void;
    variant?: 'fullscreen' | 'rail';
};

function SettingsSectionLabel({ children }: { children: ReactNode }) {
    return (
        <p className="mb-3 px-1 text-sm font-semibold text-zinc-300">{children}</p>
    );
}

function SettingsRow({
    focusKey,
    label,
    description,
    icon,
    onEnterPress,
    disabled,
    destructive,
}: {
    focusKey: string;
    label: string;
    description?: string;
    icon?: ReactNode;
    onEnterPress?: () => void;
    disabled?: boolean;
    destructive?: boolean;
}) {
    return (
        <TvFocusable
            focusKey={focusKey}
            accessibilityLabel={label}
            disabled={disabled}
            suppressFocusChrome
            onEnterPress={onEnterPress}
            className="w-full"
        >
            {({ focused }) => (
                <div className={tvSettingsRow(focused, { destructive })}>
                    {icon ? (
                        <span className={tvSettingsIconPlate(focused)}>{icon}</span>
                    ) : null}
                    <div className="min-w-0 flex-1">
                        <p className="text-xl font-bold leading-tight">{label}</p>
                        {description ? (
                            <p
                                className={cn(
                                    'mt-1 text-base',
                                    focused ? 'text-white/85' : 'text-zinc-400',
                                )}
                            >
                                {description}
                            </p>
                        ) : null}
                    </div>
                </div>
            )}
        </TvFocusable>
    );
}

function QrToggleRow({
    showQRInPlayer,
    onChangeAction,
    showLabel,
    hideLabel,
}: {
    showQRInPlayer: boolean;
    onChangeAction: (show: boolean) => void;
    showLabel: string;
    hideLabel: string;
}) {
    return (
        <div className="grid grid-cols-2 gap-4">
            <TvFocusable
                focusKey={`${TV_FOCUS_KEYS.settingsQrToggle}_show`}
                accessibilityLabel={showLabel}
                suppressFocusChrome
                onEnterPress={() => onChangeAction(true)}
                className="w-full"
            >
                {({ focused }) => (
                    <div className={tvSettingsSegment(focused, showQRInPlayer)}>
                        {showLabel}
                    </div>
                )}
            </TvFocusable>
            <TvFocusable
                focusKey={`${TV_FOCUS_KEYS.settingsQrToggle}_hide`}
                accessibilityLabel={hideLabel}
                suppressFocusChrome
                onEnterPress={() => onChangeAction(false)}
                className="w-full"
            >
                {({ focused }) => (
                    <div className={tvSettingsSegment(focused, !showQRInPlayer)}>
                        {hideLabel}
                    </div>
                )}
            </TvFocusable>
        </div>
    );
}

export function TvSettingsPanel({
    onCloseAction,
    variant = 'rail',
}: TvSettingsPanelProps) {
    const t = useI18n();
    const tRoom = useScopedI18n('roomSettings');
    const tTv = useScopedI18n('tvPage');
    const tLobby = useScopedI18n('tvLobby');

    const { wsId, room, enterTvLobby } = useYouTubeStore();
    const { connectionStatus, ensureConnectedAndSend } = useWebSocket();
    const { roomPassword, resetJoinFormState } = useRoomSettingsStore();
    const {
        joinRoom,
        joinRoomId,
        setJoinRoomId,
        joinRoomPassword,
        setJoinRoomPassword,
    } = useJoinRoom();

    const isConnected = connectionStatus === 'OPEN';
    const showQRInPlayer = room?.showQRInPlayer ?? true;

    const createRoom = useCallback(() => {
        const password = roomPassword.trim();
        ensureConnectedAndSend({
            type: 'createRoom',
            password: password || undefined,
        });
        resetJoinFormState();
    }, [roomPassword, ensureConnectedAndSend, resetJoinFormState]);

    const leaveRoom = useCallback(() => {
        if (!room?.id) {
            return;
        }
        ensureConnectedAndSend({ type: 'leaveRoom' });
        enterTvLobby();
        onCloseAction();
    }, [ensureConnectedAndSend, room?.id, enterTvLobby, onCloseAction]);

    const closeRoom = useCallback(() => {
        if (!room?.id) {
            return;
        }
        ensureConnectedAndSend({ type: 'closeRoom' });
        enterTvLobby();
        onCloseAction();
    }, [ensureConnectedAndSend, room?.id, enterTvLobby, onCloseAction]);

    const handleShowQrChange = useCallback(
        (show: boolean) => {
            if (!room?.id) {
                toastSessionNotReady({
                    title: t('toast.sessionNotReady'),
                    description: t('toast.sessionNotReadyDescription'),
                });
                return;
            }
            ensureConnectedAndSend({
                type: 'setShowQRInPlayer',
                show,
            });
        },
        [room?.id, ensureConnectedAndSend, t],
    );

    const preferredFocusKey = room
        ? `${TV_FOCUS_KEYS.settingsQrToggle}_show`
        : TV_FOCUS_KEYS.settingsCreate;

    const isRail = variant === 'rail';

    return (
        <div
            className={cn(
                'absolute z-40',
                isRail
                    ? 'inset-y-0 right-0 flex w-full max-w-md border-l-4 border-[#3ea6ff]/30 bg-zinc-900/95 shadow-[-24px_0_80px_rgba(0,0,0,0.55)] xl:max-w-lg'
                    : 'inset-0 bg-zinc-950/95 backdrop-blur-md',
            )}
        >
            <TvSpatialOverlayShell
                focusKey={TV_FOCUS_KEYS.settingsPanel}
                preferredChildFocusKey={preferredFocusKey}
                dismissDirection={isRail ? 'left' : undefined}
                onDismissAction={isRail ? onCloseAction : undefined}
                trapFocus
                className={cn(
                    'flex h-full flex-col overflow-y-auto',
                    isRail ? 'px-7 py-9' : 'px-8 py-10 md:px-16 md:py-12',
                )}
                aria-label={tTv('settings')}
            >
                <header className={cn('mb-10', !isRail && 'max-w-3xl')}>
                    <h1
                        className={cn(
                            'font-bold tracking-tight text-white',
                            isRail ? 'text-3xl' : 'text-4xl md:text-5xl',
                        )}
                    >
                        {tTv('settings')}
                    </h1>
                    <p className="mt-3 text-base text-zinc-300 md:text-lg">{tTv('settingsHint')}</p>
                </header>

                <div className={cn('w-full space-y-10', !isRail && 'mx-auto max-w-3xl')}>
                    {room ? (
                        <>
                            <section>
                                <SettingsSectionLabel>{tRoom('roomId')}</SettingsSectionLabel>
                                <div className="rounded-2xl border-4 border-zinc-600 bg-zinc-700/50 px-6 py-8 text-center">
                                    <p
                                        className={cn(
                                            'font-mono font-bold tabular-nums tracking-[0.35em] text-white',
                                            isRail ? 'text-5xl' : 'text-6xl md:text-7xl',
                                        )}
                                    >
                                        {room.id}
                                    </p>
                                </div>
                            </section>

                            <section>
                                <SettingsSectionLabel>{tRoom('showQRInPlayer')}</SettingsSectionLabel>
                                <QrToggleRow
                                    showQRInPlayer={showQRInPlayer}
                                    onChangeAction={handleShowQrChange}
                                    showLabel={tRoom('show')}
                                    hideLabel={tRoom('hide')}
                                />
                            </section>

                            <section className="border-t border-zinc-600/60 pt-8">
                                <div className="space-y-4">
                                    <SettingsRow
                                        focusKey={TV_FOCUS_KEYS.settingsLeave}
                                        label={tRoom('leaveRoom')}
                                        icon={<LogOut className="h-6 w-6" strokeWidth={2.5} />}
                                        onEnterPress={leaveRoom}
                                    />

                                    {room.creatorId === wsId ? (
                                        <SettingsRow
                                            focusKey={TV_FOCUS_KEYS.settingsCloseRoom}
                                            label={tRoom('closeRoom')}
                                            destructive
                                            icon={
                                                <DoorClosed className="h-6 w-6" strokeWidth={2.5} />
                                            }
                                            onEnterPress={closeRoom}
                                        />
                                    ) : null}
                                </div>
                            </section>
                        </>
                    ) : (
                        <>
                            <section>
                                <SettingsRow
                                    focusKey={TV_FOCUS_KEYS.settingsCreate}
                                    label={tLobby('createButton')}
                                    description={tTv('settingsCreateHint')}
                                    icon={<Plus className="h-6 w-6" strokeWidth={2.5} />}
                                    disabled={!isConnected}
                                    onEnterPress={() => {
                                        if (isConnected) {
                                            createRoom();
                                        }
                                    }}
                                />
                            </section>

                            <div className="flex items-center gap-4 py-1">
                                <div className="h-px flex-1 bg-zinc-600" />
                                <p className="text-sm font-medium text-zinc-400">{tLobby('or')}</p>
                                <div className="h-px flex-1 bg-zinc-600" />
                            </div>

                            <section>
                                <SettingsSectionLabel>{tLobby('joinButton')}</SettingsSectionLabel>
                                <div className="space-y-6 rounded-2xl border-4 border-zinc-600/80 bg-zinc-700/40 p-7">
                                    <p className="text-xl font-semibold text-zinc-100">
                                        {tLobby('roomIdLabel')}
                                    </p>
                                    <div className="flex justify-center">
                                        <InputOTP
                                            maxLength={ROOM_ID_LENGTH}
                                            value={joinRoomId}
                                            onChange={setJoinRoomId}
                                            inputMode="numeric"
                                            {...roomCodeFieldProps}
                                        >
                                            <InputOTPGroup>
                                                {Array.from({ length: ROOM_ID_LENGTH }).map(
                                                    (_, index) => (
                                                        <InputOTPSlot
                                                            key={index}
                                                            index={index}
                                                            className={cn(
                                                                roomCodeOtpSlotClassName,
                                                                'h-[4.5rem] w-16 border-4 border-zinc-500 bg-zinc-800 text-3xl font-bold text-white',
                                                            )}
                                                        />
                                                    ),
                                                )}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>

                                    <div className="space-y-3">
                                        <label
                                            htmlFor="tv-settings-join-password"
                                            className="text-base font-semibold text-zinc-200"
                                        >
                                            {tLobby('passwordLabel')}
                                        </label>
                                        <input
                                            id="tv-settings-join-password"
                                            type="password"
                                            value={joinRoomPassword}
                                            onChange={(e) => setJoinRoomPassword(e.target.value)}
                                            placeholder={tLobby('passwordPlaceholder')}
                                            className="h-16 w-full rounded-2xl border-4 border-zinc-500 bg-zinc-800 px-5 text-xl text-zinc-100 placeholder:text-zinc-500"
                                            {...roomSecretFieldProps}
                                        />
                                    </div>

                                    <SettingsRow
                                        focusKey={TV_FOCUS_KEYS.settingsJoin}
                                        label={tLobby('joinButton')}
                                        icon={<LogIn className="h-6 w-6" strokeWidth={2.5} />}
                                        disabled={!isConnected || !isValidRoomId(joinRoomId)}
                                        onEnterPress={() => {
                                            if (isConnected && isValidRoomId(joinRoomId)) {
                                                joinRoom();
                                            }
                                        }}
                                    />
                                </div>
                            </section>
                        </>
                    )}
                </div>

                <div className={cn('mt-auto pt-10', !isRail && 'mx-auto w-full max-w-3xl')}>
                    <TvFocusable
                        focusKey={TV_FOCUS_KEYS.settingsClose}
                        accessibilityLabel={tTv('close')}
                        suppressFocusChrome
                        onEnterPress={onCloseAction}
                        className="w-full"
                    >
                        {({ focused }) => (
                            <div className={tvSettingsCloseButton(focused)}>{tTv('close')}</div>
                        )}
                    </TvFocusable>
                </div>
            </TvSpatialOverlayShell>
        </div>
    );
}

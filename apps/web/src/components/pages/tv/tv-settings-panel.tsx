'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { isValidRoomId, ROOM_ID_LENGTH } from '@vkara/room';
import { setFocus } from '@noriginmedia/norigin-spatial-navigation-core';
import { Check, ChevronDown, DoorClosed, Languages, LogIn, LogOut, Plus, QrCode, X } from 'lucide-react';

import { useJoinRoom } from '@/hooks/use-join-room';
import { useChangeLocale } from '@/hooks/use-change-locale';
import { useWebSocket } from '@/providers/websocket-provider';
import { useRoomSettingsStore } from '@/store/roomSettingsStore';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useI18n, useScopedI18n, useCurrentLocale } from '@/locales/client';
import { toastSessionNotReady } from '@/lib/session-toast';
import {
    roomCodeFieldProps,
    roomCodeOtpSlotClassName,
    roomSecretFieldProps,
} from '@/lib/room-field-autofill';
import { TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
import {
    tvSettingsIconPlate,
    tvSettingsLabel,
    tvSettingsRow,
    tvSettingsSectionLabel,
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
    return <p className={tvSettingsSectionLabel()}>{children}</p>;
}

function SettingsRow({
    focusKey,
    label,
    description,
    icon,
    selected,
    onEnterPress,
    disabled,
    destructive,
}: {
    focusKey: string;
    label: string;
    description?: string;
    icon?: ReactNode;
    selected?: boolean;
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
            scrollIntoViewOnFocus
            onEnterPress={onEnterPress}
            className={({ focused }) =>
                cn(
                    tvSettingsRow(focused, { destructive, selected }),
                    selected && 'tv-settings-row--selected',
                )
            }
        >
            {({ focused }) => (
                <>
                    {icon ? (
                        <span className={tvSettingsIconPlate(focused)}>{icon}</span>
                    ) : selected !== undefined ? (
                        <span className={tvSettingsIconPlate(focused)}>
                            {selected ? (
                                <Check className="h-6 w-6" strokeWidth={2.5} aria-hidden />
                            ) : (
                                <span className="block h-6 w-6" aria-hidden />
                            )}
                        </span>
                    ) : null}
                    <div className="min-w-0 flex-1 text-left">
                        <p className={tvSettingsLabel(focused, { destructive, selected })}>
                            {label}
                        </p>
                        {description ? (
                            <p className={cn('tv-settings-desc mt-1.5', focused && 'text-white/90')}>
                                {description}
                            </p>
                        ) : null}
                    </div>
                </>
            )}
        </TvFocusable>
    );
}

function SettingsDropdown<T extends string>({
    focusKey,
    sectionLabel,
    icon,
    value,
    options,
    onChangeAction,
}: {
    focusKey: string;
    sectionLabel: string;
    icon: ReactNode;
    value: T;
    options: { value: T; label: string }[];
    onChangeAction: (next: T) => void;
}) {
    const [open, setOpen] = useState(false);

    const currentLabel = options.find((option) => option.value === value)?.label ?? value;

    const closeDropdown = useCallback(() => {
        setOpen(false);
        requestAnimationFrame(() => {
            try {
                setFocus(focusKey);
            } catch {
                // Spatial tree may not be ready.
            }
        });
    }, [focusKey]);

    useEffect(() => {
        if (!open) {
            return;
        }

        const frame = requestAnimationFrame(() => {
            try {
                setFocus(`${focusKey}_${value}`);
            } catch {
                // Spatial tree may not be ready.
            }
        });

        return () => cancelAnimationFrame(frame);
    }, [open, focusKey, value]);

    const handleSelect = useCallback(
        (next: T) => {
            onChangeAction(next);
            closeDropdown();
        },
        [closeDropdown, onChangeAction],
    );

    const firstOptionValue = options[0]?.value;

    return (
        <section>
            <SettingsSectionLabel>{sectionLabel}</SettingsSectionLabel>

            <TvFocusable
                focusKey={focusKey}
                accessibilityLabel={`${sectionLabel}: ${currentLabel}`}
                suppressFocusChrome
                scrollIntoViewOnFocus
                onEnterPress={() => setOpen((prev) => !prev)}
                onArrowPress={(direction) => {
                    if (direction === 'up' && open) {
                        closeDropdown();
                        return false;
                    }
                    return true;
                }}
                className={({ focused }) =>
                    cn(
                        tvSettingsRow(focused),
                        'tv-settings-dropdown-trigger',
                        open && !focused && 'tv-settings-dropdown-trigger--open',
                    )
                }
            >
                {({ focused }) => (
                    <>
                        <span className={tvSettingsIconPlate(focused)}>{icon}</span>
                        <div className="min-w-0 flex-1 text-left">
                            <p className={tvSettingsLabel(focused)}>{sectionLabel}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                            <span className={cn('tv-settings-dropdown-value', focused && 'text-white')}>
                                {currentLabel}
                            </span>
                            <ChevronDown
                                className={cn(
                                    'tv-settings-dropdown-chevron h-6 w-6 shrink-0',
                                    open && 'tv-settings-dropdown-chevron--open',
                                    focused ? 'text-white' : 'text-zinc-300',
                                )}
                                strokeWidth={2.5}
                                aria-hidden
                            />
                        </div>
                    </>
                )}
            </TvFocusable>

            {open ? (
                <div className="tv-settings-dropdown-menu" role="listbox" aria-label={sectionLabel}>
                    {options.map((option) => (
                        <TvFocusable
                            key={option.value}
                            focusKey={`${focusKey}_${option.value}`}
                            accessibilityLabel={option.label}
                            suppressFocusChrome
                            scrollIntoViewOnFocus
                            onEnterPress={() => handleSelect(option.value)}
                            onArrowPress={(direction) => {
                                if (direction === 'up' && option.value === firstOptionValue) {
                                    closeDropdown();
                                    return false;
                                }
                                return true;
                            }}
                            className={({ focused }) =>
                                cn(
                                    tvSettingsRow(focused, {
                                        selected: value === option.value,
                                    }),
                                    'tv-settings-dropdown-option',
                                    value === option.value && 'tv-settings-row--selected',
                                )
                            }
                        >
                            {({ focused }) => (
                                <>
                                    <span className={tvSettingsIconPlate(focused)}>
                                        {value === option.value ? (
                                            <Check className="h-6 w-6" strokeWidth={2.5} aria-hidden />
                                        ) : (
                                            <span className="block h-6 w-6" aria-hidden />
                                        )}
                                    </span>
                                    <p className={tvSettingsLabel(focused, { selected: value === option.value })}>
                                        {option.label}
                                    </p>
                                </>
                            )}
                        </TvFocusable>
                    ))}
                </div>
            ) : null}
        </section>
    );
}

export function TvSettingsPanel({
    onCloseAction,
    variant = 'rail',
}: TvSettingsPanelProps) {
    const t = useI18n();
    const tAppearance = useScopedI18n('appearance');
    const tRoom = useScopedI18n('roomSettings');
    const tTv = useScopedI18n('tvPage');
    const tLobby = useScopedI18n('tvLobby');

    const locale = useCurrentLocale();
    const changeLocale = useChangeLocale({ preserveSearchParams: true });

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
        ? TV_FOCUS_KEYS.settingsQrToggle
        : TV_FOCUS_KEYS.settingsCreate;

    const isRail = variant === 'rail';

    return (
        <div
            className={cn(
                'absolute z-40 min-h-0',
                isRail
                    ? 'tv-settings-rail inset-y-0 right-0 flex w-full max-w-[22rem] flex-col shadow-[-16px_0_48px_rgb(0_0_0_0.35)] sm:max-w-md xl:max-w-lg'
                    : 'tv-settings-fullscreen inset-0 flex flex-col',
            )}
        >
            <TvSpatialOverlayShell
                focusKey={TV_FOCUS_KEYS.settingsPanel}
                preferredChildFocusKey={preferredFocusKey}
                trapFocus
                className={cn(
                    'tv-settings-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain',
                    isRail ? 'px-6 py-8 md:px-7 md:py-9' : 'px-8 py-10 md:px-16 md:py-12',
                )}
                aria-label={tTv('settings')}
            >
                <header className={cn('mb-8 shrink-0', !isRail && 'max-w-3xl')}>
                    <h1 className="tv-settings-panel-title">{tTv('settings')}</h1>
                    <p className="tv-settings-panel-hint mt-3">{tTv('settingsHint')}</p>
                </header>

                <div className={cn('flex w-full flex-col gap-8', !isRail && 'mx-auto max-w-3xl')}>
                    {room ? (
                        <>
                            <section>
                                <SettingsSectionLabel>{tRoom('roomId')}</SettingsSectionLabel>
                                <div className="tv-settings-room-id">
                                    <p className="tv-settings-room-id__digits">{room.id}</p>
                                </div>
                            </section>

                            <SettingsDropdown
                                focusKey={TV_FOCUS_KEYS.settingsQrToggle}
                                sectionLabel={tRoom('showQRInPlayer')}
                                icon={<QrCode className="h-6 w-6" strokeWidth={2.5} aria-hidden />}
                                value={showQRInPlayer ? 'show' : 'hide'}
                                options={[
                                    { value: 'show', label: tRoom('show') },
                                    { value: 'hide', label: tRoom('hide') },
                                ]}
                                onChangeAction={(next) => handleShowQrChange(next === 'show')}
                            />

                            <SettingsDropdown
                                focusKey={TV_FOCUS_KEYS.settingsLocale}
                                sectionLabel={tAppearance('language')}
                                icon={<Languages className="h-6 w-6" strokeWidth={2.5} aria-hidden />}
                                value={locale}
                                options={[
                                    { value: 'vi', label: tAppearance('languageVietnamese') },
                                    { value: 'en', label: tAppearance('languageEnglish') },
                                ]}
                                onChangeAction={changeLocale}
                            />

                            <section className="space-y-3 border-t border-white/15 pt-6">
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
                                        icon={<DoorClosed className="h-6 w-6" strokeWidth={2.5} />}
                                        onEnterPress={closeRoom}
                                    />
                                ) : null}
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

                            <div className="flex items-center gap-3">
                                <div className="h-px flex-1 bg-white/10" />
                                <p className="text-sm font-semibold uppercase tracking-wider text-zinc-300">
                                    {tLobby('or')}
                                </p>
                                <div className="h-px flex-1 bg-white/10" />
                            </div>

                            <SettingsDropdown
                                focusKey={TV_FOCUS_KEYS.settingsLocale}
                                sectionLabel={tAppearance('language')}
                                icon={<Languages className="h-6 w-6" strokeWidth={2.5} aria-hidden />}
                                value={locale}
                                options={[
                                    { value: 'vi', label: tAppearance('languageVietnamese') },
                                    { value: 'en', label: tAppearance('languageEnglish') },
                                ]}
                                onChangeAction={changeLocale}
                            />

                            <section>
                                <SettingsSectionLabel>{tLobby('joinButton')}</SettingsSectionLabel>
                                <div className="space-y-5 rounded-2xl border-4 border-white/15 bg-white/14 p-5 md:p-6">
                                    <p className="text-lg font-semibold text-zinc-100">
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
                                                                'h-[4.5rem] w-[3.75rem] border-4 border-white/25 bg-white/14 text-3xl font-bold text-white md:h-20 md:w-[4.25rem] md:text-4xl',
                                                            )}
                                                        />
                                                    ),
                                                )}
                                            </InputOTPGroup>
                                        </InputOTP>
                                    </div>

                                    <div className="space-y-2">
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
                                            className="h-16 w-full rounded-2xl border-4 border-white/25 bg-white/14 px-5 text-xl text-white placeholder:text-zinc-400 md:h-[4.5rem] md:text-2xl"
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

                <div className={cn('mt-8 shrink-0', !isRail && 'mx-auto w-full max-w-3xl')}>
                    <SettingsRow
                        focusKey={TV_FOCUS_KEYS.settingsClose}
                        label={tTv('close')}
                        icon={<X className="h-6 w-6" strokeWidth={2.5} />}
                        onEnterPress={onCloseAction}
                    />
                </div>
            </TvSpatialOverlayShell>
        </div>
    );
}

'use client';

import { useCallback, useEffect, useRef, useState, type ReactNode, type RefObject } from 'react';
import { setFocus } from '@noriginmedia/norigin-spatial-navigation-core';
import {
    Check,
    ChevronDown,
    DoorClosed,
    Languages,
    Lock,
    LockOpen,
    LogOut,
    QrCode,
    X,
} from 'lucide-react';

import { useChangeLocale } from '@/hooks/use-change-locale';
import { useWebSocket } from '@/providers/websocket-provider';
import { useYouTubeStore } from '@/store/youtubeStore';
import { useI18n, useScopedI18n, useCurrentLocale } from '@/locales/client';
import { toastSessionNotReady } from '@/lib/session-toast';
import { TV_FOCUS_KEYS } from '@/lib/tv-spatial-nav';
import { peekTvSettingsScrollUp } from '@/lib/tv-settings-scroll';
import {
    tvSettingsIconPlate,
    tvSettingsLabel,
    tvSettingsRow,
    tvSettingsSectionLabel,
} from '@/lib/tv-focus-styles';
import { cn } from '@/lib/utils';

import { TvFocusable } from './tv-focusable';
import { TvSpatialOverlayShell } from './tv-spatial-overlay-shell';
import { TvParticipantsPanel } from './tv-participants-panel';
import { getOrCreateDeviceId } from '@/lib/device-id';

type TvSettingsPanelProps = {
    onCloseAction: () => void;
};

function SettingsSectionLabel({ children }: { children: ReactNode }) {
    return <p className={tvSettingsSectionLabel()}>{children}</p>;
}

type SettingsScrollProps = {
    scrollContainerRef: RefObject<HTMLDivElement | null>;
    handleUpPeekScroll: (direction: string) => boolean;
};

function SettingsRow({
    focusKey,
    label,
    icon,
    selected,
    onEnterPress,
    disabled,
    destructive,
    scrollContainerRef,
    handleUpPeekScroll,
    peekScrollUpOnUp = false,
}: {
    focusKey: string;
    label: string;
    icon?: ReactNode;
    selected?: boolean;
    onEnterPress?: () => void;
    disabled?: boolean;
    destructive?: boolean;
    peekScrollUpOnUp?: boolean;
} & SettingsScrollProps) {
    return (
        <TvFocusable
            focusKey={focusKey}
            accessibilityLabel={label}
            disabled={disabled}
            suppressFocusChrome
            scrollIntoViewOnFocus
            scrollContainerRef={scrollContainerRef}
            onEnterPress={onEnterPress}
            onArrowPress={(direction) => {
                if (direction === 'up' && peekScrollUpOnUp) {
                    return handleUpPeekScroll(direction);
                }
                return true;
            }}
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
    scrollContainerRef,
    handleUpPeekScroll,
    peekScrollUpOnUp = false,
}: {
    focusKey: string;
    sectionLabel: string;
    icon: ReactNode;
    value: T;
    options: { value: T; label: string }[];
    onChangeAction: (next: T) => void;
    peekScrollUpOnUp?: boolean;
} & SettingsScrollProps) {
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
                scrollContainerRef={scrollContainerRef}
                onEnterPress={() => setOpen((prev) => !prev)}
                onArrowPress={(direction) => {
                    if (direction === 'up' && open) {
                        closeDropdown();
                        return false;
                    }
                    if (direction === 'up' && !open && peekScrollUpOnUp) {
                        return handleUpPeekScroll(direction);
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
                            <span
                                className={cn(
                                    'tv-settings-dropdown-value',
                                    focused && 'text-white',
                                )}
                            >
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
                            scrollContainerRef={scrollContainerRef}
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
                                            <Check
                                                className="h-6 w-6"
                                                strokeWidth={2.5}
                                                aria-hidden
                                            />
                                        ) : (
                                            <span className="block h-6 w-6" aria-hidden />
                                        )}
                                    </span>
                                    <p
                                        className={tvSettingsLabel(focused, {
                                            selected: value === option.value,
                                        })}
                                    >
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

export function TvSettingsPanel({ onCloseAction }: TvSettingsPanelProps) {
    const t = useI18n();
    const tAppearance = useScopedI18n('appearance');
    const tRoom = useScopedI18n('roomSettings');
    const tTv = useScopedI18n('tvPage');

    const locale = useCurrentLocale();
    const changeLocale = useChangeLocale({ preserveSearchParams: true });

    const wsId = useYouTubeStore((s) => s.wsId);
    const roomId = useYouTubeStore((s) => s.room?.id);
    const roomCreatorId = useYouTubeStore((s) => s.room?.creatorId);
    const roomLocked = useYouTubeStore((s) => s.room?.locked ?? false);
    const hostDeviceId = useYouTubeStore((s) => s.room?.hostDeviceId);
    const participants = useYouTubeStore((s) => s.room?.participants);
    const showQRInPlayer = useYouTubeStore((s) => s.room?.showQRInPlayer ?? true);
    const enterTvLobby = useYouTubeStore((s) => s.enterTvLobby);
    const { ensureConnectedAndSend } = useWebSocket();
    const myDeviceId = getOrCreateDeviceId();
    const isHost =
        Boolean(myDeviceId) &&
        (hostDeviceId === myDeviceId || participants?.[myDeviceId ?? '']?.role === 'host');

    const leaveRoom = useCallback(() => {
        if (!roomId) {
            return;
        }
        ensureConnectedAndSend({ type: 'leaveRoom' });
        enterTvLobby();
        onCloseAction();
    }, [ensureConnectedAndSend, roomId, enterTvLobby, onCloseAction]);

    const closeRoom = useCallback(() => {
        if (!roomId) {
            return;
        }
        ensureConnectedAndSend({ type: 'closeRoom' });
        enterTvLobby();
        onCloseAction();
    }, [ensureConnectedAndSend, roomId, enterTvLobby, onCloseAction]);

    const handleShowQrChange = useCallback(
        (show: boolean) => {
            if (!roomId) {
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
        [roomId, ensureConnectedAndSend, t],
    );

    const toggleLock = useCallback(() => {
        if (!roomId) {
            toastSessionNotReady({
                title: t('toast.sessionNotReady'),
                description: t('toast.sessionNotReadyDescription'),
            });
            return;
        }
        if (roomLocked) {
            ensureConnectedAndSend({ type: 'unlockRoom' });
            return;
        }
        if (!isHost) return;
        ensureConnectedAndSend({ type: 'lockRoom' });
    }, [roomId, roomLocked, isHost, ensureConnectedAndSend, t]);

    const scrollRef = useRef<HTMLDivElement>(null);

    const handleUpPeekScroll = useCallback((direction: string) => {
        if (direction !== 'up') {
            return true;
        }
        return peekTvSettingsScrollUp(scrollRef.current);
    }, []);

    const scrollProps: SettingsScrollProps = {
        scrollContainerRef: scrollRef,
        handleUpPeekScroll,
    };

    if (!roomId) {
        return null;
    }

    return (
        <div className="tv-settings-rail absolute inset-y-0 right-0 z-40 flex min-h-0 flex-col shadow-[-16px_0_48px_rgb(0_0_0_0.35)]">
            <header className="tv-settings-header shrink-0">
                <h1 className="tv-settings-panel-title">{tTv('settings')}</h1>
            </header>

            <TvSpatialOverlayShell
                focusKey={TV_FOCUS_KEYS.settingsPanel}
                preferredChildFocusKey={TV_FOCUS_KEYS.settingsQrToggle}
                trapFocus
                containerRef={scrollRef}
                className="tv-settings-scroll flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-y-contain"
                aria-label={tTv('settings')}
            >
                <div className="tv-settings-sections">
                    <section>
                        <SettingsSectionLabel>{tRoom('roomId')}</SettingsSectionLabel>
                        <div className="tv-settings-room-id">
                            <p className="tv-settings-room-id__digits">{roomId}</p>
                        </div>
                    </section>

                    <SettingsDropdown
                        {...scrollProps}
                        peekScrollUpOnUp
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

                    {roomLocked || isHost ? (
                        <SettingsRow
                            {...scrollProps}
                            focusKey={TV_FOCUS_KEYS.settingsLock}
                            label={roomLocked ? tRoom('unlockRoom') : tRoom('lockRoom')}
                            icon={
                                roomLocked ? (
                                    <LockOpen className="h-6 w-6" strokeWidth={2.5} />
                                ) : (
                                    <Lock className="h-6 w-6" strokeWidth={2.5} />
                                )
                            }
                            onEnterPress={toggleLock}
                        />
                    ) : null}

                    <TvParticipantsPanel
                        scrollContainerRef={scrollRef}
                        peekScrollUpOnUp={!(roomLocked || isHost)}
                    />

                    <SettingsDropdown
                        {...scrollProps}
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
                            {...scrollProps}
                            focusKey={TV_FOCUS_KEYS.settingsLeave}
                            label={tRoom('leaveRoom')}
                            icon={<LogOut className="h-6 w-6" strokeWidth={2.5} />}
                            onEnterPress={leaveRoom}
                        />

                        {roomCreatorId === wsId ? (
                            <SettingsRow
                                {...scrollProps}
                                focusKey={TV_FOCUS_KEYS.settingsCloseRoom}
                                label={tRoom('closeRoom')}
                                destructive
                                icon={<DoorClosed className="h-6 w-6" strokeWidth={2.5} />}
                                onEnterPress={closeRoom}
                            />
                        ) : null}
                    </section>
                </div>

                <div className="mt-8 shrink-0">
                    <SettingsRow
                        {...scrollProps}
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

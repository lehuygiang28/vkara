'use client';

import { useCallback, useId, useMemo, useState } from 'react';
import type { Participant } from '@vkara/room';
import { Crown, Monitor, MoreHorizontal, Smartphone, UserMinus, UserX, Bot } from 'lucide-react';

import { getOrCreateDeviceId } from '@/lib/device-id';
import { useWebSocket } from '@/providers/websocket-provider';
import { useScopedI18n } from '@/locales/client';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';

type ParticipantsPanelProps = {
    participants: Record<string, Participant> | undefined;
    hostDeviceId?: string;
    className?: string;
    /** Compact list for TV settings rail. */
    variant?: 'default' | 'tv';
};

type PendingAction =
    | { kind: 'promote'; participant: Participant }
    | { kind: 'kick'; participant: Participant };

function sortParticipants(participants: Participant[], hostDeviceId?: string): Participant[] {
    return [...participants].sort((a, b) => {
        if (a.deviceId === hostDeviceId) return -1;
        if (b.deviceId === hostDeviceId) return 1;
        if (a.role === 'host' && b.role !== 'host') return -1;
        if (b.role === 'host' && a.role !== 'host') return 1;
        return a.joinedAt - b.joinedAt;
    });
}

export function useSortedParticipants(
    participants: Record<string, Participant> | undefined,
    hostDeviceId?: string,
): Participant[] {
    return useMemo(() => {
        if (!participants) return [];
        return sortParticipants(Object.values(participants), hostDeviceId);
    }, [participants, hostDeviceId]);
}

function isParticipantHost(participant: Participant, hostDeviceId?: string): boolean {
    return participant.role === 'host' || participant.deviceId === hostDeviceId;
}

type ParticipantActionsProps = {
    participant: Participant;
    hostDeviceId?: string;
    hostCount: number;
    onPromoteRequest: (participant: Participant) => void;
    onDemote: (participant: Participant) => void;
    onKickRequest: (participant: Participant) => void;
};

function ParticipantActions({
    participant,
    hostDeviceId,
    hostCount,
    onPromoteRequest,
    onDemote,
    onKickRequest,
}: ParticipantActionsProps) {
    const tRoom = useScopedI18n('roomSettings');
    const name = participant.displayName;
    const isHost = isParticipantHost(participant, hostDeviceId);
    const canPromote = !isHost;
    const canDemote = isHost && hostCount > 1;
    const canKick = !participant.isTvConnection;

    if (!canPromote && !canDemote && !canKick) {
        return null;
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 text-muted-foreground hover:text-foreground"
                    aria-label={tRoom('participantActionsFor', { name })}
                >
                    <MoreHorizontal className="h-5 w-5" aria-hidden />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-48">
                {canPromote ? (
                    <DropdownMenuItem
                        className="min-h-11 gap-2"
                        onSelect={() => onPromoteRequest(participant)}
                    >
                        <Crown className="h-4 w-4 shrink-0" aria-hidden />
                        {tRoom('promote')}
                    </DropdownMenuItem>
                ) : null}
                {canDemote ? (
                    <DropdownMenuItem
                        className="min-h-11 gap-2"
                        onSelect={() => onDemote(participant)}
                    >
                        <UserMinus className="h-4 w-4 shrink-0" aria-hidden />
                        {tRoom('demote')}
                    </DropdownMenuItem>
                ) : null}
                {canKick ? (
                    <>
                        {canPromote || canDemote ? <DropdownMenuSeparator /> : null}
                        <DropdownMenuItem
                            className="min-h-11 gap-2 text-destructive focus:bg-destructive/10 focus:text-destructive"
                            onSelect={() => onKickRequest(participant)}
                        >
                            <UserX className="h-4 w-4 shrink-0" aria-hidden />
                            {tRoom('kick')}
                        </DropdownMenuItem>
                    </>
                ) : null}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

export function ParticipantsPanel({
    participants,
    hostDeviceId,
    className,
    variant = 'default',
}: ParticipantsPanelProps) {
    const tRoom = useScopedI18n('roomSettings');
    const { ensureConnectedAndSend } = useWebSocket();
    const myDeviceId = getOrCreateDeviceId();
    const list = useSortedParticipants(participants, hostDeviceId);
    const isTv = variant === 'tv';
    const statusId = useId();
    const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
    const [statusMessage, setStatusMessage] = useState('');

    const iAmHost = useMemo(() => {
        if (!myDeviceId || !participants) return false;
        const me = participants[myDeviceId];
        return me?.role === 'host' || hostDeviceId === myDeviceId;
    }, [participants, myDeviceId, hostDeviceId]);

    const hostCount = useMemo(
        () => list.filter((p) => isParticipantHost(p, hostDeviceId)).length,
        [list, hostDeviceId],
    );

    const demote = useCallback(
        (participant: Participant) => {
            setStatusMessage(tRoom('statusDemoted', { name: participant.displayName }));
            ensureConnectedAndSend({
                type: 'demoteParticipant',
                targetDeviceId: participant.deviceId,
            });
        },
        [ensureConnectedAndSend, tRoom],
    );

    const confirmPendingAction = useCallback(() => {
        if (!pendingAction) return;
        const { kind, participant } = pendingAction;
        setPendingAction(null);

        if (kind === 'promote') {
            setStatusMessage(tRoom('statusPromoted', { name: participant.displayName }));
            ensureConnectedAndSend({
                type: 'promoteParticipant',
                targetDeviceId: participant.deviceId,
            });
            return;
        }

        setStatusMessage(tRoom('statusKicked', { name: participant.displayName }));
        ensureConnectedAndSend({
            type: 'kickParticipant',
            targetDeviceId: participant.deviceId,
        });
    }, [pendingAction, ensureConnectedAndSend, tRoom]);

    if (list.length === 0) {
        return (
            <p
                className={cn(
                    'text-sm text-muted-foreground',
                    isTv && 'text-zinc-400',
                    className,
                )}
            >
                {tRoom('participantsEmpty')}
            </p>
        );
    }

    const pendingName = pendingAction?.participant.displayName ?? '';
    const isKickPending = pendingAction?.kind === 'kick';
    const isPromotePending = pendingAction?.kind === 'promote';

    return (
        <>
            <div className="sr-only" aria-live="polite" aria-atomic="true" id={statusId}>
                {statusMessage}
            </div>

            <ul
                className={cn('space-y-1.5', className)}
                aria-label={tRoom('participants')}
                aria-describedby={statusMessage ? statusId : undefined}
            >
                {list.map((participant) => {
                    const isYou = participant.deviceId === myDeviceId;
                    const isHost = isParticipantHost(participant, hostDeviceId);
                    const isOnline = participant.connectionIds.length > 0;
                    const Icon = participant.isTvConnection ? Monitor : Smartphone;
                    const showActions = !isTv && iAmHost && !isYou;

                    return (
                        <li
                            key={participant.deviceId}
                            className={cn(
                                'flex items-center gap-3 rounded-lg border px-3 py-2.5',
                                isTv
                                    ? 'border-white/10 bg-white/5 text-white'
                                    : 'border-border bg-card text-foreground',
                            )}
                        >
                            <span
                                className={cn(
                                    'flex h-9 w-9 shrink-0 items-center justify-center rounded-full',
                                    isTv
                                        ? 'bg-white/10 text-zinc-200'
                                        : 'bg-muted text-muted-foreground',
                                )}
                                aria-hidden
                            >
                                <Icon className="h-4 w-4" strokeWidth={2} />
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="truncate pb-0.5 text-sm font-medium leading-snug">
                                    {participant.displayName}
                                    {isYou ? (
                                        <span
                                            className={cn(
                                                'ml-1.5 text-xs font-normal',
                                                isTv ? 'text-zinc-400' : 'text-muted-foreground',
                                            )}
                                        >
                                            ({tRoom('you')})
                                        </span>
                                    ) : null}
                                </p>
                                <div className="mt-2 flex flex-wrap items-center gap-1.5">
                                    <span
                                        className={cn(
                                            'inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                                            isHost
                                                ? isTv
                                                    ? 'bg-[#3ea6ff]/20 text-[#3ea6ff]'
                                                    : 'bg-primary/10 text-primary'
                                                : isTv
                                                  ? 'bg-white/10 text-zinc-300'
                                                  : 'bg-muted text-muted-foreground',
                                        )}
                                    >
                                        {isHost ? tRoom('roleHost') : tRoom('roleMember')}
                                    </span>
                                    {participant.isAgent ? (
                                        <span
                                            className={cn(
                                                'inline-flex items-center gap-0.5 rounded-md px-1.5 py-0.5 text-[11px] font-medium',
                                                isTv
                                                    ? 'bg-violet-500/20 text-violet-300'
                                                    : 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
                                            )}
                                        >
                                            <Bot className="h-3 w-3 shrink-0" aria-hidden />
                                            {tRoom('roleAgent')}
                                        </span>
                                    ) : null}
                                    <span
                                        className={cn(
                                            'inline-flex items-center gap-1 text-[11px]',
                                            isTv ? 'text-zinc-400' : 'text-muted-foreground',
                                        )}
                                    >
                                        <span
                                            className={cn(
                                                'h-1.5 w-1.5 rounded-full',
                                                isOnline
                                                    ? 'bg-emerald-500'
                                                    : 'bg-muted-foreground/40',
                                            )}
                                            aria-hidden
                                        />
                                        {isOnline ? tRoom('online') : tRoom('offline')}
                                    </span>
                                </div>
                            </div>

                            {showActions ? (
                                <ParticipantActions
                                    participant={participant}
                                    hostDeviceId={hostDeviceId}
                                    hostCount={hostCount}
                                    onPromoteRequest={(p) =>
                                        setPendingAction({ kind: 'promote', participant: p })
                                    }
                                    onDemote={demote}
                                    onKickRequest={(p) =>
                                        setPendingAction({ kind: 'kick', participant: p })
                                    }
                                />
                            ) : null}
                        </li>
                    );
                })}
            </ul>

            {!isTv ? (
                <Dialog
                    open={pendingAction !== null}
                    onOpenChange={(open) => {
                        if (!open) setPendingAction(null);
                    }}
                >
                    <DialogContent className="max-w-sm">
                        <DialogHeader>
                            <DialogTitle>
                                {isPromotePending
                                    ? tRoom('confirmPromoteTitle', { name: pendingName })
                                    : tRoom('confirmKickTitle', { name: pendingName })}
                            </DialogTitle>
                            <DialogDescription>
                                {isPromotePending
                                    ? tRoom('confirmPromoteWarning')
                                    : tRoom('confirmKickWarning')}
                            </DialogDescription>
                        </DialogHeader>
                        <DialogFooter className="gap-2 sm:gap-0">
                            <Button
                                type="button"
                                variant="outline"
                                onClick={() => setPendingAction(null)}
                            >
                                {tRoom('cancel')}
                            </Button>
                            <Button
                                type="button"
                                variant={isKickPending ? 'destructive' : 'default'}
                                autoFocus
                                onClick={confirmPendingAction}
                            >
                                {isPromotePending ? tRoom('promote') : tRoom('kick')}
                            </Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            ) : null}
        </>
    );
}

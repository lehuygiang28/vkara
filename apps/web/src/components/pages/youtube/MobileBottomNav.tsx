'use client';

import { Clock3, ListVideo, MoreHorizontal, Search, Settings, SlidersVertical } from 'lucide-react';

import { useI18n, useScopedI18n } from '@/locales/client';
import { prefetchPlayerControlsTabs } from '@/lib/layout-chunk-prefetch';
import { useYouTubeStore } from '@/store/youtubeStore';
import { cn } from '@/lib/utils';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PRIMARY_TABS = ['search', 'queue', 'controls'] as const;

type PrimaryTab = (typeof PRIMARY_TABS)[number];

interface MobileBottomNavProps {
    className?: string;
}

function formatQueueBadge(count: number): string {
    if (count > 99) return '99+';
    return String(count);
}

export function MobileBottomNav({ className }: MobileBottomNavProps) {
    const t = useScopedI18n('youtubePage');
    const tGlobal = useI18n();
    const { currentTab, room, setCurrentTab } = useYouTubeStore();
    const queueCount = room?.videoQueue?.length ?? 0;

    const isPrimary = (tab: string): tab is PrimaryTab => PRIMARY_TABS.includes(tab as PrimaryTab);

    const activePrimary = isPrimary(currentTab) ? currentTab : null;

    return (
        <nav
            data-vkara-mobile-nav
            className={cn(
                'flex items-stretch justify-around border-t bg-background px-safe-offset pb-safe-offset pt-1',
                className,
            )}
            aria-label={t('mainNavigation')}
        >
            <NavItem
                active={activePrimary === 'search'}
                icon={<Search className="h-6 w-6" />}
                label={t('search')}
                onClick={() => setCurrentTab('search')}
            />
            <NavItem
                active={activePrimary === 'queue'}
                icon={<ListVideo className="h-6 w-6" />}
                label={t('queue')}
                badge={queueCount}
                ariaLabel={tGlobal('youtubePage.queueBadgeLabel', { count: queueCount })}
                onClick={() => setCurrentTab('queue')}
            />
            <NavItem
                active={activePrimary === 'controls'}
                icon={<SlidersVertical className="h-6 w-6" />}
                label={t('controls')}
                onClick={() => setCurrentTab('controls')}
                onPrefetch={prefetchPlayerControlsTabs}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[0.65rem] font-medium transition-colors',
                            !isPrimary(currentTab)
                                ? 'text-primary'
                                : 'text-muted-foreground hover:text-foreground',
                        )}
                    >
                        <MoreHorizontal className="h-6 w-6" />
                        <span>{t('more')}</span>
                    </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent side="top" align="center" className="mb-2 w-64">
                    <DropdownMenuItem onClick={() => setCurrentTab('history')}>
                        <Clock3 className="mr-2 h-4 w-4" />
                        {t('history')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCurrentTab('settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        {t('settings')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </nav>
    );
}

function NavIconBadge({ count }: { count: number }) {
    const hasItems = count > 0;

    return (
        <span
            className={cn(
                'pointer-events-none absolute -right-2.5 -top-1.5 flex h-[1.125rem] min-w-[1.125rem] items-center justify-center rounded-full border px-1',
                'text-[10px] font-semibold tabular-nums leading-none',
                hasItems
                    ? 'border-primary/30 bg-primary text-primary-foreground'
                    : 'border-border/80 bg-muted text-muted-foreground',
            )}
            aria-hidden
        >
            {formatQueueBadge(count)}
        </span>
    );
}

function NavItem({
    active,
    icon,
    label,
    badge,
    ariaLabel,
    onClick,
    onPrefetch,
}: {
    active: boolean;
    icon: React.ReactNode;
    label: string;
    badge?: number;
    ariaLabel?: string;
    onClick: () => void;
    onPrefetch?: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            onPointerEnter={onPrefetch}
            onFocus={onPrefetch}
            className={cn(
                'flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[0.65rem] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
            aria-label={ariaLabel ?? label}
        >
            <span className="relative inline-flex">
                {icon}
                {badge != null ? <NavIconBadge count={badge} /> : null}
            </span>
            <span className="max-w-[4.5rem] truncate px-0.5">{label}</span>
        </button>
    );
}

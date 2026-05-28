'use client';

import {
    Clock3,
    ListVideo,
    MoreHorizontal,
    Search,
    Settings,
    SlidersVertical,
} from 'lucide-react';

import { useScopedI18n } from '@/locales/client';
import { useYouTubeStore } from '@/store/youtubeStore';
import { cn } from '@/lib/utils';

import { AppearanceMenuSection } from '@/components/appearance-menu-section';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const PRIMARY_TABS = ['search', 'queue'] as const;

type PrimaryTab = (typeof PRIMARY_TABS)[number];

interface MobileBottomNavProps {
    className?: string;
}

export function MobileBottomNav({ className }: MobileBottomNavProps) {
    const t = useScopedI18n('youtubePage');
    const { currentTab, room, setCurrentTab } = useYouTubeStore();

    const isPrimary = (tab: string): tab is PrimaryTab =>
        PRIMARY_TABS.includes(tab as PrimaryTab);

    const activePrimary = isPrimary(currentTab) ? currentTab : null;

    return (
        <nav
            className={cn(
                'flex items-stretch justify-around border-t bg-background px-safe pb-safe-offset pt-1',
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
                label={`${t('queue')} (${room?.videoQueue.length ?? 0})`}
                shortLabel={t('queue')}
                onClick={() => setCurrentTab('queue')}
            />
            <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <button
                        type="button"
                        className={cn(
                            'flex min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[0.65rem] font-medium transition-colors',
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
                    <AppearanceMenuSection />
                    <DropdownMenuItem onClick={() => setCurrentTab('history')}>
                        <Clock3 className="mr-2 h-4 w-4" />
                        {t('history')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setCurrentTab('controls')}>
                        <SlidersVertical className="mr-2 h-4 w-4" />
                        {t('controls')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => setCurrentTab('settings')}>
                        <Settings className="mr-2 h-4 w-4" />
                        {t('settings')}
                    </DropdownMenuItem>
                </DropdownMenuContent>
            </DropdownMenu>
        </nav>
    );
}

function NavItem({
    active,
    icon,
    label,
    shortLabel,
    onClick,
}: {
    active: boolean;
    icon: React.ReactNode;
    label: string;
    shortLabel?: string;
    onClick: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClick}
            className={cn(
                'flex min-w-[4.5rem] flex-1 flex-col items-center justify-center gap-0.5 rounded-lg py-2 text-[0.65rem] font-medium transition-colors',
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground',
            )}
            aria-current={active ? 'page' : undefined}
        >
            {icon}
            <span className="max-w-[5.5rem] truncate px-0.5 sm:max-w-none">
                <span className="sm:hidden">{shortLabel ?? label}</span>
                <span className="hidden sm:inline">{label}</span>
            </span>
        </button>
    );
}

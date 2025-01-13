'use client';

import * as React from 'react';
import { Moon, Settings, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { useScopedI18n } from '@/locales/client';

export function ThemeToggle() {
    const { setTheme } = useTheme();
    const t = useScopedI18n('appearance');

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <Settings className="h-4 w-4" />
                    <span className="sr-only">{t('toggleTheme')}</span>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
                <DropdownMenuItem
                    onClick={() => setTheme('light')}
                    className="flex items-center justify-between"
                >
                    <span>{t('light')}</span>
                    <Sun className="ml-2 h-4 w-4" />
                </DropdownMenuItem>
                <DropdownMenuItem
                    onClick={() => setTheme('dark')}
                    className="flex items-center justify-between"
                >
                    <span>{t('dark')}</span>
                    <Moon className="ml-2 h-4 w-4" />
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}

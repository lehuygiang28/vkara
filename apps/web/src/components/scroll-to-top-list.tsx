'use client';

import { ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface ScrollToTopButtonProps {
    show: boolean;
    onClick: () => void;
}

export function ScrollToTopListButton({ show, onClick }: ScrollToTopButtonProps) {
    return (
        <Button
            size="sm"
            variant="secondary"
            aria-hidden={!show}
            tabIndex={show ? 0 : -1}
            className={cn(
                'absolute top-2 right-2 z-10 gap-2 rounded-full border bg-background/85 px-4 shadow-lg backdrop-blur-sm transition-opacity duration-200',
                show ? 'opacity-100' : 'pointer-events-none opacity-0',
            )}
            onClick={onClick}
        >
            <ChevronUp className="h-4 w-4" />
            <span>Top</span>
        </Button>
    );
}

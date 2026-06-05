import { cn } from '@/lib/utils';

/** Matches visible knob `[&_[role=slider]]:w-3.5` (Radix positions this width on the track). */
export const SCRUB_THUMB_HIT_REM = 0.875;
export const SCRUB_THUMB_HALF_REM = SCRUB_THUMB_HIT_REM / 2;

/** Thumb center X on the full track — same inset math Radix uses for wide thumbs. */
export function getScrubThumbCenter(ratio: number): string {
    const clamped = Math.min(1, Math.max(0, ratio));
    return `calc(${SCRUB_THUMB_HALF_REM}rem + (100% - ${SCRUB_THUMB_HIT_REM}rem) * ${clamped})`;
}

/** Visual rail thickens via transform; track element stays tall for real hit-testing. */
export const SCRUB_TRACK_EXPANDED_CLASS = '[&>span:first-child]:after:scale-y-[1.5]';

export const SCRUB_SLIDER_CLASS = cn(
    'group/scrub relative h-11 w-full',
    'cursor-pointer touch-none select-none',
    '[&>span:first-child]:relative [&>span:first-child]:h-11 [&>span:first-child]:bg-transparent',
    '[&>span:first-child]:overflow-visible',
    '[&>span:first-child]:after:pointer-events-none',
    '[&>span:first-child]:after:absolute [&>span:first-child]:after:left-0 [&>span:first-child]:after:right-0',
    '[&>span:first-child]:after:top-1/2 [&>span:first-child]:after:h-1 [&>span:first-child]:after:-translate-y-1/2',
    '[&>span:first-child]:after:rounded-full',
    '[&>span:first-child]:after:bg-[linear-gradient(to_right,hsl(var(--primary))_var(--scrub-position,0%),hsl(var(--primary)/0.2)_var(--scrub-position,0%))]',
    '[&>span:first-child]:after:origin-center [&>span:first-child]:after:transition-transform',
    '[&>span:first-child]:after:duration-150 [&>span:first-child]:after:ease-out',
    '[&>span:first-child]:after:content-[""] motion-reduce:[&>span:first-child]:after:transition-none',
    '[&>span:first-child>span]:top-1/2 [&>span:first-child>span]:h-1 [&>span:first-child>span]:-translate-y-1/2',
    '[&>span:first-child>span]:bg-transparent',
    '[&_[role=slider]]:flex [&_[role=slider]]:h-11 [&_[role=slider]]:w-3.5',
    '[&_[role=slider]]:items-center [&_[role=slider]]:justify-center',
    '[&_[role=slider]]:border-0 [&_[role=slider]]:bg-transparent [&_[role=slider]]:shadow-none',
    '[&_[role=slider]]:after:block [&_[role=slider]]:after:size-3.5',
    '[&_[role=slider]]:after:rounded-full [&_[role=slider]]:after:border-2',
    '[&_[role=slider]]:after:border-background [&_[role=slider]]:after:bg-primary',
    '[&_[role=slider]]:after:shadow-md [&_[role=slider]]:after:content-[""]',
    '[&_[role=slider]]:transition-[transform,opacity]',
    '[&_[role=slider]]:opacity-100',
    '[@media(hover:hover)]:[&_[role=slider]]:opacity-0',
    '[@media(hover:hover)]:group-hover/scrub:[&_[role=slider]]:opacity-100',
    '[@media(hover:hover)]:group-focus-within/scrub:[&_[role=slider]]:opacity-100',
    '[@media(hover:hover)]:group-hover/scrub:[&>span:first-child]:after:scale-y-[1.5]',
);

export function getScrubEdgeSliderClasses(isAtStart: boolean, isAtEnd: boolean): string {
    return cn(
        isAtStart && '[&_[role=slider]]:!left-0 [&_[role=slider]]:!translate-x-0',
        isAtEnd &&
            '[&_[role=slider]]:!left-auto [&_[role=slider]]:!right-0 [&_[role=slider]]:!translate-x-0',
    );
}

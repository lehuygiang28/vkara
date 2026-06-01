import { cn } from '@/lib/utils';

type YoutubeCcIconProps = {
    className?: string;
    active?: boolean;
};

export function YoutubeCcIcon({ className, active = false }: YoutubeCcIconProps) {
    return (
        <svg
            viewBox="0 0 24 24"
            className={cn('h-5 w-5 shrink-0', className)}
            aria-hidden
        >
            <rect
                x="3.5"
                y="5.5"
                width="17"
                height="13"
                rx="2"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                className={cn(!active && 'opacity-50')}
            />
            <text
                x="12"
                y="14.25"
                textAnchor="middle"
                dominantBaseline="middle"
                fill="currentColor"
                fontSize="7.25"
                fontWeight="700"
                fontFamily="Roboto, system-ui, sans-serif"
                className={cn(!active && 'opacity-50')}
            >
                CC
            </text>
        </svg>
    );
}

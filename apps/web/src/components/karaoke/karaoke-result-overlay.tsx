'use client';

import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib/utils';
import type { FinalScore } from '@/lib/karaoke-scorer';
import { useI18n } from '@/locales/client';

// --- Counter animation ---

function useCountUp(target: number, duration = 2200): number {
    const [current, setCurrent] = useState(0);

    useEffect(() => {
        setCurrent(0);
        let rafId: number;
        let startTime: number | null = null;

        const step = (timestamp: number) => {
            if (startTime === null) startTime = timestamp;
            const elapsed = timestamp - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease-out cubic
            const eased = 1 - Math.pow(1 - progress, 3);
            setCurrent(Math.round(eased * target));
            if (progress < 1) rafId = requestAnimationFrame(step);
        };

        rafId = requestAnimationFrame(step);
        return () => cancelAnimationFrame(rafId);
    }, [target, duration]);

    return current;
}

// --- Confetti particles ---

interface Particle {
    id: number;
    x: number;      // % from left
    color: string;
    size: number;   // px
    delay: number;  // ms
    duration: number; // ms
    shape: 'circle' | 'rect' | 'star';
}

const COLORS = [
    '#f59e0b', '#ef4444', '#3b82f6', '#10b981',
    '#8b5cf6', '#ec4899', '#f97316', '#06b6d4',
];

function generateParticles(count: number): Particle[] {
    return Array.from({ length: count }, (_, i) => ({
        id: i,
        x: Math.random() * 100,
        color: COLORS[Math.floor(Math.random() * COLORS.length)] ?? '#f59e0b',
        size: 6 + Math.random() * 8,
        delay: Math.random() * 800,
        duration: 1800 + Math.random() * 1200,
        shape: (['circle', 'rect', 'star'] as const)[Math.floor(Math.random() * 3)] ?? 'circle',
    }));
}

function Confetti() {
    const particles = useRef(generateParticles(48)).current;

    return (
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
            {particles.map((p) => (
                <div
                    key={p.id}
                    className="absolute top-0 animate-confetti-fall"
                    style={{
                        left: `${p.x}%`,
                        animationDelay: `${p.delay}ms`,
                        animationDuration: `${p.duration}ms`,
                    }}
                >
                    <div
                        style={{
                            width: p.size,
                            height: p.shape === 'rect' ? p.size * 0.5 : p.size,
                            background: p.color,
                            borderRadius: p.shape === 'circle' ? '50%' : p.shape === 'star' ? '2px' : '2px',
                            transform: p.shape === 'star' ? 'rotate(45deg)' : undefined,
                        }}
                    />
                </div>
            ))}
        </div>
    );
}

// --- Score grade ---

type GradeKey = 'Perfect' | 'Great' | 'Good' | 'Ok' | 'TryHarder';

function getGradeKey(score: number): { key: GradeKey; color: string } {
    if (score >= 95) return { key: 'Perfect', color: 'text-yellow-400' };
    if (score >= 85) return { key: 'Great', color: 'text-yellow-300' };
    if (score >= 75) return { key: 'Good', color: 'text-green-400' };
    if (score >= 65) return { key: 'Ok', color: 'text-blue-400' };
    return { key: 'TryHarder', color: 'text-muted-foreground' };
}

// --- Auto-dismiss progress bar ---

function DismissProgress({ duration, onDone }: { duration: number; onDone: () => void }) {
    useEffect(() => {
        const id = setTimeout(onDone, duration);
        return () => clearTimeout(id);
    }, [duration, onDone]);

    return (
        <div className="h-1 w-full overflow-hidden rounded-full bg-white/20">
            <div
                className="h-full rounded-full bg-white/60"
                style={{
                    animation: `shrink-width ${duration}ms linear forwards`,
                }}
            />
        </div>
    );
}

// --- Main overlay ---

interface KaraokeResultOverlayProps {
    score: FinalScore;
    onDismiss: () => void;
    dismissDuration?: number; // ms, default 5000
}

export function KaraokeResultOverlay({ score, onDismiss, dismissDuration = 5000 }: KaraokeResultOverlayProps) {
    const t = useI18n();
    const displayScore = useCountUp(score.total, 2000);
    const { key, color } = getGradeKey(score.total);

    const label = t(`karaoke.gradeLabel${key}` as Parameters<typeof t>[0]);
    const emoji = t(`karaoke.gradeEmoji${key}` as Parameters<typeof t>[0]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
            <Confetti />

            <div className="relative z-10 flex w-full max-w-xs flex-col items-center gap-5 rounded-2xl bg-background/95 p-6 shadow-2xl">
                {/* Grade emoji */}
                <div className="text-5xl leading-none">{emoji}</div>

                {/* Score counter */}
                <div className="flex flex-col items-center gap-1">
                    <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                        {t('karaoke.score')}
                    </span>
                    <span
                        className={cn(
                            'text-7xl font-black tabular-nums leading-none',
                            score.total >= 85 ? 'text-yellow-400' :
                            score.total >= 70 ? 'text-green-400' : 'text-foreground',
                        )}
                    >
                        {displayScore}
                    </span>
                    <span className={cn('text-lg font-bold', color)}>
                        {label}
                    </span>
                </div>

                {/* Breakdown */}
                <div className="w-full space-y-2 rounded-xl bg-muted/40 p-3 text-sm">
                    <ScoreBar label={t('karaoke.barRhythm')} value={score.coverage} max={40} />
                    <ScoreBar label={t('karaoke.barPitch')} value={score.stability} max={35} />
                    <ScoreBar label={t('karaoke.barNotes')} value={score.variety} max={25} />
                </div>

                {/* Auto-dismiss bar */}
                <div className="w-full space-y-1.5">
                    <DismissProgress duration={dismissDuration} onDone={onDismiss} />
                    <p className="text-center text-xs text-muted-foreground">
                        {t('karaoke.autoDismiss', { sec: String(dismissDuration / 1000) })}
                    </p>
                </div>
            </div>

            {/* Keyframes injected as a style tag */}
            <style>{`
                @keyframes confetti-fall {
                    0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
                    80%  { opacity: 1; }
                    100% { transform: translateY(110vh) rotate(540deg); opacity: 0; }
                }
                .animate-confetti-fall {
                    animation-name: confetti-fall;
                    animation-timing-function: linear;
                    animation-fill-mode: forwards;
                }
                @keyframes shrink-width {
                    from { width: 100%; }
                    to   { width: 0%; }
                }
            `}</style>
        </div>
    );
}

function ScoreBar({
    label,
    value,
    max,
}: {
    label: string;
    value: number;
    max: number;
}) {
    const pct = Math.round((value / max) * 100);
    return (
        <div className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
            <div className="flex-1 overflow-hidden rounded-full bg-muted">
                <div
                    className="h-2 rounded-full bg-primary transition-all duration-1000"
                    style={{ width: `${pct}%` }}
                />
            </div>
            <span className="w-8 text-right text-xs tabular-nums text-muted-foreground">
                {value}/{max}
            </span>
        </div>
    );
}

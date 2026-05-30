'use client';

import type { ReactNode } from 'react';
import { toast as sonner, type ExternalToast } from 'sonner';

export type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info' | 'error';

export interface ToastInput {
    title?: ReactNode;
    description?: ReactNode;
    variant?: ToastVariant;
    duration?: number;
    /** Stable id — replaces an existing toast with the same id (dedupe). */
    id?: string;
    /** Show dismiss control (default: errors/warnings only). */
    closeButton?: boolean;
}

function defaultDuration(variant?: ToastVariant | null): number {
    switch (variant) {
        case 'destructive':
        case 'error':
            return 6500;
        case 'warning':
            return 5500;
        case 'success':
            return 2200;
        case 'info':
            return 2800;
        default:
            return 2600;
    }
}

function shouldShowCloseButton(variant?: ToastVariant | null, explicit?: boolean): boolean {
    if (explicit != null) return explicit;
    return variant === 'error' || variant === 'destructive' || variant === 'warning';
}

function toSonnerOptions(input: ToastInput): ExternalToast {
    const description =
        input.description != null && input.description !== ''
            ? String(input.description)
            : undefined;

    return {
        id: input.id,
        description,
        duration: input.duration ?? defaultDuration(input.variant),
        closeButton: shouldShowCloseButton(input.variant, input.closeButton),
        dismissible: true,
    };
}

/** App toast API — Sonner-backed, deduped by id, no global dismiss. */
function toast(input: ToastInput) {
    const message = input.title != null ? String(input.title) : '';
    const options = toSonnerOptions(input);

    switch (input.variant) {
        case 'success':
            return sonner.success(message, options);
        case 'error':
        case 'destructive':
            return sonner.error(message, options);
        case 'warning':
            return sonner.warning(message, options);
        case 'info':
            return sonner.info(message, options);
        default:
            return message ? sonner(message, options) : sonner(options.description ?? '', options);
    }
}

/** Brief copy-to-clipboard feedback — no description, short duration. */
function toastCopied(title: ReactNode) {
    return toast({
        title,
        variant: 'success',
        duration: 1800,
        id: 'clipboard-copy',
    });
}

/** Compact action feedback — short toast + light haptic on touch devices. */
function toastFeedback(input: {
    title: ReactNode;
    description?: ReactNode;
    variant?: 'success' | 'info';
    id?: string;
}) {
    try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(12);
        }
    } catch {
        // Vibration unavailable or blocked.
    }

    return toast({
        title: input.title,
        description: input.description,
        variant: input.variant ?? 'success',
        duration: 2000,
        id: input.id ?? 'action-feedback',
        closeButton: false,
    });
}

export { toast, toastCopied, toastFeedback };

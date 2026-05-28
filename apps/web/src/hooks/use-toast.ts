'use client';

import type { ReactNode } from 'react';
import { toast as sonner, type ExternalToast } from 'sonner';

export type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info' | 'error';

export interface ToastInput {
    title?: ReactNode;
    description?: ReactNode;
    variant?: ToastVariant;
    duration?: number;
}

function defaultDuration(variant?: ToastVariant | null): number {
    switch (variant) {
        case 'destructive':
        case 'error':
            return 7000;
        case 'warning':
            return 6000;
        case 'success':
            return 2800;
        default:
            return 3500;
    }
}

function toSonnerOptions(input: ToastInput): ExternalToast {
    const description =
        input.description != null && input.description !== ''
            ? String(input.description)
            : undefined;

    return {
        description,
        duration: input.duration ?? defaultDuration(input.variant),
    };
}

/** App toast API — backed by Sonner (single visible toast, auto-dismiss). */
function toast(input: ToastInput) {
    const message = input.title != null ? String(input.title) : '';
    const options = toSonnerOptions(input);

    sonner.dismiss();

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

export { toast };

'use client';

import type { ReactNode } from 'react';
import { toast as sonner, type ExternalToast } from 'sonner';

import { useActionFeedbackStore, type ActionFeedbackVariant } from '@/store/action-feedback-store';

export type ToastVariant = 'default' | 'destructive' | 'success' | 'warning' | 'info' | 'error';

export interface ToastInput {
    title?: ReactNode;
    description?: ReactNode;
    variant?: ToastVariant;
    duration?: number;
    /** Sonner only — dedupe by id. */
    id?: string;
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

function usesSonner(variant?: ToastVariant | null): boolean {
    return variant === 'error' || variant === 'destructive';
}

function toActionFeedbackVariant(variant?: ToastVariant | null): ActionFeedbackVariant {
    switch (variant) {
        case 'info':
            return 'info';
        case 'warning':
            return 'warning';
        default:
            return 'success';
    }
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
        closeButton: true,
        dismissible: true,
    };
}

function vibrateLight() {
    try {
        if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
            navigator.vibrate(12);
        }
    } catch {
        // Vibration unavailable or blocked.
    }
}

function showTransientFeedback(input: ToastInput) {
    const title = input.title != null ? String(input.title) : '';
    const description =
        input.description != null && input.description !== ''
            ? String(input.description)
            : undefined;

    if (!title && !description) {
        return;
    }

    vibrateLight();
    useActionFeedbackStore.getState().show({
        title: title || description!,
        description: title ? description : undefined,
        variant: toActionFeedbackVariant(input.variant),
        duration: input.duration ?? defaultDuration(input.variant),
    });
}

/** Success/info/warning → ActionFeedbackHost; errors → Sonner (top). */
function toast(input: ToastInput) {
    if (!usesSonner(input.variant)) {
        showTransientFeedback(input);
        return;
    }

    const message = input.title != null ? String(input.title) : '';
    return sonner.error(message, toSonnerOptions(input));
}

export { toast };

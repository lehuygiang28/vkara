'use client';

import { useToast } from '@/hooks/use-toast';
import {
    Toast,
    ToastClose,
    ToastDescription,
    ToastProvider,
    ToastTitle,
    ToastViewport,
} from '@/components/ui/toast';

function shouldDismissToastOnPointer(target: EventTarget | null) {
    if (!(target instanceof HTMLElement)) return true;
    return !target.closest('button, a, [role="button"], [data-radix-toast-action]');
}

export function Toaster() {
    const { toasts, dismiss } = useToast();

    return (
        <ToastProvider swipeDirection="down">
            {toasts.map(({ id, title, description, action, duration, onClick, ...props }) => (
                <Toast
                    key={id}
                    duration={duration}
                    {...props}
                    onClick={(event) => {
                        onClick?.(event);
                        if (event.defaultPrevented) return;
                        if (!shouldDismissToastOnPointer(event.target)) return;
                        dismiss(id);
                    }}
                >
                    <div className="min-w-0">
                        {title ? <ToastTitle>{title}</ToastTitle> : null}
                        {description ? (
                            <ToastDescription className={title ? 'mt-0.5' : undefined}>
                                {description}
                            </ToastDescription>
                        ) : null}
                    </div>
                    {action}
                    <ToastClose />
                </Toast>
            ))}
            <ToastViewport />
        </ToastProvider>
    );
}

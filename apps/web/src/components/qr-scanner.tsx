'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import type QrScannerType from 'qr-scanner';
import { QrCode, RefreshCw } from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from '@/hooks/use-toast';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';
import { createQrScanner } from '@/lib/qr-scanner-setup';

interface QRScannerProps {
    onScan: (data: string) => void;
    buttonClassName?: string;
}

function waitForNextPaint(): Promise<void> {
    return new Promise((resolve) => {
        requestAnimationFrame(() => {
            requestAnimationFrame(() => resolve());
        });
    });
}

export function QRScanner({ onScan, buttonClassName = '' }: QRScannerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const scannerRef = useRef<QrScannerType | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const hasScannedRef = useRef(false);
    const onScanRef = useRef(onScan);
    const t = useScopedI18n('qrScanner');

    useEffect(() => {
        onScanRef.current = onScan;
    }, [onScan]);

    const stopScanner = useCallback(() => {
        const scanner = scannerRef.current;
        scannerRef.current = null;
        if (scanner) {
            scanner.destroy();
        }
        setIsScanning(false);
    }, []);

    const startScanner = useCallback(async () => {
        setError(null);
        hasScannedRef.current = false;

        await waitForNextPaint();

        const video = videoRef.current;
        if (!video) {
            setError(t('genericError'));
            return;
        }

        try {
            stopScanner();

            const scanner = createQrScanner(video, (data) => {
                if (hasScannedRef.current) return;
                hasScannedRef.current = true;
                onScanRef.current(data);
                setIsOpen(false);
            });

            scannerRef.current = scanner;
            await scanner.start();
            setIsScanning(true);
        } catch (err) {
            console.error(err);
            stopScanner();
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                setError(t('permissionDenied'));
                toast({
                    title: t('cameraError'),
                    description: t('permissionDenied'),
                    variant: 'error',
                });
            } else {
                setError(t('genericError'));
                toast({
                    title: t('cameraError'),
                    description: t('genericError'),
                    variant: 'error',
                });
            }
        }
    }, [stopScanner, t]);

    useEffect(() => {
        if (!isOpen) {
            stopScanner();
            setError(null);
            return;
        }

        void startScanner();

        return () => {
            stopScanner();
        };
    }, [isOpen, startScanner, stopScanner]);

    const handleOpenChange = (open: boolean) => {
        setIsOpen(open);
        if (!open) {
            setError(null);
        }
    };

    const handleRetry = () => {
        stopScanner();
        void startScanner();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleOpenChange}>
            <DialogTrigger asChild>
                <Button className={cn(buttonClassName)} variant={'scan'}>
                    <QrCode className="h-4 w-4 mr-2" />
                    {t('buttonText')}
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>{t('title')}</DialogTitle>
                </DialogHeader>
                <p className="text-center text-sm text-muted-foreground">{t('scanTip')}</p>
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div className="relative w-full overflow-hidden rounded-lg bg-black">
                        <video
                            ref={videoRef}
                            className="w-full min-h-[min(70vw,320px)] object-cover"
                            playsInline
                            muted
                            autoPlay
                        />
                    </div>
                    {error ? (
                        <p className="text-center text-sm text-muted-foreground">{error}</p>
                    ) : null}
                    {isScanning && !error ? (
                        <Button onClick={() => setIsOpen(false)} variant="secondary">
                            {t('stopScanning')}
                        </Button>
                    ) : null}
                    {error ? (
                        <Button onClick={handleRetry} variant="secondary">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {t('retry')}
                        </Button>
                    ) : null}
                </div>
            </DialogContent>
        </Dialog>
    );
}

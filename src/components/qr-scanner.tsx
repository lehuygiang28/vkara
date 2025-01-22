'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
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

interface QRScannerProps {
    onScan: (data: string) => void;
    buttonClassName?: string;
}

export function QRScanner({ onScan, buttonClassName = '' }: QRScannerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [isScanning, setIsScanning] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const videoRef = useRef<HTMLVideoElement>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const t = useScopedI18n('qrScanner');

    useEffect(() => {
        return () => {
            stopScanner();
        };
    }, []);

    const startScanner = async () => {
        setError(null);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                try {
                    await videoRef.current.play();
                } catch (playError) {
                    if (playError instanceof DOMException && playError.name === 'AbortError') {
                        console.warn(
                            'Video play was aborted. This is expected if the dialog was closed quickly.',
                        );
                        return; // Exit the function early
                    }
                    console.warn(playError);
                }
            }

            const scanner = new Html5Qrcode('qr-reader');
            scannerRef.current = scanner;

            await scanner.start(
                { facingMode: 'environment' },
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                },
                (decodedText) => {
                    onScan(decodedText);
                    handleClose();
                },
                (errorMessage) => {
                    console.log(errorMessage);
                },
            );

            setIsScanning(true);
        } catch (err) {
            console.error(err);
            if (err instanceof DOMException && err.name === 'NotAllowedError') {
                setError(t('permissionDenied'));
                toast({
                    title: t('cameraError'),
                    description: t('permissionDenied'),
                    variant: 'destructive',
                });
            } else {
                setError(t('genericError'));
                toast({
                    title: t('cameraError'),
                    description: t('genericError'),
                    variant: 'destructive',
                });
            }
        }
    };

    const stopScanner = () => {
        if (scannerRef.current) {
            scannerRef.current.stop().catch(console.error);
        }
        if (videoRef.current && videoRef.current.srcObject) {
            const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
            tracks.forEach((track) => track.stop());
        }
        setIsScanning(false);
        setError(null);
    };

    const handleClose = () => {
        stopScanner();
        setIsOpen(false);
    };

    const handleRetry = () => {
        stopScanner();
        startScanner();
    };

    return (
        <Dialog
            open={isOpen}
            onOpenChange={(open) => {
                if (open) {
                    setIsOpen(true);
                    startScanner();
                } else {
                    handleClose();
                }
            }}
        >
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
                <div className="flex flex-col items-center justify-center space-y-4">
                    <div id="qr-reader" className="w-full max-w-sm relative">
                        {error ? (
                            <div className="absolute inset-0 flex items-center justify-center bg-gray-100 text-center p-4">
                                <p>{error}</p>
                            </div>
                        ) : (
                            <video
                                ref={videoRef}
                                className="absolute inset-0 w-full h-full object-cover"
                            />
                        )}
                    </div>
                    {isScanning && !error && (
                        <Button onClick={handleClose} variant="secondary">
                            {t('stopScanning')}
                        </Button>
                    )}
                    {error && (
                        <Button onClick={handleRetry} variant="secondary">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            {t('retry')}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { QrCode } from 'lucide-react';

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
    const videoRef = useRef<HTMLVideoElement>(null);
    const scannerRef = useRef<Html5Qrcode | null>(null);
    const t = useScopedI18n('qrScanner');

    useEffect(() => {
        return () => {
            if (scannerRef.current) {
                scannerRef.current.stop().catch(console.error);
            }
        };
    }, []);

    const startScanner = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'environment' },
            });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                videoRef.current.play();
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
            toast({
                title: t('cameraError'),
                description: t('permissionDenied'),
                variant: 'destructive',
            });
            handleClose();
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
    };

    const handleClose = () => {
        stopScanner();
        setIsOpen(false);
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
                        <video
                            ref={videoRef}
                            className="absolute inset-0 w-full h-full object-cover"
                        />
                    </div>
                    {isScanning && (
                        <Button onClick={handleClose} variant="secondary">
                            {t('stopScanning')}
                        </Button>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

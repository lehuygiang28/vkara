'use client';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { QrCode } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useScopedI18n } from '@/locales/client';
import { cn } from '@/lib/utils';

const QRScannerDialog = dynamic(
    () => import('./qr-scanner-dialog').then((mod) => mod.QRScannerDialog),
    { ssr: false },
);

interface QRScannerProps {
    onScan: (data: string) => void;
    buttonClassName?: string;
}

export function QRScanner({ onScan, buttonClassName = '' }: QRScannerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const t = useScopedI18n('qrScanner');

    return (
        <>
            <Button
                type="button"
                className={cn(buttonClassName)}
                variant="scan"
                onClick={() => setIsOpen(true)}
            >
                <QrCode className="h-4 w-4 mr-2" />
                {t('buttonText')}
            </Button>
            {isOpen ? (
                <QRScannerDialog
                    open={isOpen}
                    onOpenChangeAction={setIsOpen}
                    onScanAction={onScan}
                />
            ) : null}
        </>
    );
}

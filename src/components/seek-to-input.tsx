import React, { useState } from 'react';
import { Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useScopedI18n } from '@/locales/client';

interface SeekToInputProps {
    onSeek: (seconds: number) => void;
    disabled: boolean;
}

export function SeekToInput({ onSeek, disabled }: SeekToInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    const t = useScopedI18n('seekToInput');

    const handleSeek = () => {
        const seconds = convertToSeconds(inputValue);
        if (seconds !== null) {
            onSeek(seconds);
            setInputValue('');
            setError(null);
            setOpen(false); // Close the popover after successful seek
        } else {
            setError(t('error.invalidInput'));
        }
    };

    const convertToSeconds = (input: string): number | null => {
        input = input.trim();

        if (/^\d+$/.test(input)) {
            return parseInt(input, 10);
        }

        const parts = input.split(':').map((part) => parseInt(part, 10));

        if (parts.length === 2) {
            if (parts.every((part) => !isNaN(part))) {
                return parts[0] * 60 + parts[1];
            }
        } else if (parts.length === 3) {
            if (parts.every((part) => !isNaN(part))) {
                return parts[0] * 3600 + parts[1] * 60 + parts[2];
            }
        }

        return null;
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm" disabled={disabled}>
                    <Clock className="h-4 w-4" />
                    <span className="hidden sm:inline">{t('button.seek')}</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">{t('title')}</h4>
                        <p className="text-sm text-muted-foreground">{t('description')}</p>
                    </div>
                    <div className="grid gap-2">
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="time">{t('label.time')}</Label>
                            <Input
                                id="time"
                                value={inputValue}
                                onChange={(e) => {
                                    setInputValue(e.target.value);
                                    setError(null);
                                }}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                        handleSeek();
                                    }
                                }}
                                className="col-span-2 h-8"
                                placeholder={t('placeholder')}
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button onClick={handleSeek}>{t('button.seek')}</Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

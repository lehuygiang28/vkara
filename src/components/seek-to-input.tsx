import React, { useState } from 'react';
import { Clock } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

interface SeekToInputProps {
    onSeek: (seconds: number) => void;
    disabled: boolean;
}

export function SeekToInput({ onSeek, disabled }: SeekToInputProps) {
    const [inputValue, setInputValue] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [open, setOpen] = useState(false);

    const handleSeek = () => {
        const seconds = convertToSeconds(inputValue);
        if (seconds !== null) {
            onSeek(seconds);
            setInputValue('');
            setError(null);
            setOpen(false); // Close the popover after successful seek
        } else {
            setError('Invalid input format');
        }
    };

    const convertToSeconds = (input: string): number | null => {
        // Remove any whitespace
        input = input.trim();

        // Check if input is just a number of seconds
        if (/^\d+$/.test(input)) {
            return parseInt(input, 10);
        }

        // Check for MM:SS or HH:MM:SS format
        const parts = input.split(':').map((part) => parseInt(part, 10));

        if (parts.length === 2) {
            // MM:SS format
            if (parts.every((part) => !isNaN(part))) {
                return parts[0] * 60 + parts[1];
            }
        } else if (parts.length === 3) {
            // HH:MM:SS format
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
                    <span className="hidden sm:inline">Seek To</span>
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
                <div className="grid gap-4">
                    <div className="space-y-2">
                        <h4 className="font-medium leading-none">Seek to specific time</h4>
                        <p className="text-sm text-muted-foreground">
                            Enter time in seconds, MM:SS, or HH:MM:SS format
                        </p>
                    </div>
                    <div className="grid gap-2">
                        <div className="grid grid-cols-3 items-center gap-4">
                            <Label htmlFor="time">Time</Label>
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
                                placeholder="e.g., 120, 2:00, or 1:02:00"
                            />
                        </div>
                        {error && <p className="text-sm text-red-500">{error}</p>}
                        <Button onClick={handleSeek}>Seek</Button>
                    </div>
                </div>
            </PopoverContent>
        </Popover>
    );
}

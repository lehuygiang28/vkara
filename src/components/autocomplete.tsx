import { cn } from '@/lib/utils';
import { Command as CommandPrimitive } from 'cmdk';
import { Check, Search, Loader2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import { Popover, PopoverAnchor, PopoverContent } from '@/components/ui/popover';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

type Props<T extends string> = {
    selectedValue: T;
    onSelectedValueChange: (value: T) => void;
    searchValue: string;
    onSearchValueChange: (value: string) => void;
    onSearch: (value: string) => void;
    items: { value: T; label: string }[];
    isLoading?: boolean;
    emptyMessage?: string;
    placeholder?: string;
    classNames?: string;
    showCheck?: boolean;
};

export function AutoComplete<T extends string>({
    selectedValue,
    onSelectedValueChange,
    searchValue,
    onSearchValueChange,
    onSearch,
    items,
    isLoading,
    emptyMessage = 'No items.',
    placeholder = 'Search...',
    classNames = '',
    showCheck = true,
}: Props<T>) {
    const [open, setOpen] = useState(false);

    const labels = useMemo(
        () =>
            items.reduce((acc, item) => {
                acc[item.value] = item.label;
                return acc;
            }, {} as Record<string, string>),
        [items],
    );

    const reset = () => {
        onSelectedValueChange('' as T);
        // Remove this line to prevent clearing the search value
        // onSearchValueChange('');
    };

    const onInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (!e.relatedTarget?.hasAttribute('cmdk-list') && labels[selectedValue] !== searchValue) {
            // Only reset the selected value, not the search value
            onSelectedValueChange('' as T);
        }
    };

    const onSelectItem = (inputValue: string) => {
        if (inputValue === selectedValue) {
            reset();
        } else {
            onSelectedValueChange(inputValue as T);
            onSearchValueChange(labels[inputValue] ?? inputValue);
        }
        setOpen(false);
        onSearch(inputValue);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            onSearch(searchValue);
            setOpen(false);
        }
    };

    return (
        <div className={cn('flex items-center', classNames)}>
            <Popover open={open} onOpenChange={setOpen}>
                <Command shouldFilter={false}>
                    <div className="relative">
                        <PopoverAnchor asChild>
                            <CommandPrimitive.Input
                                asChild
                                value={searchValue}
                                onValueChange={onSearchValueChange}
                                onMouseDown={() => setOpen((open) => !!searchValue || !open)}
                                onFocus={() => setOpen(true)}
                                onBlur={onInputBlur}
                                onKeyDown={handleKeyDown}
                            >
                                <Input
                                    placeholder={placeholder}
                                    className="pr-10" // Add padding for the icon
                                />
                            </CommandPrimitive.Input>
                        </PopoverAnchor>
                        <Button
                            className="absolute right-0 top-0 h-full px-3 flex items-center justify-center"
                            onClick={() => onSearch(searchValue)}
                            type="button"
                            aria-label="Search"
                            size="sm"
                            variant="ghost"
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                            ) : (
                                <Search className="h-4 w-4 text-muted-foreground" />
                            )}
                        </Button>
                    </div>
                    {!open && <CommandList aria-hidden="true" className="hidden" />}
                    <PopoverContent
                        asChild
                        onOpenAutoFocus={(e) => e.preventDefault()}
                        onInteractOutside={(e) => {
                            if (
                                e.target instanceof Element &&
                                e.target.hasAttribute('cmdk-input')
                            ) {
                                e.preventDefault();
                            }
                        }}
                        className="w-[--radix-popover-trigger-width] p-0"
                    >
                        <CommandList>
                            {isLoading && (
                                <CommandPrimitive.Loading>
                                    <div className="p-1">
                                        <Skeleton className="h-6 w-full" />
                                    </div>
                                </CommandPrimitive.Loading>
                            )}
                            {items.length > 0 && !isLoading ? (
                                <CommandGroup>
                                    {items.map((option) => (
                                        <CommandItem
                                            key={option.value}
                                            value={option.value}
                                            onMouseDown={(e) => e.preventDefault()}
                                            onSelect={onSelectItem}
                                        >
                                            {showCheck && (
                                                <Check
                                                    className={cn(
                                                        'mr-2 h-4 w-4',
                                                        selectedValue === option.value
                                                            ? 'opacity-100'
                                                            : 'opacity-0',
                                                    )}
                                                />
                                            )}
                                            {option.label}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            ) : null}
                            {!isLoading ? (
                                <CommandEmpty>{emptyMessage ?? 'No items.'}</CommandEmpty>
                            ) : null}
                        </CommandList>
                    </PopoverContent>
                </Command>
            </Popover>
        </div>
    );
}

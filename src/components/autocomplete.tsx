import { cn } from '@/lib/utils';
import { Command as CommandPrimitive } from 'cmdk';
import { Check, Search, Loader2, X } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';
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
    isLoadingSuggestions?: boolean;
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
    items = [],
    isLoading,
    isLoadingSuggestions,
    emptyMessage = 'No items.',
    placeholder = 'Search...',
    classNames = '',
    showCheck = true,
}: Props<T>) {
    const [open, setOpen] = useState(false);

    const labels = useMemo(
        () =>
            (items || []).reduce((acc, item) => {
                acc[item.value] = item.label;
                return acc;
            }, {} as Record<string, string>),
        [items],
    );

    const onInputBlur = (e: React.FocusEvent<HTMLInputElement>) => {
        if (!e.relatedTarget?.hasAttribute('cmdk-list')) {
            setOpen(false);
        }
    };

    const onSelectItem = (inputValue: string) => {
        onSelectedValueChange(inputValue as T);
        onSearchValueChange(labels[inputValue] ?? inputValue);
        setOpen(false);
        onSearch(inputValue);
    };

    const clearInput = useCallback(() => {
        onSearchValueChange('');
        onSelectedValueChange('' as T);
        setOpen(false);
    }, [onSearchValueChange, onSelectedValueChange]);

    return (
        <div className={cn('flex items-center', classNames)}>
            <Popover open={open} onOpenChange={setOpen}>
                <Command shouldFilter={false} className="w-full">
                    <div className="relative">
                        <PopoverAnchor asChild>
                            <CommandPrimitive.Input
                                asChild
                                value={searchValue}
                                onValueChange={onSearchValueChange}
                                onMouseDown={() => setOpen((open) => !!searchValue || !open)}
                                onFocus={() => setOpen(true)}
                                onBlur={onInputBlur}
                            >
                                <Input
                                    className="pr-20"
                                    placeholder={placeholder}
                                    value={searchValue}
                                    onChange={(e) => onSearchValueChange(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === 'Enter') {
                                            setOpen(false);
                                            e.currentTarget.blur();
                                            onSearch(searchValue);
                                        }
                                    }}
                                />
                            </CommandPrimitive.Input>
                        </PopoverAnchor>
                        <div className="absolute right-0 top-0 h-full flex items-center">
                            {searchValue && (
                                <Button
                                    className="px-2 h-full flex items-center justify-center"
                                    onClick={clearInput}
                                    type="button"
                                    aria-label="Clear search"
                                    size="sm"
                                    variant="ghost"
                                >
                                    <X className="h-4 w-4 text-muted-foreground" />
                                </Button>
                            )}
                            <Button
                                className="px-3 h-full flex items-center justify-center"
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
                            {isLoadingSuggestions && (
                                <CommandPrimitive.Loading>
                                    <div className="p-1">
                                        <Skeleton className="h-6 w-full" />
                                    </div>
                                </CommandPrimitive.Loading>
                            )}
                            {items.length > 0 && !isLoadingSuggestions ? (
                                <CommandGroup>
                                    <CommandItem value="-" className="hidden" />
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
                            {!isLoadingSuggestions ? (
                                <CommandEmpty>{emptyMessage}</CommandEmpty>
                            ) : null}
                        </CommandList>
                    </PopoverContent>
                </Command>
            </Popover>
        </div>
    );
}

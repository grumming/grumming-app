import { useState, useMemo } from 'react';
import { Check, ChevronsUpDown, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  disabled?: boolean;
  error?: boolean;
  className?: string;
}

export function SearchableSelect({
  value,
  onValueChange,
  options,
  placeholder,
  searchPlaceholder = "Search...",
  emptyMessage = "No results found.",
  disabled = false,
  error = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filteredOptions = useMemo(() => {
    if (!search) return options;
    const lower = search.toLowerCase();
    return options.filter(option => option.toLowerCase().includes(lower));
  }, [options, search]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          className={cn(
            "w-full justify-between font-normal",
            !value && "text-muted-foreground",
            error && "border-destructive",
            className
          )}
        >
          {value || placeholder}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[var(--radix-popover-trigger-width)] p-0" align="start">
        <Command shouldFilter={false}>
          <div className="flex items-center border-b px-3">
            <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
            <input
              placeholder={searchPlaceholder}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground"
            />
          </div>
          <CommandList>
            <CommandEmpty>{emptyMessage}</CommandEmpty>
            <CommandGroup className="max-h-60 overflow-auto">
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => {
                    onValueChange(option);
                    setOpen(false);
                    setSearch('');
                  }}
                >
                  <Check
                    className={cn(
                      "mr-2 h-4 w-4",
                      value === option ? "opacity-100" : "opacity-0"
                    )}
                  />
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

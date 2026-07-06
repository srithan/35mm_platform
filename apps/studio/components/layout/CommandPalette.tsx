'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { useUiStore } from '@/stores/uiStore';
import { useDebounceValue } from '@/components/layout/useDebounced';
import { useFilms } from '@/hooks/useFilms';
import { adminNavGroups } from '@/lib/data/admin';
import { useStudioTheme } from '@/components/providers/ThemeProvider';

export function CommandPalette() {
  const router = useRouter();
  const open = useUiStore((state) => state.commandOpen);
  const setOpen = useUiStore((state) => state.setCommandOpen);
  const { setTheme } = useStudioTheme();
  const [input, setInput] = useState('');
  const debounced = useDebounceValue(input, 150);

  const filmSearch = useFilms(
    {
      search: '',
      types: [],
      genres: [],
      yearMin: null,
      yearMax: null,
      hasPoster: null,
    },
    0,
    250,
  );
  const films = filmSearch.data?.items || [];
  const navItems = adminNavGroups.flatMap((group) => group.items);

  const matches = useMemo(
    () =>
      debounced
        ? films
            .filter((film) => film.title.toLowerCase().includes(debounced.toLowerCase()))
            .slice(0, 20)
        : [],
    [films, debounced],
  );

  const close = useCallback(() => setOpen(false), [setOpen]);

  useEffect(() => {
    const handle = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(!open);
      }
    };

    window.addEventListener('keydown', handle);
    return () => window.removeEventListener('keydown', handle);
  }, [open, setOpen]);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} title="Command palette">
      <div className="p-3">
        <CommandInput value={input} onValueChange={setInput} placeholder="Search admin command, page, or film" className="h-10 w-full" />
        <CommandList className="mt-3 max-h-72 overflow-auto">
          <CommandEmpty>No results</CommandEmpty>
          <CommandGroup heading="Navigation">
            {navItems.map((item) => (
              <CommandItem key={item.href} onSelect={() => { close(); router.push(item.href); }}>
                {item.label}
              </CommandItem>
            ))}
            <CommandItem onSelect={() => { close(); router.push('/films/new'); }}>
              Add new film
            </CommandItem>
            <CommandItem onSelect={() => { close(); router.push('/shelves/new'); }}>
              New shelf
            </CommandItem>
            <CommandItem onSelect={() => { close(); setTheme('light'); }}>
              Theme: Light
            </CommandItem>
            <CommandItem onSelect={() => { close(); setTheme('dark'); }}>
              Theme: Dark
            </CommandItem>
            <CommandItem onSelect={() => { close(); setTheme('system'); }}>
              Theme: System
            </CommandItem>
          </CommandGroup>
          <CommandGroup heading="Films">
            {matches.map((film) => (
              <CommandItem
                key={film.id}
                onSelect={() => {
                  close();
                  router.push(`/films/${film.id}`);
                }}
              >
                {film.title}
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </div>
    </CommandDialog>
  );
}

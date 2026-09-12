"use client";

import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { ChevronDown } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import {
  filmographyRoleLabel,
  type FilmographyFilters as FilmographyFilterValues,
  type FilmographyGenreOption,
} from "@/features/person/lib/filmography";
import { ROUTES } from "@/lib/constants/routes";
import { cn } from "@/lib/utils/cn";

type FilterOption = {
  label: string;
  value: string;
};

type DepartmentOption = {
  slug: string;
  label: string;
  count: number;
};

type QueryFilterKey = "media" | "decade" | "genre" | "sort";

type DestinationInput = {
  currentQuery: string;
  department: string;
  filterKey?: QueryFilterKey;
  personSlug: string;
  value: string;
};

const DEFAULT_QUERY_VALUES: Record<QueryFilterKey, string> = {
  media: "all",
  decade: "all",
  genre: "all",
  sort: "newest",
};

const FORMAT_OPTIONS: FilterOption[] = [
  { value: "all", label: "All titles" },
  { value: "movie", label: "Films" },
  { value: "tv", label: "TV shows" },
];

const SORT_OPTIONS: FilterOption[] = [
  { value: "newest", label: "Newest first" },
  { value: "oldest", label: "Oldest first" },
  { value: "rating", label: "Highest rated" },
  { value: "popularity", label: "Popularity" },
];

function departmentDisplayName(option: DepartmentOption): string {
  return filmographyRoleLabel(option.label);
}

function destinationWithQuery(pathname: string, query: URLSearchParams): string {
  const value = query.toString();
  return pathname + (value ? "?" + value : "");
}

export function buildFilmographyFilterDestination({
  currentQuery,
  department,
  filterKey,
  personSlug,
  value,
}: DestinationInput): string {
  const next = new URLSearchParams(currentQuery);
  next.delete("department");
  const nextDepartment = filterKey ? department : value;

  if (filterKey) {
    if (value === DEFAULT_QUERY_VALUES[filterKey]) next.delete(filterKey);
    else next.set(filterKey, value);
  }

  return destinationWithQuery(
    ROUTES.PERSON_ROLE(personSlug, nextDepartment),
    next,
  );
}

function FilterMenu({
  align = "start",
  ariaLabel,
  disabled,
  onValueChange,
  options,
  triggerLabel,
  value,
}: {
  align?: "start" | "end";
  ariaLabel: string;
  disabled: boolean;
  onValueChange: (value: string) => void;
  options: FilterOption[];
  triggerLabel: string;
  value: string;
}) {
  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger
        disabled={disabled}
        aria-label={ariaLabel}
        className={cn(
          "group relative flex h-12 shrink-0 items-center gap-1.5 px-1",
          "font-sans text-[12px] font-medium uppercase tracking-[0.08em] text-fg-muted",
          "outline-none transition-colors duration-150 hover:text-fg focus-visible:text-fg",
          "data-[state=open]:text-fg disabled:cursor-wait disabled:opacity-50",
          "after:absolute after:inset-x-1 after:bottom-[-1px] after:h-0.5 after:origin-left after:scale-x-0 after:bg-film-red after:transition-transform after:duration-150",
          "data-[state=open]:after:scale-x-100 motion-reduce:transition-none motion-reduce:after:transition-none",
        )}
      >
        <span>{triggerLabel}</span>
        <ChevronDown
          aria-hidden="true"
          className="h-3.5 w-3.5 transition-transform duration-150 group-data-[state=open]:rotate-180 motion-reduce:transition-none"
          strokeWidth={2}
        />
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content
          align={align}
          sideOffset={3}
          collisionPadding={12}
          aria-label={ariaLabel + " options"}
          className={cn(
            "z-50 min-w-[190px]",
            "rounded-sm border border-border-strong bg-elevated p-1 text-fg",
          )}
        >
          <DropdownMenu.RadioGroup value={value} onValueChange={onValueChange}>
            {options.map(function (option) {
              return (
                <DropdownMenu.RadioItem
                  key={option.value}
                  value={option.value}
                  className={cn(
                    "relative flex min-h-10 cursor-default select-none items-center rounded-[2px] py-1.5 pl-7 pr-3 md:min-h-8 md:py-1",
                    "font-sans text-[13px] font-medium text-fg-muted outline-none",
                    "transition-colors duration-150 focus:bg-hover focus:text-fg data-[state=checked]:text-fg",
                    "motion-reduce:transition-none",
                  )}
                >
                  <DropdownMenu.ItemIndicator className="absolute left-3 flex items-center">
                    <span className="h-1.5 w-1.5 rounded-full bg-film-red" />
                  </DropdownMenu.ItemIndicator>
                  {option.label}
                </DropdownMenu.RadioItem>
              );
            })}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}

export function FilmographyFilters(props: {
  decades: string[];
  department: string;
  departments: DepartmentOption[];
  filters: FilmographyFilterValues;
  genres: FilmographyGenreOption[];
  personSlug: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentDepartment =
    props.departments.find((option) => option.slug === props.department) ||
    props.departments[0];

  function replace(destination: string) {
    startTransition(function () {
      router.replace(destination, { scroll: false });
    });
  }

  function changeDepartment(value: string) {
    replace(
      buildFilmographyFilterDestination({
        currentQuery: searchParams.toString(),
        department: props.department,
        personSlug: props.personSlug,
        value,
      }),
    );
  }

  function changeFilter(key: QueryFilterKey, value: string) {
    replace(
      buildFilmographyFilterDestination({
        currentQuery: searchParams.toString(),
        department: props.department,
        filterKey: key,
        personSlug: props.personSlug,
        value,
      }),
    );
  }

  const departmentOptions = props.departments.map(function (option) {
    return { value: option.slug, label: departmentDisplayName(option) };
  });
  const decadeOptions = [
    { value: "all", label: "Any decade" },
    ...props.decades.map((decade) => ({ value: decade, label: decade + "s" })),
  ];
  const genreOptions = [
    { value: "all", label: "Any genre" },
    ...props.genres.map((genre) => ({
      value: String(genre.id),
      label: genre.name,
    })),
  ];
  const selectedFormat =
    FORMAT_OPTIONS.find((option) => option.value === props.filters.media) ||
    FORMAT_OPTIONS[0];
  const selectedDecade =
    decadeOptions.find((option) => option.value === props.filters.decade) ||
    decadeOptions[0];
  const selectedGenre =
    genreOptions.find((option) => option.value === props.filters.genre) ||
    genreOptions[0];
  const selectedSort =
    SORT_OPTIONS.find((option) => option.value === props.filters.sort) ||
    SORT_OPTIONS[0];

  if (!currentDepartment) return null;

  return (
    <div
      className="scrollbar-hide -mx-1 overflow-x-auto border-y border-border px-1"
      aria-label="Filmography filters"
    >
      <div className="flex min-w-max items-center justify-between gap-10 sm:gap-14">
        <FilterMenu
          ariaLabel="Role"
          disabled={isPending}
          value={currentDepartment.slug}
          triggerLabel={departmentDisplayName(currentDepartment)}
          options={departmentOptions}
          onValueChange={changeDepartment}
        />
        <div className="flex items-center gap-7 sm:gap-10">
          <FilterMenu
            ariaLabel="Format"
            disabled={isPending}
            value={props.filters.media}
            triggerLabel={selectedFormat.label}
            options={FORMAT_OPTIONS}
            onValueChange={(value) => changeFilter("media", value)}
          />
          {props.decades.length > 0 ? (
            <FilterMenu
              ariaLabel="Decade"
              disabled={isPending}
              value={props.filters.decade}
              triggerLabel={selectedDecade.label}
              options={decadeOptions}
              onValueChange={(value) => changeFilter("decade", value)}
            />
          ) : null}
          {props.genres.length > 0 ? (
            <FilterMenu
              ariaLabel="Genre"
              disabled={isPending}
              value={props.filters.genre}
              triggerLabel={selectedGenre.label}
              options={genreOptions}
              onValueChange={(value) => changeFilter("genre", value)}
            />
          ) : null}
          <FilterMenu
            align="end"
            ariaLabel="Sort filmography"
            disabled={isPending}
            value={props.filters.sort}
            triggerLabel={"Sort: " + selectedSort.label}
            options={SORT_OPTIONS}
            onValueChange={(value) => changeFilter("sort", value)}
          />
        </div>
      </div>
    </div>
  );
}

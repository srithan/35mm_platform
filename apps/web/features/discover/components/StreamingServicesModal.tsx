"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent,
} from "react";
import { Reorder, useDragControls, useReducedMotion } from "framer-motion";
import { Check, GripVertical, Plus, Search, X } from "lucide-react";
import {
  STREAMING_SERVICES,
  type StreamingServiceId,
} from "@35mm/types/streaming-services";
import { Dialog } from "@/components/Dialog/Dialog";
import { TMDB_IMAGE_BASE } from "@/lib/tmdb/constants";

interface StreamingServicesModalProps {
  open: boolean;
  selectedServiceIds: readonly StreamingServiceId[];
  saving: boolean;
  onClose: () => void;
  onSave: (serviceIds: StreamingServiceId[]) => Promise<void>;
}

function serviceLogoUrl(path: string): string {
  return `${TMDB_IMAGE_BASE}/w154${path}`;
}

type StreamingService = (typeof STREAMING_SERVICES)[number];

function SortableServiceRow({
  service,
  position,
  onRemove,
  onMove,
}: {
  service: StreamingService;
  position: number;
  onRemove: (serviceId: StreamingServiceId) => void;
  onMove: (serviceId: StreamingServiceId, offset: -1 | 1) => void;
}) {
  const dragControls = useDragControls();
  const reduceMotion = useReducedMotion();

  function handleReorderKey(event: KeyboardEvent<HTMLButtonElement>) {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    onMove(service.id, event.key === "ArrowUp" ? -1 : 1);
  }

  return (
    <Reorder.Item
      as="li"
      value={service.id}
      dragListener={false}
      dragControls={dragControls}
      transition={
        reduceMotion
          ? { duration: 0 }
          : { duration: 0.18, ease: [0.22, 1, 0.36, 1] }
      }
      whileDrag={{
        backgroundColor: "var(--elevated)",
        boxShadow: "0 4px 8px rgba(0,0,0,0.08)",
      }}
      className="flex min-h-16 items-center gap-3 border-b border-border px-1 py-2.5 last:border-b-0"
    >
      <button
        type="button"
        onPointerDown={function (event) {
          dragControls.start(event);
        }}
        onKeyDown={handleReorderKey}
        className="inline-flex h-10 w-8 shrink-0 touch-none cursor-grab items-center justify-center rounded-sm text-fg-muted transition-colors hover:bg-sunken hover:text-fg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/20 active:cursor-grabbing"
        aria-label={`Reorder ${service.label}. Drag or use arrow keys.`}
      >
        <GripVertical className="h-5 w-5" strokeWidth={1.7} aria-hidden />
      </button>
      <span className="w-5 shrink-0 text-center font-mono text-[11px] text-fg-muted">
        {position}
      </span>
      <img
        src={serviceLogoUrl(service.logoPath)}
        alt=""
        className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-black/5"
      />
      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-fg">
        {service.label}
      </span>
      <button
        type="button"
        onClick={function () {
          onRemove(service.id);
        }}
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-sm text-fg-muted transition-colors hover:bg-sunken hover:text-film-red focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-fg/20"
        aria-label={`Remove ${service.label}`}
      >
        <X className="h-4 w-4" strokeWidth={1.8} aria-hidden />
      </button>
    </Reorder.Item>
  );
}

export function StreamingServicesModal({
  open,
  selectedServiceIds,
  saving,
  onClose,
  onSave,
}: StreamingServicesModalProps) {
  const searchRef = useRef<HTMLInputElement | null>(null);
  const wasOpenRef = useRef(false);
  const [query, setQuery] = useState("");
  const [draftIds, setDraftIds] = useState<StreamingServiceId[]>([
    ...selectedServiceIds,
  ]);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(
    function resetDraftWhenOpened() {
      if (open && !wasOpenRef.current) {
        setQuery("");
        setDraftIds([...selectedServiceIds]);
        setSaveError(null);
      }
      wasOpenRef.current = open;
    },
    [open, selectedServiceIds],
  );

  const selectedSet = useMemo(
    function () {
      return new Set(draftIds);
    },
    [draftIds],
  );

  const normalizedQuery = query.trim().toLocaleLowerCase();
  const selectedServices = draftIds.flatMap(function (serviceId) {
    const service = STREAMING_SERVICES.find(function (candidate) {
      return candidate.id === serviceId;
    });
    return service ? [service] : [];
  });
  const availableServices = STREAMING_SERVICES.filter(function (service) {
    return !selectedSet.has(service.id);
  }).filter(function (service) {
    return (
      normalizedQuery.length === 0 ||
      service.label.toLocaleLowerCase().includes(normalizedQuery)
    );
  });

  const unchanged =
    draftIds.length === selectedServiceIds.length &&
    draftIds.every(function (id, index) {
      return id === selectedServiceIds[index];
    });

  function addService(serviceId: StreamingServiceId) {
    setDraftIds(function (current) {
      if (current.includes(serviceId)) return current;
      return [...current, serviceId];
    });
    setSaveError(null);
  }

  function removeService(serviceId: StreamingServiceId) {
    setDraftIds(function (current) {
      return current.filter(function (id) {
        return id !== serviceId;
      });
    });
    setSaveError(null);
  }

  function moveService(serviceId: StreamingServiceId, offset: -1 | 1) {
    setDraftIds(function (current) {
      const currentIndex = current.indexOf(serviceId);
      const nextIndex = currentIndex + offset;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length)
        return current;

      const reordered = [...current];
      reordered.splice(currentIndex, 1);
      reordered.splice(nextIndex, 0, serviceId);
      return reordered;
    });
    setSaveError(null);
  }

  async function saveServices() {
    if (saving || unchanged) return;
    setSaveError(null);
    try {
      await onSave(draftIds);
      onClose();
    } catch {
      setSaveError("Services could not be saved. Try again.");
    }
  }

  return (
    <Dialog
      open={open}
      onClose={function () {
        if (!saving) onClose();
      }}
      title="Edit streaming services"
      description="Choose your services, then drag them into the order you want to see."
      initialFocusRef={searchRef}
      className="max-w-[54rem] rounded-sm bg-bg shadow-[0_10px_30px_rgba(0,0,0,0.18)]"
      headerClassName="px-5 py-4 sm:px-6"
      titleClassName="text-[18px] font-semibold leading-snug tracking-tight text-fg"
      descriptionClassName="max-w-xl text-[13px] text-fg-muted"
      contentClassName="p-0"
      showCloseButton
    >
      <div className="grid min-h-0 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
        <section
          className="min-h-0 border-b border-border px-5 py-5 lg:border-b-0 lg:border-r lg:px-6"
          aria-labelledby="streaming-lineup-heading"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <h3
                id="streaming-lineup-heading"
                className="text-[14px] font-semibold text-fg"
              >
                Your services
              </h3>
              <p className="mt-0.5 text-[12px] text-fg-muted">
                Drag to reorder
              </p>
            </div>
            <span className="font-mono text-[11px] text-fg-muted">
              {draftIds.length} selected
            </span>
          </div>
          {selectedServices.length > 0 ? (
            <Reorder.Group
              as="ol"
              axis="y"
              values={draftIds}
              onReorder={function (nextIds: StreamingServiceId[]) {
                setDraftIds(nextIds);
                setSaveError(null);
              }}
              className="border-y border-border"
            >
              {selectedServices.map(function (service, index) {
                return (
                  <SortableServiceRow
                    key={service.id}
                    service={service}
                    position={index + 1}
                    onRemove={removeService}
                    onMove={moveService}
                  />
                );
              })}
            </Reorder.Group>
          ) : (
            <div className="flex min-h-36 items-center justify-center border-y border-border px-5 text-center">
              <p className="max-w-xs text-[13px] leading-relaxed text-fg-muted">
                Choose services from the list to build your lineup.
              </p>
            </div>
          )}
        </section>

        <section
          className="min-h-0 px-5 py-5 lg:px-6"
          aria-labelledby="available-services-heading"
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <h3
              id="available-services-heading"
              className="text-[14px] font-semibold text-fg"
            >
              Add services
            </h3>
            {query ? (
              <span className="font-mono text-[11px] text-fg-muted">
                {availableServices.length} found
              </span>
            ) : null}
          </div>
          <label className="relative mb-3 block">
            <span className="sr-only">Search services</span>
            <Search
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-muted"
              strokeWidth={1.8}
              aria-hidden
            />
            <input
              ref={searchRef}
              value={query}
              onChange={function (event) {
                setQuery(event.target.value);
              }}
              placeholder="Search services"
              className="h-11 w-full rounded-sm border border-border-strong bg-bg pl-10 pr-4 text-[14px] text-fg outline-none transition-colors placeholder:text-fg-muted focus:border-fg focus-visible:ring-2 focus-visible:ring-fg/10"
            />
          </label>

          {availableServices.length > 0 ? (
            <ul className="grid grid-cols-1 border-y border-border sm:grid-cols-2 lg:grid-cols-1">
              {availableServices.map(function (service) {
                return (
                  <li
                    key={service.id}
                    className="border-b border-border last:border-b-0 sm:odd:border-r lg:odd:border-r-0"
                  >
                    <button
                      type="button"
                      onClick={function () {
                        addService(service.id);
                      }}
                      className="group flex min-h-16 w-full items-center gap-3 px-2 py-2.5 text-left transition-colors hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-fg/20"
                      aria-label={`Add ${service.label}`}
                    >
                      <img
                        src={serviceLogoUrl(service.logoPath)}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-lg object-cover ring-1 ring-black/5"
                      />
                      <span className="min-w-0 flex-1 truncate text-[14px] font-medium text-fg">
                        {service.label}
                      </span>
                      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-fg-muted transition-colors group-hover:bg-fg group-hover:text-bg">
                        <Plus
                          className="h-4 w-4"
                          strokeWidth={1.8}
                          aria-hidden
                        />
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="flex min-h-36 flex-col items-center justify-center border-y border-border px-4 text-center">
              <Search
                className="h-5 w-5 text-fg-muted"
                strokeWidth={1.7}
                aria-hidden
              />
              <p className="mt-2 text-[13px] font-medium text-fg">
                No services found
              </p>
              <p className="mt-1 text-[12px] text-fg-muted">
                Try another service name.
              </p>
            </div>
          )}
        </section>
      </div>

      <footer className="flex flex-col gap-3 border-t border-border bg-elevated px-5 py-4 sm:flex-row sm:items-center sm:px-6">
        {saveError ? (
          <p role="alert" className="text-[12px] text-film-red">
            {saveError}
          </p>
        ) : null}
        <div className="flex gap-2 sm:ml-auto">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="inline-flex h-11 flex-1 items-center justify-center rounded-sm border border-border-strong bg-bg px-6 text-[13px] font-semibold text-fg transition-colors hover:bg-sunken disabled:opacity-50 sm:flex-none"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={function () {
              void saveServices();
            }}
            disabled={saving || unchanged}
            className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-sm bg-film-red px-6 text-[13px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none"
          >
            {saving ? "Saving…" : "Save services"}
            {!saving && !unchanged ? (
              <Check className="h-4 w-4" aria-hidden />
            ) : null}
          </button>
        </div>
      </footer>
    </Dialog>
  );
}

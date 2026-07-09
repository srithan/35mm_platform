import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function slugify(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
    .slice(0, 120)
}

export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

export function randomUlid(): string {
  const encoding = '0123456789ABCDEFGHJKMNPQRSTVWXYZ'
  let time = Date.now()
  let timePart = ''
  for (let i = 0; i < 10; i += 1) {
    timePart = encoding[time % 32] + timePart
    time = Math.floor(time / 32)
  }

  const bytes = new Uint8Array(16)
  if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
    crypto.getRandomValues(bytes)
  } else {
    for (let i = 0; i < bytes.length; i += 1) {
      bytes[i] = Math.floor(Math.random() * 256)
    }
  }

  let randomPart = ''
  for (let i = 0; i < bytes.length; i += 1) {
    randomPart += encoding[bytes[i] % 32]
  }
  return timePart + randomPart
}

export function todayIso(): string {
  return new Date().toISOString()
}

export function formatDateLabel(input?: string): string {
  if (!input) {
    return '—'
  }
  const date = new Date(input)
  if (Number.isNaN(date.getTime())) {
    return input
  }
  return new Intl.DateTimeFormat(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(date)
}

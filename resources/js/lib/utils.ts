import { type ClassValue, clsx } from 'clsx';

/**
 * Merge Tailwind CSS classes with proper conflict resolution.
 * Uses clsx for conditional classes (no twMerge needed — DaisyUI handles specificity).
 */
export function cn(...inputs: ClassValue[]): string {
    return clsx(inputs);
}

export function formatDate(date: string | null, options?: Intl.DateTimeFormatOptions): string {
    if (!date) {
        return '';
    }

    return new Intl.DateTimeFormat('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        ...options,
    }).format(new Date(date));
}

export function truncate(str: string, length: number): string {
    if (str.length <= length) {
        return str;
    }

    return str.slice(0, length) + '...';
}

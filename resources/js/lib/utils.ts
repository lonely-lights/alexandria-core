import { type ClassValue, clsx } from 'clsx';

/**
 * Join conditional class names for Alexandria components.
 */
export function cn(...inputs: ClassValue[]): string {
    return clsx(inputs);
}

export function truncate(str: string, length: number): string {
    if (str.length <= length) {
        return str;
    }

    return str.slice(0, length) + '...';
}

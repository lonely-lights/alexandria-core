export function parseDurationInput(
    text: string,
): { valid: true; seconds: number | null } | { valid: false } {
    const value = text.trim();

    if (value === '') {
        return { valid: true, seconds: null };
    }

    if (!/^\d+:\d{2}(?::\d{2})?$/.test(value)) {
        return { valid: false };
    }

    const parts = value.split(':').map(Number);

    if (parts.at(-1)! > 59 || (parts.length === 3 && parts[1] > 59)) {
        return { valid: false };
    }

    const seconds = parts.reduce((sum, p) => sum * 60 + p, 0);

    return Number.isSafeInteger(seconds) && seconds <= 86400
        ? { valid: true, seconds }
        : { valid: false };
}
export function formatDuration(seconds: number): string {
    const total = Math.max(0, Math.round(seconds));
    const s = String(total % 60).padStart(2, '0');
    const m = Math.floor(total / 60);

    return m < 60
        ? m + ':' + s
        : Math.floor(m / 60) + ':' + String(m % 60).padStart(2, '0') + ':' + s;
}

/**
 * Universal calendar conversion engine.
 *
 * Supports any base, any unit hierarchy, any epoch.
 * Uses BigInt for arbitrary precision with large numbers.
 *
 * VENDORED COPY of packages/stardate/resources/js/stardate.ts (the
 * lonely-lights/stardate sibling package). Prior to this, core's
 * shim re-exported from the npm-style alias `@lonely-lights/stardate`,
 * which alexandria-app pinned to a workspace-relative path. That path
 * doesn't exist in CI (only alexandria-app + alexandria-core get
 * checked out), so consumers had to drop the alias and the import
 * failed at build time. Vendoring keeps the surface stable (the named
 * exports below match what StardateInput.tsx + AttributesTab.tsx
 * import) while removing the workspace-path dependency. When Stardate
 * ships as a real Composer + npm package per ADR-007, this file
 * becomes a one-line re-export again.
 */

/* ── Configuration ── */

export interface CalendarConfig {
    name: string;
    slug: string;
    base: number;
    multiplier: [bigint, bigint]; // [numerator, denominator] for integer math
    syncStardate?: bigint; // exact local-second count at sync point
    syncEarthDate?: string; // Earth datetime at sync point
    epochOffsetYears: bigint; // fallback: years before 0 CE
    epochDate?: string; // fallback: specific Earth date as year 0
    digits: string;
    units: [string, number, bigint][]; // [name, digitCount, localSecondsPerUnit]
    timeSplitAfter: number;
    unitSeparator: string;
    dateTimeSeparator: string;
    shorthandSkip: number;
    formatTemplate?: string; // e.g., 'MY {year}.{sol}  {hour}:{minute}:{second}'
    shorthandTemplate?: string;
    leapRule?: {
        yearUnit: string;
        subUnit: string;
        baseCount: number;
        callback: (yearNum: number) => boolean;
    };
}

const SECONDS_PER_YEAR = 31556952n;

/* ── Presets ── */

export const ISS: CalendarConfig = {
    name: 'Intergalactic Stardate Standard',
    slug: 'iss',
    base: 12,
    multiplier: [230486091134n, 100000000000n],
    syncStardate: 1001952258151589388n,
    syncEarthDate: '3900-07-20T12:00:00',
    epochOffsetYears: 0n,
    digits: '0123456789XE',
    units: [
        ['eon', 1, 184884258895036416n],
        ['era', 1, 15407021574586368n],
        ['epoch', 2, 106993205379072n],
        ['millennium', 3, 61917364224n],
        ['year', 2, 429981696n],
        ['day', 3, 248832n],
        ['hour', 1, 20736n],
        ['minute', 2, 144n],
        ['second', 2, 1n],
    ],
    timeSplitAfter: 5,
    unitSeparator: '·',
    dateTimeSeparator: '  ',
    shorthandSkip: 4,
};

export const MCT: CalendarConfig = {
    name: 'Mars Coordinated Time',
    slug: 'mct',
    base: 10,
    // Mars second = 1.027491 Earth seconds (sol ÷ 86400)
    // Preserves 24h/60m/60s structure with a slightly stretched second
    multiplier: [97324429770n, 100000000000n],  // Mars seconds per Earth second
    epochOffsetYears: 0n,
    epochDate: '1971-12-02T13:52:00',
    digits: '0123456789',
    units: [
        ['year', 4, 57715200n],     // Base year = 668 sols × 86400 Mars seconds (leap years use 669)
        ['sol', 3, 86400n],         // 1 sol = 24 Mars hours
        ['hour', 2, 3600n],         // 1 Mars hour = 60 Mars minutes
        ['minute', 2, 60n],         // 1 Mars minute = 60 Mars seconds
        ['second', 2, 1n],          // 1 Mars second ≈ 1.0275 Earth seconds
    ],
    timeSplitAfter: 1,
    unitSeparator: '.',
    dateTimeSeparator: ' ',
    shorthandSkip: 0,
    formatTemplate: 'MY {year} Sol {sol}  {hour}:{minute}:{second}',
    shorthandTemplate: 'Sol {sol}  {hour}:{minute}:{second}',
    leapRule: {
        yearUnit: 'year',
        subUnit: 'sol',
        baseCount: 668,
        callback: (yearNum: number): boolean => {
            if (yearNum % 111 === 0 && yearNum > 0) return false;
            const position = yearNum % 5;
            return position === 1 || position === 3 || position === 0;
        },
    },
};

/* ── Types ── */

export type CalendarValues = Record<string, number>;

/* ── Core Functions ── */

/**
 * Get Earth seconds from 0 CE for a given date.
 */
function earthSecondsSinceCE(date: Date): bigint {
    const year = BigInt(date.getFullYear());
    const startOfYear = new Date(date.getFullYear(), 0, 1);
    const secondsInYear = BigInt(Math.floor((date.getTime() - startOfYear.getTime()) / 1000));
    return year * SECONDS_PER_YEAR + secondsInYear;
}

/**
 * Convert an Earth date to local seconds since this calendar's epoch.
 *
 * Three modes:
 * 1. Sync-point: offset from sync point × coefficient + sync stardate
 * 2. Earth-epoch: seconds since a specific Earth date × multiplier
 * 3. Year-offset: seconds since (epochOffsetYears before 0 CE) × multiplier
 */
export function fromEarthDate(date: Date, config: CalendarConfig = ISS): bigint {
    const dateSecs = earthSecondsSinceCE(date);
    const [num, den] = config.multiplier;

    // Mode 1: Sync-point
    if (config.syncStardate !== undefined && config.syncEarthDate) {
        const syncStr = config.syncEarthDate.includes('T') ? config.syncEarthDate : config.syncEarthDate + 'T00:00:00';
        const syncSecs = earthSecondsSinceCE(new Date(syncStr));
        const earthOffset = dateSecs - syncSecs;
        const localOffset = (earthOffset * num) / den;
        return config.syncStardate + localOffset;
    }

    // Mode 2: Earth-epoch
    if (config.epochDate) {
        const epochStr = config.epochDate.includes('T') ? config.epochDate : config.epochDate + 'T00:00:00';
        const epochSecs = earthSecondsSinceCE(new Date(epochStr));
        return ((dateSecs - epochSecs) * num) / den;
    }

    // Mode 3: Year-offset
    const epochOffset = config.epochOffsetYears * SECONDS_PER_YEAR;
    return ((epochOffset + dateSecs) * num) / den;
}

/**
 * Decompose local seconds into subunit values.
 * If a leap rule is configured, year boundaries use variable-length years.
 */
export function decompose(localSeconds: bigint, config: CalendarConfig = ISS): CalendarValues {
    let remaining = localSeconds;
    const result: CalendarValues = {};
    const leap = config.leapRule;

    for (const [name, digits, perUnit] of config.units) {
        if (leap && name === leap.yearUnit) {
            const maxYears = config.base ** digits - 1;
            const subPerUnit = config.units.find(([n]) => n === leap.subUnit)?.[2] ?? perUnit;
            const baseSeconds = BigInt(leap.baseCount) * subPerUnit;
            const leapSeconds = BigInt(leap.baseCount + 1) * subPerUnit;
            let year = 0;

            while (year < maxYears) {
                const yearSeconds = leap.callback(year) ? leapSeconds : baseSeconds;
                if (remaining < yearSeconds) break;
                remaining -= yearSeconds;
                year++;
            }

            result[name] = year;
            continue;
        }

        const maxValue = config.base ** digits - 1;
        let value = Number(remaining / perUnit);
        value = Math.min(value, maxValue);
        result[name] = value;
        remaining -= BigInt(value) * perUnit;
    }

    return result;
}

/**
 * Compose subunit values back into local seconds.
 */
export function compose(values: CalendarValues, config: CalendarConfig = ISS): bigint {
    let total = 0n;
    const leap = config.leapRule;

    for (const [name, , perUnit] of config.units) {
        if (leap && name === leap.yearUnit) {
            const yearCount = values[name] ?? 0;
            const subPerUnit = config.units.find(([n]) => n === leap.subUnit)?.[2] ?? perUnit;
            const baseSeconds = BigInt(leap.baseCount) * subPerUnit;
            const leapSeconds = BigInt(leap.baseCount + 1) * subPerUnit;

            for (let y = 0; y < yearCount; y++) {
                total += leap.callback(y) ? leapSeconds : baseSeconds;
            }
            continue;
        }

        total += BigInt(values[name] ?? 0) * perUnit;
    }
    return total;
}

/**
 * Convert an integer to a zero-padded string in the given base.
 */
function toBaseN(value: number, digits: number, config: CalendarConfig): string {
    const { base, digits: digitChars } = config;
    if (value === 0) return digitChars[0].repeat(digits);

    let result = '';
    let remaining = value;
    while (remaining > 0) {
        result = digitChars[remaining % base] + result;
        remaining = Math.floor(remaining / base);
    }
    return result.padStart(digits, digitChars[0]);
}

/**
 * Convert a string in the given base back to an integer.
 */
function fromBaseN(str: string, config: CalendarConfig): number {
    const { base, digits: digitChars } = config;
    let value = 0;
    for (const char of str) {
        const pos = digitChars.indexOf(char);
        value = value * base + (pos >= 0 ? pos : 0);
    }
    return value;
}

/**
 * Format local seconds as a display string.
 */
export function formatStardate(localSeconds: bigint, shorthand = false, config: CalendarConfig = ISS): string {
    const values = decompose(localSeconds, config);

    // Template-based formatting
    const template = shorthand
        ? (config.shorthandTemplate ?? config.formatTemplate)
        : config.formatTemplate;

    if (template) {
        let first = true;
        return template.replace(/\{(\w+)}/g, (match, unitName: string) => {
            if (!(unitName in values)) return match;
            const digits = config.units.find(([n]) => n === unitName)?.[1] ?? 1;
            let formatted = toBaseN(values[unitName], digits, config);
            if (first) {
                const zero = config.digits[0];
                formatted = formatted.replace(new RegExp(`^[${zero}]+`), '') || zero;
                first = false;
            }
            return formatted;
        });
    }

    // Default separator-based format
    const { units, timeSplitAfter, unitSeparator, dateTimeSeparator, shorthandSkip } = config;

    let dateUnits = units.slice(0, timeSplitAfter + 1);
    const timeUnits = units.slice(timeSplitAfter + 1);

    if (shorthand) {
        dateUnits = dateUnits.slice(shorthandSkip);
    }

    const dateParts = dateUnits.map(([name, digits]) => toBaseN(values[name], digits, config));
    const timeParts = timeUnits.map(([name, digits]) => toBaseN(values[name], digits, config));

    // Trim leading zeros on the largest unit for readability
    if (dateParts.length > 0) {
        const zero = config.digits[0];
        dateParts[0] = dateParts[0].replace(new RegExp(`^[${zero}]+`), '') || zero;
    }

    return dateParts.join(unitSeparator) + dateTimeSeparator + timeParts.join(unitSeparator);
}

/**
 * Parse a display string back into local seconds.
 */
export function parseStardate(formatted: string, config: CalendarConfig = ISS): bigint {
    const { unitSeparator, dateTimeSeparator, units, timeSplitAfter } = config;

    const parts = formatted.trim().split(dateTimeSeparator);
    if (parts.length !== 2) return 0n;

    const dateParts = parts[0].split(unitSeparator);
    const timeParts = parts[1].split(unitSeparator);

    let dateUnits = units.slice(0, timeSplitAfter + 1);
    const timeUnits = units.slice(timeSplitAfter + 1);

    // Detect shorthand
    if (dateParts.length < dateUnits.length) {
        dateUnits = dateUnits.slice(dateUnits.length - dateParts.length);
    }

    const values: CalendarValues = {};
    dateUnits.forEach(([name], i) => { values[name] = dateParts[i] ? fromBaseN(dateParts[i], config) : 0; });
    timeUnits.forEach(([name], i) => { values[name] = timeParts[i] ? fromBaseN(timeParts[i], config) : 0; });

    return compose(values, config);
}

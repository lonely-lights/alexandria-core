/**
 * Re-export from @lonely-lights/stardate package.
 * In production, this alias resolves via npm. In development, via Vite alias.
 */
export {
    fromEarthDate,
    decompose,
    compose,
    formatStardate,
    parseStardate,
    ISS,
    MCT,
    type CalendarConfig,
    type CalendarValues,
} from '@lonely-lights/stardate';

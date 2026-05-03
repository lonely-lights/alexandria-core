import { useState, useMemo } from 'react';
import { fromEarthDate, formatStardate, parseStardate } from '@alexandria/lib/stardate';

interface StardateInputProps {
    value: unknown;
    onChange: (v: string) => void;
}

/**
 * A field input that accepts an Earth date and converts it to an ISS stardate.
 * Shows the stardate in real-time as the date changes.
 * Also supports direct stardate entry.
 */
export default function StardateInput({ value, onChange }: StardateInputProps) {
    const [mode, setMode] = useState<'earth' | 'stardate'>('earth');
    const [earthDate, setEarthDate] = useState(() => {
        // If we have an ISS value, don't try to reverse it for the date picker
        // (the reverse conversion loses precision). Just start blank.
        return '';
    });
    const [stardateText, setStardateText] = useState('');

    const issValue = (value as string) || '';

    // Format current ISS value for display
    const displayFull = useMemo(() => {
        if (!issValue) return null;
        try {
            return formatStardate(BigInt(issValue));
        } catch {
            return null;
        }
    }, []);

    const displayShort = useMemo(() => {
        if (!issValue) return null;
        try {
            return formatStardate(BigInt(issValue), true);
        } catch {
            return null;
        }
    }, []);

    function handleEarthDateChange(dateStr: string) {
        setEarthDate(dateStr);
        if (!dateStr) {
            onChange('');
            return;
        }
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return;
            const iss = fromEarthDate(date);
            onChange(iss.toString());
        } catch {
            // Invalid date, don't update
        }
    }

    function handleStardateChange(text: string) {
        setStardateText(text);
        if (!text.trim()) {
            onChange('');
            return;
        }
        try {
            const iss = parseStardate(text);
            if (iss > 0n) {
                onChange(iss.toString());
            }
        } catch {
            // Invalid stardate, don't update
        }
    }

    return (
        <div className="space-y-2">
            {/* Mode toggle */}
            <div className="flex items-center gap-2">
                <button
                    type="button"
                    onClick={() => setMode('earth')}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition ${mode === 'earth' ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content/50 hover:text-base-content'}`}
                >
                    Earth Date
                </button>
                <button
                    type="button"
                    onClick={() => setMode('stardate')}
                    className={`rounded-md px-2 py-0.5 text-[10px] font-medium transition ${mode === 'stardate' ? 'bg-primary text-primary-content' : 'bg-base-300 text-base-content/50 hover:text-base-content'}`}
                >
                    Stardate
                </button>
            </div>

            {/* Input */}
            {mode === 'earth' ? (
                <input
                    type="datetime-local"
                    value={earthDate}
                    onChange={(e) => handleEarthDateChange(e.target.value)}
                    className="input input-bordered h-8 min-h-0 w-full rounded-lg text-xs"
                />
            ) : (
                <input
                    type="text"
                    value={stardateText}
                    onChange={(e) => handleStardateChange(e.target.value)}
                    placeholder="5·5·04·36E·78·529  2·41·5E"
                    className="input input-bordered h-8 min-h-0 w-full rounded-lg font-mono text-xs"
                />
            )}

            {/* Live preview */}
            {displayFull && (
                <div className="rounded-lg bg-base-300/50 px-3 py-2">
                    <div className="font-mono text-xs text-base-content/80">{displayFull}</div>
                    <div className="mt-0.5 font-mono text-[10px] text-base-content/40">Shorthand: {displayShort}</div>
                </div>
            )}
        </div>
    );
}

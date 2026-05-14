import { useState, useMemo, type CSSProperties } from 'react';
import { fromEarthDate, formatStardate, parseStardate } from '@alexandria/lib/stardate';
import Input from '../form/Input';

interface StardateInputProps {
    value: unknown;
    onChange: (v: string) => void;
}

const MONO_FONT_STACK = 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Courier New", monospace';

const modeBtnBase: CSSProperties = {
    padding: '0.125rem 0.5rem',
    fontSize: '0.625rem',
    fontWeight: 500,
    borderRadius: 'var(--theme-radius-button)',
    border: 'none',
    cursor: 'pointer',
    transition: 'background var(--theme-motion-duration-fast, 150ms) ease, color var(--theme-motion-duration-fast, 150ms) ease',
};

const modeBtnActive: CSSProperties = {
    ...modeBtnBase,
    background: 'var(--theme-brand-primary-500)',
    color: 'var(--theme-brand-primary-content)',
};

const modeBtnIdle: CSSProperties = {
    ...modeBtnBase,
    background: 'var(--theme-base-300)',
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const previewBoxStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-input)',
    background: 'color-mix(in srgb, var(--theme-base-300) 50%, transparent)',
    padding: '0.5rem 0.75rem',
};

const previewFullStyle: CSSProperties = {
    fontFamily: MONO_FONT_STACK,
    fontSize: '0.75rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
};

const previewShortStyle: CSSProperties = {
    marginTop: '0.125rem',
    fontFamily: MONO_FONT_STACK,
    fontSize: '0.625rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

/**
 * Field input that accepts an Earth date and converts it to an ISS stardate.
 * Also supports direct stardate entry. Shows the stardate in real-time.
 */
export default function StardateInput({ value, onChange }: StardateInputProps) {
    const [mode, setMode] = useState<'earth' | 'stardate'>('earth');
    const [earthDate, setEarthDate] = useState(() => {
        // We don't reverse-derive an Earth date from an existing ISS value (lossy);
        // just start blank.
        return '';
    });
    const [stardateText, setStardateText] = useState('');

    const issValue = (value as string) || '';

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
                    style={mode === 'earth' ? modeBtnActive : modeBtnIdle}
                >
                    Earth Date
                </button>
                <button
                    type="button"
                    onClick={() => setMode('stardate')}
                    style={mode === 'stardate' ? modeBtnActive : modeBtnIdle}
                >
                    Stardate
                </button>
            </div>

            {/* Input */}
            {mode === 'earth' ? (
                <Input
                    type="datetime-local"
                    value={earthDate}
                    onChange={(e) => handleEarthDateChange(e.target.value)}
                    size="sm"
                />
            ) : (
                <Input
                    type="text"
                    value={stardateText}
                    onChange={(e) => handleStardateChange(e.target.value)}
                    placeholder="5·5·04·36E·78·529  2·41·5E"
                    size="sm"
                    style={{ fontFamily: MONO_FONT_STACK }}
                />
            )}

            {/* Live preview */}
            {displayFull && (
                <div style={previewBoxStyle}>
                    <div style={previewFullStyle}>{displayFull}</div>
                    <div style={previewShortStyle}>Shorthand: {displayShort}</div>
                </div>
            )}
        </div>
    );
}

/**
 * OtpField — N individual character boxes for one-time passwords and
 * verification codes. Auto-advances on type, jumps back on Backspace
 * from an empty box, and absorbs pasted strings cleanly (paste a
 * 6-digit code into any box and all six fill).
 *
 * `value` and `onChange` work with the joined string ("123456") so the
 * surrounding form treats this like a regular text input. Box-level
 * state is internal.
 *
 * Box visuals live in core/resources/css/components/otp-field.css.
 */

import {
    useRef,
    type ChangeEvent,
    type ClipboardEvent,
    type KeyboardEvent,
} from 'react';

export interface OtpFieldProps {
    /** Number of character boxes. */
    length: number;

    /** Joined value (e.g. "123456"). */
    value: string;

    /** Called with the joined value whenever the user types or pastes. */
    onChange: (value: string) => void;

    /** Restrict input to digits 0-9. */
    numeric?: boolean;

    /** Auto-focus the first box on mount. */
    autoFocus?: boolean;

    /** Makes the first box the named submit field for accessibility tools. */
    name?: string;

    /** Marks the first box as required for native form validation. */
    required?: boolean;

    /** ID for the first box (for label `htmlFor` association). */
    id?: string;
}

export default function OtpField({
    length,
    value,
    onChange,
    numeric = false,
    autoFocus = false,
    name,
    required,
    id,
}: OtpFieldProps) {
    const refs = useRef<Array<HTMLInputElement | null>>([]);

    const chars: string[] = Array.from({ length }, (_, i) => value[i] ?? '');

    function setChar(index: number, char: string): string {
        const next = [...chars];
        next[index] = char;

        // Trailing empties are dropped so the consumer sees "123" not "123   ".
        return next.join('').replace(/\s+$/, '');
    }

    function handleInput(index: number, e: ChangeEvent<HTMLInputElement>): void {
        // Take only the last typed character — the input may briefly hold two
        // chars after a fast paste, but we want one char per box.
        const incoming = e.target.value.slice(-1);

        if (numeric && incoming && !/^\d$/.test(incoming)) {
            return;
        }

        const nextValue = setChar(index, incoming);
        onChange(nextValue);

        if (incoming && index < length - 1) {
            refs.current[index + 1]?.focus();
            refs.current[index + 1]?.select();
        }
    }

    function handleKeyDown(
        index: number,
        e: KeyboardEvent<HTMLInputElement>,
    ): void {
        if (e.key === 'Backspace' && !chars[index] && index > 0) {
            e.preventDefault();
            const nextValue = setChar(index - 1, '');
            onChange(nextValue);
            refs.current[index - 1]?.focus();

            return;
        }

        if (e.key === 'ArrowLeft' && index > 0) {
            e.preventDefault();
            refs.current[index - 1]?.focus();
            refs.current[index - 1]?.select();

            return;
        }

        if (e.key === 'ArrowRight' && index < length - 1) {
            e.preventDefault();
            refs.current[index + 1]?.focus();
            refs.current[index + 1]?.select();
        }
    }

    function handlePaste(e: ClipboardEvent<HTMLInputElement>): void {
        e.preventDefault();
        const raw = e.clipboardData.getData('text');
        const cleaned = numeric ? raw.replace(/\D/g, '') : raw.trim();
        const next = cleaned.slice(0, length);

        onChange(next);

        // Focus the first empty box, or the last one if completely filled.
        const focusIndex = Math.min(next.length, length - 1);
        refs.current[focusIndex]?.focus();
        refs.current[focusIndex]?.select();
    }

    return (
        <div className="flex gap-2 justify-center" role="group">
            {Array.from({ length }).map((_, i) => (
                <input
                    key={i}
                    ref={(el) => {
                        refs.current[i] = el;
                    }}
                    type="text"
                    inputMode={numeric ? 'numeric' : 'text'}
                    pattern={numeric ? '[0-9]*' : undefined}
                    maxLength={1}
                    value={chars[i]}
                    onChange={(e) => handleInput(i, e)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    onFocus={(e) => e.target.select()}
                    autoFocus={autoFocus && i === 0}
                    name={i === 0 ? name : undefined}
                    id={i === 0 ? id : undefined}
                    required={required && i === 0}
                    className="alex-otp-box"
                    aria-label={`Digit ${i + 1} of ${length}`}
                    autoComplete={i === 0 ? 'one-time-code' : 'off'}
                />
            ))}
        </div>
    );
}

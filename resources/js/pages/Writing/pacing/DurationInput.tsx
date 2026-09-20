import {
    useContext,
    useEffect,
    useLayoutEffect,
    useId,
    useRef,
    useState,
} from 'react';
import useT from '@alexandria/hooks/useT';
import { WritingSaveContext } from '../Sections/WritingSaveContext';
import { formatDuration, parseDurationInput } from './durationValue';
interface Props {
    value: number | null;
    onCommit(seconds: number | null): void;
    label: string;
    disabled?: boolean;
    onValidityChange?(valid: boolean): void;
}
export default function DurationInput({
    value,
    onCommit,
    label,
    disabled = false,
    onValidityChange,
}: Props) {
    const t = useT();
    const id = useId();
    const coordinator = useContext(WritingSaveContext);
    const input = useRef<HTMLInputElement>(null);
    const [text, setText] = useState(
        value === null ? '' : formatDuration(value),
    );
    const dirty = useRef(false);
    const [error, setError] = useState(false);
    const current = useRef({ text, value, onCommit, onValidityChange });
    useLayoutEffect(() => {
        current.current = { text, value, onCommit, onValidityChange };
    });
    function commit(): boolean {
        if (!dirty.current) {
            return true;
        }

        const state = current.current;
        const parsed = parseDurationInput(state.text);

        if (!parsed.valid) {
            setError(true);
            state.onValidityChange?.(false);

            return false;
        }

        dirty.current = false;
        setError(false);
        state.onValidityChange?.(true);
        state.onCommit(parsed.seconds);

        return true;
    }
    const commitRef = useRef(commit);
    useLayoutEffect(() => {
        commitRef.current = commit;
    });
    useEffect(() => {
        if (!dirty.current) {
            setText(value === null ? '' : formatDuration(value));
        }
    }, [value]);
    useEffect(
        () =>
            coordinator?.register({
                get hasUnsaved() {
                    return dirty.current;
                },
                flush: async () => {
                    const ok = commitRef.current();

                    if (!ok) {
                        input.current?.focus();
                    }

                    return ok;
                },
            }),
        [coordinator],
    );

    return (
        <span
            style={{
                display: 'inline-flex',
                flexDirection: 'column',
                maxWidth: '100%',
            }}
        >
            <input
                ref={input}
                type="text"
                inputMode="text"
                aria-label={label}
                aria-invalid={error}
                aria-describedby={error ? id : undefined}
                disabled={disabled}
                placeholder="m:ss"
                value={text}
                style={{
                    width: '7rem',
                    maxWidth: '100%',
                    padding: '0.25rem 0.4rem',
                    border: '1px solid var(--theme-base-300)',
                    borderRadius: 'var(--theme-radius-input)',
                    fontVariantNumeric: 'tabular-nums',
                    background: 'var(--theme-base-page)',
                    color: 'inherit',
                }}
                onChange={(event) => {
                    dirty.current = true;
                    setText(event.target.value);
                    const valid = parseDurationInput(event.target.value).valid;
                    setError(!valid);
                    onValidityChange?.(valid);
                }}
                onBlur={() => commit()}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        event.stopPropagation();
                        commit();
                    }

                    if (event.key === 'Escape') {
                        event.preventDefault();
                        event.stopPropagation();
                        dirty.current = false;
                        setText(value === null ? '' : formatDuration(value));
                        setError(false);
                        onValidityChange?.(true);
                    }
                }}
            />
            {error && (
                <span
                    id={id}
                    role="alert"
                    style={{
                        fontSize: '0.75rem',
                        color: 'var(--theme-status-error-stroke)',
                    }}
                >
                    {t('writing.pacing.invalid')}
                </span>
            )}
        </span>
    );
}

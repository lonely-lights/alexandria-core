import { useEffect, useState } from 'react';
import type { KeyboardEvent } from 'react';

/**
 * Shared commit-on-blur state machine for input controls.
 *
 * Stage 8b M1.C.2 — extracted from ColorAnchorEditor / TextInput /
 * NumberInput, which all repeated the same pattern: a draft string
 * synced with `value`, commit on blur or Enter, roll back to `value`
 * on Escape.
 *
 * `transform` lets an editor sanitize the raw draft before it commits
 * (NumberInput uses this to parseFloat + clamp to min/max; returning
 * null aborts the commit without resetting the draft so the user can
 * keep typing through invalid intermediate states).
 *
 * Returns the draft, its setter (so editors can wire `<input value>`
 * + `onChange={(e) => setDraft(e.target.value)}`), `commit` to call
 * from `onBlur`, and `handleKey` to wire to `onKeyDown` for the
 * Enter/Escape shortcuts.
 */
export function useCommitOnBlur(
    value: string,
    onCommit: (next: string) => void,
    transform?: (raw: string) => string | null,
) {
    const [draft, setDraft] = useState(value);

    // Resync local draft when the resolved value changes from outside
    // (e.g. parent reset, preset swap, server reload after Save).
    useEffect(() => {
        setDraft(value);
    }, [value]);

    function commit() {
        const next = transform ? transform(draft) : draft;
        if (next === null) {
            return;
        }
        if (next !== value) {
            setDraft(next);
            onCommit(next);
        }
    }

    function handleKey(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === 'Enter') {
            e.currentTarget.blur();
        } else if (e.key === 'Escape') {
            setDraft(value);
            e.currentTarget.blur();
        }
    }

    return { draft, setDraft, commit, handleKey };
}

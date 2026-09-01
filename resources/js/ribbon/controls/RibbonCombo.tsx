import { useEffect, useRef, useState, type CSSProperties } from 'react';

import PickerDropdown from '@alexandria/components/ui/PickerDropdown';
import Tooltip from '@alexandria/components/ui/Tooltip';

import type { RibbonControl } from '../types';
import { useRibbonControlMeta } from './useRibbonControlMeta';

/**
 * Word-style combo box — spec 2026-08-08, owner round 5.
 *
 * A select with an escape hatch. The value is an editable field, and a
 * SEPARATE arrow button beside it opens the preset list; clicking the
 * number focuses it for typing rather than dropping a menu over it.
 * That split is the whole point of the control — the presets are a
 * convenience, not the set of legal answers.
 *
 * The popup is `PickerDropdown`'s, supplied through its `trigger`
 * render-prop, so the menu, its positioning, and its dismissal
 * behaviour are literally the same code the plain ribbon selects use.
 *
 * The framework stays dumb about meaning: a commit — typed or picked —
 * is just `control.onAction(ctx, raw)`. Range clamping and persistence
 * belong to whoever owns the preference.
 */

interface Props<Ctx> {
    control: RibbonControl<Ctx>;
    ctx: Ctx;
}

const shellStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 6%, transparent)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-button)',
    height: '1.5rem',
};

const inputStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--theme-base-content)',
    fontSize: '0.75rem',
    fontWeight: 500,
    // Word sizes this field to the digits and right-aligns them.
    width: '2.5ch',
    textAlign: 'right',
};

const arrowStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
    fontSize: '10px',
};

export default function RibbonCombo<Ctx>({ control, ctx }: Props<Ctx>) {
    const { t, disabled, options, label, tip } = useRibbonControlMeta(control, ctx);
    const committed = control.value?.(ctx) ?? '';

    // What the field is showing while the writer types. Resynced from
    // the committed value whenever that changes underneath us — a
    // preset pick, or another surface moving the same preference.
    const [draft, setDraft] = useState(committed);
    const inputRef = useRef<HTMLInputElement>(null);
    // Hover-off auto-dismiss guard (owner ruling 2026-09-01: every
    // activated dropdown dismisses, this one included). The field, the
    // arrow and the list are one region; the timer is switched OFF for
    // as long as the input holds keyboard focus so a writer mid-keystroke
    // never has the list yanked away. Focusing the input also closes the
    // list (see onFocus below), so this is belt and braces.
    const [inputFocused, setInputFocused] = useState(false);

    useEffect(() => {
        setDraft(committed);
    }, [committed]);

    const commit = () => {
        const raw = draft.trim();

        // Empty or non-numeric is a slip, not an instruction.
        if (raw === '' || !/^\d+$/.test(raw)) {
            setDraft(committed);

            return;
        }

        control.onAction(ctx, raw);
    };

    const revert = () => {
        setDraft(committed);
        inputRef.current?.blur();
    };

    return (
        <Tooltip content={tip}>
            <span className="inline-flex">
                <PickerDropdown
                    value={committed}
                    options={options}
                    onChange={(next) => control.onAction(ctx, next)}
                    ariaLabel={label}
                    disabled={disabled}
                    menuWidth={104}
                    align="right"
                    // undefined: follow the menu_dismiss_delay_ms
                    // preference. null: forced off while typing.
                    autoDismissMs={inputFocused ? null : undefined}
                    trigger={({ open, toggle, close, ref, onMouseEnter, onMouseLeave }) => (
                        <span
                            ref={ref}
                            onMouseEnter={onMouseEnter}
                            onMouseLeave={onMouseLeave}
                            // The number must not crowd the arrow the way a
                            // native select does — gap-2 plus the arrow's own
                            // left padding, so the air is visible and the
                            // arrow's hit target grows leftward with it.
                            className="inline-flex items-center gap-2 pr-1 pl-2"
                            style={{ ...shellStyle, opacity: disabled ? 0.5 : 1 }}
                            data-ribbon-control={control.id}
                        >
                            <input
                                ref={inputRef}
                                type="text"
                                inputMode="numeric"
                                value={draft}
                                disabled={disabled}
                                aria-label={label}
                                style={inputStyle}
                                data-ribbon-combo-input={control.id}
                                // Selecting on focus means a click lands you
                                // ready to overtype, and never opens the list.
                                onFocus={(event) => {
                                    setInputFocused(true);
                                    close();
                                    event.currentTarget.select();
                                }}
                                onChange={(event) => setDraft(event.target.value)}
                                onBlur={() => {
                                    setInputFocused(false);
                                    commit();
                                }}
                                onKeyDown={(event) => {
                                    if (event.key === 'Enter') {
                                        event.preventDefault();
                                        commit();
                                        inputRef.current?.blur();
                                    }

                                    if (event.key === 'Escape') {
                                        event.preventDefault();
                                        revert();
                                    }
                                }}
                            />
                            <button
                                type="button"
                                onClick={toggle}
                                disabled={disabled}
                                aria-haspopup="listbox"
                                aria-expanded={open}
                                aria-label={t('writing.ribbon.font_size_presets')}
                                data-ribbon-combo-arrow={control.id}
                                className="inline-flex h-full w-5 cursor-pointer items-center justify-end pl-1"
                            >
                                <i
                                    className="fa-solid fa-chevron-down transition-transform"
                                    style={{
                                        ...arrowStyle,
                                        transform: `rotate(${open ? 180 : 0}deg)`,
                                    }}
                                    aria-hidden="true"
                                />
                            </button>
                        </span>
                    )}
                />
            </span>
        </Tooltip>
    );
}

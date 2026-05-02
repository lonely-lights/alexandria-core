import {
    arrow,
    flip,
    FloatingArrow,
    FloatingPortal,
    offset,
    shift,
    useFloating,
    type Placement,
} from '@floating-ui/react';
import { useMemo, useRef, useState, type ReactNode } from 'react';

/**
 * A single password validation rule. The label is what shows in the
 * popover; passes() runs against the live input value to decide whether
 * the row gets a green check or a muted dot.
 */
export interface PasswordRule {
    id: string;
    label: ReactNode;
    passes: (value: string) => boolean;
}

interface PasswordRulesPopoverProps {
    /** The current password input value (live, controlled by parent). */
    value: string;
    /** True when the input has focus — drives popover visibility. */
    open: boolean;
    /** The DOM element the popover anchors to (the input itself). */
    anchor: HTMLElement | null;
    /**
     * Optional password-confirmation value. When supplied AND non-empty,
     * adds a 'Passwords match' rule below the standard ruleset. Pass the
     * live value of the confirm-password field. Empty / undefined hides
     * the row so the popover doesn't show a noisy false-negative on
     * first focus before the user has typed in the confirmation field.
     */
    confirmation?: string;
    /**
     * Rules list. Defaults to Laravel's `Password::default()` ruleset
     * (min 8 chars, plus one of each: uppercase, lowercase, digit,
     * special). Override to match your app's actual server-side rules.
     */
    rules?: PasswordRule[];
    /** Where to position relative to the anchor. Defaults to right. */
    placement?: Placement;
}

/**
 * A rule paired with the live result of running its predicate against
 * a current input value. Returned by evaluatePasswordRules().
 */
export interface EvaluatedPasswordRule extends PasswordRule {
    passed: boolean;
}

/**
 * Default rules matching Laravel's Password::default() shape — same
 * server-side validation that ResetUserPassword + UpdateUserPassword
 * apply. Consumers with stricter rules should pass their own list.
 */
export const defaultPasswordRules: PasswordRule[] = [
    {
        id: 'length',
        label: 'At least 8 characters',
        passes: (v) => v.length >= 8,
    },
    {
        id: 'lowercase',
        label: 'At least one lowercase letter',
        passes: (v) => /[a-z]/.test(v),
    },
    {
        id: 'uppercase',
        label: 'At least one uppercase letter',
        passes: (v) => /[A-Z]/.test(v),
    },
    {
        id: 'digit',
        label: 'At least one number',
        passes: (v) => /[0-9]/.test(v),
    },
    {
        id: 'symbol',
        label: 'At least one symbol',
        passes: (v) => /[^A-Za-z0-9]/.test(v),
    },
];

/**
 * Run the password rules against a value (and optional confirmation)
 * and return both the per-rule results and an `allPassed` aggregate.
 *
 * Exported so consumers can drive their own UI off the same predicate
 * the popover uses — e.g. flipping the input border to a success
 * variant once every rule passes. Behaviour mirrors what the popover
 * renders: when `confirmation` is provided AND non-empty, a synthetic
 * `match` rule joins the list. Empty confirmation means the match
 * rule is omitted entirely (so a fresh focus on an empty confirm
 * field doesn't poison `allPassed`).
 */
export function evaluatePasswordRules(
    value: string,
    options: { confirmation?: string; rules?: PasswordRule[] } = {},
): { rules: EvaluatedPasswordRule[]; allPassed: boolean } {
    const { confirmation, rules = defaultPasswordRules } = options;

    const evaluated: EvaluatedPasswordRule[] = rules.map((rule) => ({
        ...rule,
        passed: rule.passes(value),
    }));

    if (confirmation !== undefined && confirmation.length > 0) {
        evaluated.push({
            id: 'match',
            label: 'Passwords match',
            passes: () => false, // unused; the predicate already ran
            passed: value === confirmation,
        });
    }

    // allPassed only counts when the user has actually typed something
    // and every standard rule + the match rule (if applicable) is met.
    const allPassed =
        value.length > 0 &&
        evaluated.every((rule) => rule.passed) &&
        // If a confirmation prop was passed at all, require the match
        // rule too. Empty confirmation means consumer hasn't asked us
        // to validate matching yet, so we don't gate on it.
        (confirmation === undefined ||
            (confirmation.length > 0 && value === confirmation));

    return { rules: evaluated, allPassed };
}

/**
 * Non-intrusive password-rules feedback popover. Anchored to a password
 * input via the `anchor` prop; opens when the input has focus and
 * updates live as the user types.
 *
 * Usage:
 *   const inputRef = useRef<HTMLInputElement>(null);
 *   const [focused, setFocused] = useState(false);
 *   <input
 *       ref={inputRef}
 *       value={password}
 *       onChange={...}
 *       onFocus={() => setFocused(true)}
 *       onBlur={() => setFocused(false)}
 *   />
 *   <PasswordRulesPopover
 *       value={password}
 *       open={focused}
 *       anchor={inputRef.current}
 *   />
 */
export default function PasswordRulesPopover({
    value,
    open,
    anchor,
    confirmation,
    rules = defaultPasswordRules,
    placement = 'right',
}: PasswordRulesPopoverProps) {
    const arrowRef = useRef<SVGSVGElement>(null);
    const [refs, setRefs] = useState<{ reference: HTMLElement | null }>({
        reference: null,
    });

    // Sync the anchor prop into the floating-ui reference element. The
    // useFloating hook expects a stable ref; this lets the consumer
    // change the anchor freely (e.g. when conditionally rendering the
    // input) without re-creating the floating instance.
    if (refs.reference !== anchor) {
        setRefs({ reference: anchor });
    }

    const { refs: floatingRefs, floatingStyles, context } = useFloating({
        open,
        placement,
        elements: { reference: refs.reference },
        middleware: [
            offset(12),
            flip({ padding: 8 }),
            shift({ padding: 8 }),
            arrow({ element: arrowRef }),
        ],
    });

    const evaluatedRules = useMemo(
        () => evaluatePasswordRules(value, { confirmation, rules }).rules,
        [rules, value, confirmation],
    );

    if (!open || !anchor) {
        return null;
    }

    return (
        <FloatingPortal>
            <div
                ref={floatingRefs.setFloating}
                style={floatingStyles}
                className="bg-base-200 border border-base-300 rounded-lg shadow-xl p-4 z-50 w-72 text-sm"
                role="tooltip"
                aria-live="polite"
            >
                <FloatingArrow
                    ref={arrowRef}
                    context={context}
                    className="fill-base-200 [&>path:first-of-type]:stroke-base-300"
                />
                <p className="text-base-content/60 mb-2 text-xs font-medium uppercase tracking-wide">
                    Password requirements
                </p>
                <ul className="space-y-1.5">
                    {evaluatedRules.map((rule) => (
                        <li
                            key={rule.id}
                            className="flex items-center gap-2"
                        >
                            <span
                                className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full transition-colors ${
                                    rule.passed
                                        ? 'bg-success/20 text-success'
                                        : 'bg-base-300 text-base-content/40'
                                }`}
                                aria-hidden="true"
                            >
                                {rule.passed ? (
                                    <svg
                                        className="h-3 w-3"
                                        viewBox="0 0 20 20"
                                        fill="currentColor"
                                    >
                                        <path
                                            fillRule="evenodd"
                                            d="M16.704 5.29a1 1 0 010 1.42l-8 8a1 1 0 01-1.42 0l-4-4a1 1 0 011.42-1.42L8 12.59l7.29-7.3a1 1 0 011.414 0z"
                                            clipRule="evenodd"
                                        />
                                    </svg>
                                ) : (
                                    <span className="h-1.5 w-1.5 rounded-full bg-current" />
                                )}
                            </span>
                            <span
                                className={
                                    rule.passed
                                        ? 'text-base-content'
                                        : 'text-base-content/60'
                                }
                            >
                                {rule.label}
                            </span>
                        </li>
                    ))}
                </ul>
            </div>
        </FloatingPortal>
    );
}

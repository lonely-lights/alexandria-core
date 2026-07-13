import type { CSSProperties } from 'react';

/**
 * Compact keyboard-shortcut legend — console-style `<kbd>` + label pairs,
 * used in the Workbench's sticky action bars (Routing review, Creation
 * review). Mirrors the `kbd` treatment already used in CommandPalette's
 * footer hints, at the smaller "xs" size.
 */

const kbdStyle: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '1.25rem',
    height: '1.25rem',
    padding: '0 0.25rem',
    fontSize: '0.625rem',
    fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
    background: 'var(--theme-base-100)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 15%, transparent)',
    borderRadius: '0.25rem',
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

const labelStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 55%, transparent)',
    fontSize: '0.6875rem',
};

interface LegendPair {
    key: string;
    label: string;
    /** When provided, the pair renders as a clickable button applying
     *  the same verdict the keyboard shortcut does. */
    onPress?: () => void;
}

export default function WorkbenchKeyLegend({ pairs }: { pairs: LegendPair[] }) {
    return (
        <div className="flex flex-wrap items-center gap-2.5">
            {pairs.map(({ key, label, onPress }) =>
                onPress ? (
                    <button
                        key={key}
                        type="button"
                        onClick={onPress}
                        title={`${label} (${key})`}
                        className="inline-flex cursor-pointer items-center gap-1 rounded px-1 py-0.5 transition-colors hover:bg-[color-mix(in_srgb,var(--theme-base-content)_8%,transparent)]"
                        style={{ background: 'none', border: 'none' }}
                    >
                        <kbd style={kbdStyle}>{key}</kbd>
                        <span style={labelStyle}>{label}</span>
                    </button>
                ) : (
                    <span key={key} className="inline-flex items-center gap-1">
                        <kbd style={kbdStyle}>{key}</kbd>
                        <span style={labelStyle}>{label}</span>
                    </span>
                ),
            )}
        </div>
    );
}

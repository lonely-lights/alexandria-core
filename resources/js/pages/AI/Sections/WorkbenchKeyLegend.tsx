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

export default function WorkbenchKeyLegend({ pairs }: { pairs: [string, string][] }) {
    return (
        <div className="flex flex-wrap items-center gap-2.5">
            {pairs.map(([key, label]) => (
                <span key={key} className="inline-flex items-center gap-1">
                    <kbd style={kbdStyle}>{key}</kbd>
                    <span style={labelStyle}>{label}</span>
                </span>
            ))}
        </div>
    );
}

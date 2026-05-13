import type { CSSProperties } from 'react';
import useT from '@alexandria/hooks/useT';
import type { SavedGraph } from './types';

interface GraphSidebarProps {
    graphs: SavedGraph[];
    activeId: string | null;
    onSelect: (id: string) => void;
}

const railStyle: CSSProperties = {
    background: 'var(--theme-base-100)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const headingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const buttonBase: CSSProperties = {
    borderRadius: 'var(--theme-radius-input)',
};

const buttonActiveStyle: CSSProperties = {
    ...buttonBase,
    background: 'color-mix(in srgb, var(--theme-brand-primary-500) 10%, transparent)',
    color: 'var(--theme-brand-primary-500)',
};

const buttonIdleStyle: CSSProperties = {
    ...buttonBase,
    color: 'color-mix(in srgb, var(--theme-base-content) 70%, transparent)',
};

/**
 * Left-rail switcher between saved named graphs. Hides itself when there
 * is at most one graph — no point showing a switcher with only one option.
 */
export default function GraphSidebar({ graphs, activeId, onSelect }: GraphSidebarProps) {
    const t = useT();
    if (graphs.length <= 1) return null;

    return (
        <aside className="w-44 shrink-0 p-2" style={railStyle}>
            <div className="mb-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider" style={headingStyle}>
                {t('views.graph.sidebar.heading')}
            </div>
            <nav className="space-y-0.5">
                {graphs.map((g) => {
                    const isActive = g.id === activeId;
                    return (
                        <button
                            key={g.id}
                            type="button"
                            onClick={() => onSelect(g.id)}
                            aria-current={isActive ? 'page' : undefined}
                            data-active={isActive ? 'true' : 'false'}
                            className="alex-graph-sidebar-btn flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs"
                            style={isActive ? buttonActiveStyle : buttonIdleStyle}
                        >
                            <i className="fa-solid fa-diagram-project w-4 text-center text-[10px]" />
                            <span className="truncate">{g.name}</span>
                        </button>
                    );
                })}
            </nav>
        </aside>
    );
}

import type { SavedGraph } from './types';

interface GraphSidebarProps {
    graphs: SavedGraph[];
    activeId: string | null;
    onSelect: (id: string) => void;
}

/**
 * Left-rail switcher between saved named graphs. Hides itself when there
 * is at most one graph — no point showing a switcher with only one option.
 */
export default function GraphSidebar({ graphs, activeId, onSelect }: GraphSidebarProps) {
    if (graphs.length <= 1) return null;

    return (
        <aside className="w-44 shrink-0 rounded-2xl border border-base-content/10 bg-base-100 p-2">
            <div className="mb-2 px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-base-content/40">
                Graphs
            </div>
            <nav className="space-y-0.5">
                {graphs.map((g) => (
                    <button
                        key={g.id}
                        type="button"
                        onClick={() => onSelect(g.id)}
                        aria-current={g.id === activeId ? 'page' : undefined}
                        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-xs transition-colors ${
                            g.id === activeId
                                ? 'bg-primary/10 text-primary'
                                : 'text-base-content/70 hover:bg-base-content/5 hover:text-base-content'
                        }`}
                    >
                        <i className="fa-solid fa-diagram-project w-4 text-center text-[10px]" />
                        <span className="truncate">{g.name}</span>
                    </button>
                ))}
            </nav>
        </aside>
    );
}

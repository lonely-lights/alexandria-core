import type { ReorderMode } from '../../hooks/useReorderMode';

interface ReorderModeToggleProps {
    mode: ReorderMode;
    onChange: (mode: ReorderMode) => void;
    className?: string;
}

/**
 * Segmented toggle between drag-and-drop reordering and up/down arrow buttons.
 * Applies to any list that supports both reorder UIs (Fields, Infobox blocks).
 */
export default function ReorderModeToggle({ mode, onChange, className = '' }: ReorderModeToggleProps) {
    return (
        <div
            className={`inline-flex items-center gap-0.5 rounded-lg border border-base-content/10 bg-base-100 p-0.5 ${className}`}
            role="group"
            aria-label="Reorder mode"
        >
            <button
                type="button"
                onClick={() => onChange('drag')}
                aria-pressed={mode === 'drag'}
                aria-label="Drag to reorder"
                title="Drag to reorder"
                className={`flex h-6 w-7 items-center justify-center rounded text-xs transition-colors ${
                    mode === 'drag'
                        ? 'bg-primary/10 text-primary'
                        : 'text-base-content/50 hover:bg-base-content/5'
                }`}
            >
                <i className="fa-solid fa-arrows-up-down text-[10px]" />
            </button>
            <button
                type="button"
                onClick={() => onChange('arrows')}
                aria-pressed={mode === 'arrows'}
                aria-label="Use arrow buttons to reorder"
                title="Use arrow buttons to reorder"
                className={`flex h-6 w-7 items-center justify-center rounded text-xs transition-colors ${
                    mode === 'arrows'
                        ? 'bg-primary/10 text-primary'
                        : 'text-base-content/50 hover:bg-base-content/5'
                }`}
            >
                <i className="fa-solid fa-sort text-[10px]" />
            </button>
        </div>
    );
}

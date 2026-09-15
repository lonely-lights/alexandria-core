import {
    changeButtonStyle,
    inputStyle,
    microText,
    muteText,
    rowDivider,
    scrollingListWrapperStyle,
    selectedChipStyle,
} from '@alexandria/components/notes/modals/linkMoveStyles';
import useT from '@alexandria/hooks/useT';
import { useEffect, useState } from 'react';

export interface SectionTarget {
    id: number;
    title: string;
    label: string | null;
    /** Distance from the work's root sections: 0 = act-level. */
    depth: number;
    /** Ancestor titles, root first, without the section's own title. */
    path: string[];
}

interface WorkSectionPickerProps {
    projectId: number;
    workId: number;
    workTitle: string;
    selected: SectionTarget | null;
    onSelect: (section: SectionTarget | null) => void;
}

/** Row padding-left with no indent, in rem. Matches ContextSwitchModal. */
const ROW_BASE_INDENT_REM = 1;
const ROW_INDENT_STEP_REM = 0.75;
const ROW_MAX_INDENT_STEPS = 6;

const PATH_SEPARATOR = ' › ';

/**
 * Optional second step of LinkMoveModal once a work is the destination:
 * the work's sections in Navigator order, indented by depth. Leaving it
 * unpicked keeps the whole work as the target.
 *
 * The full list comes back in one request and filters client-side. A
 * manuscript's section count is small next to an entry corpus, and a
 * filter that matches ancestor titles ("act 2") needs the whole tree.
 */
export default function WorkSectionPicker({ projectId, workId, workTitle, selected, onSelect }: WorkSectionPickerProps) {
    const t = useT();
    const [sections, setSections] = useState<SectionTarget[]>([]);
    const [filter, setFilter] = useState('');

    // No reset here: LinkMoveModal keys this component by work id, so a
    // different work remounts it with fresh filter and section state.
    useEffect(() => {
        fetch(`/api/v1/projects/${projectId}/works/${workId}/section-targets`, {
            headers: { 'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
            credentials: 'same-origin',
        })
            .then((r) => r.ok ? r.json() : [])
            .then(setSections)
            .catch(() => setSections([]));
    }, [projectId, workId]);

    const needle = filter.trim().toLowerCase();
    const visibleSections = needle
        ? sections.filter((section) =>
            [...section.path, section.title].join(PATH_SEPARATOR).toLowerCase().includes(needle))
        : sections;

    return (
        <div className="mt-4">
            <label className="text-xs font-semibold" style={muteText}>
                {t('notes.link_move.section.label')}
            </label>
            <p className="mb-2 mt-0.5 text-[11px]" style={microText}>
                {t('notes.link_move.section.hint').replace(':target', workTitle)}
            </p>

            {selected ? (
                <div className="flex items-center justify-between px-4 py-3" style={selectedChipStyle}>
                    <div className="min-w-0">
                        <span className="block truncate text-sm font-medium">{selected.title}</span>
                        {selected.path.length > 0 && (
                            <span className="block truncate text-[10px]" style={microText}>
                                {selected.path.join(PATH_SEPARATOR)}
                            </span>
                        )}
                    </div>
                    <button
                        type="button"
                        onClick={() => onSelect(null)}
                        className="alex-btn alex-btn--ghost"
                        style={changeButtonStyle}
                    >
                        {t('notes.link_move.destination.change')}
                    </button>
                </div>
            ) : (
                <>
                    <input
                        type="text"
                        value={filter}
                        onChange={(e) => setFilter(e.target.value)}
                        placeholder={t('notes.link_move.section.search')}
                        className="mb-2 h-9 w-full text-sm"
                        style={inputStyle}
                    />
                    {visibleSections.length === 0 ? (
                        sections.length > 0 && (
                            <p className="text-[11px]" style={microText}>{t('notes.link_move.section.empty')}</p>
                        )
                    ) : (
                        <div className="max-h-56" style={scrollingListWrapperStyle}>
                            {visibleSections.map((section, idx) => (
                                <button
                                    key={section.id}
                                    type="button"
                                    data-section-target={section.id}
                                    onClick={() => onSelect(section)}
                                    className="alex-notes-tag-row flex w-full items-center gap-2 py-2 pr-4 text-left text-sm"
                                    style={{
                                        // The unfiltered list draws the tree; filtered hits
                                        // stay flat and wear their ancestry as subtext.
                                        paddingLeft: `${ROW_BASE_INDENT_REM + (needle ? 0 : Math.min(section.depth, ROW_MAX_INDENT_STEPS) * ROW_INDENT_STEP_REM)}rem`,
                                        ...(idx === visibleSections.length - 1 ? {} : { borderBottom: rowDivider }),
                                    }}
                                >
                                    <i className="fa-solid fa-bookmark text-[10px]" style={microText} aria-hidden="true" />
                                    <span className="min-w-0 flex-1">
                                        <span className="block truncate">{section.title}</span>
                                        {needle && section.path.length > 0 && (
                                            <span className="block truncate text-[10px]" style={microText}>
                                                {section.path.join(PATH_SEPARATOR)}
                                            </span>
                                        )}
                                    </span>
                                    {section.label && (
                                        <span className="shrink-0 text-[10px]" style={microText}>{section.label}</span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

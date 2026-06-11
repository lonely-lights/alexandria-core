import { router } from '@inertiajs/react';
import { useEffect, useState, type CSSProperties, type ReactNode } from 'react';

import useT from '@alexandria/hooks/useT';

import type { CurrentSection } from '../Workspace';
import type { SaveStatus } from './useSectionAutosave';

/**
 * Shared workspace-editor chrome — Stage 8g.1.
 *
 * The menu bar (inline section title + label chip + extras slot + save
 * status), the editor surface as children, and the counts footer.
 * Owns the title's local state, server commit (PUT section update with
 * a partial reload), and re-sync after the server normalizes it.
 * ManuscriptEditor and ScreenplayEditor both wrap their surfaces in
 * this so the chrome can't drift between formats.
 */

interface SectionChromeProps {
    projectSlug: string;
    workSlug: string;
    section: CurrentSection;
    canUpdate: boolean;
    status: SaveStatus;
    wordCount: number;
    pageEstimate: number | null;
    /** Extra menu-bar controls, rendered between the label chip and the save status. */
    menuExtras?: ReactNode;
    /** Extra classes for the root flex column (e.g. the screenplay rte-* scope classes). */
    className?: string;
    children: ReactNode;
}

/* ── Theme styles ── */

const labelChipStyle: CSSProperties = {
    background: 'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
    color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    borderRadius: 'var(--theme-radius-badge)',
    padding: '0.125rem 0.5rem',
    fontSize: '0.6875rem',
    fontWeight: 600,
    lineHeight: 1.5,
    textTransform: 'uppercase',
    letterSpacing: '0.04em',
    whiteSpace: 'nowrap',
};

const titleInputStyle: CSSProperties = {
    background: 'transparent',
    border: 'none',
    outline: 'none',
    color: 'var(--theme-base-content)',
};

const menuBarStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const footerStyle: CSSProperties = {
    background: 'var(--theme-base-page)',
    borderTop: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
};

const footerMetaStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const errorTextStyle: CSSProperties = {
    color: 'var(--theme-status-error-stroke)',
};

export default function SectionChrome({
    projectSlug,
    workSlug,
    section,
    canUpdate,
    status,
    wordCount,
    pageEstimate,
    menuExtras,
    className,
    children,
}: SectionChromeProps) {
    const t = useT();
    const [title, setTitle] = useState(section.title);

    // Covers both the section switch and the server-confirmed rename
    // (commitTitle's partial reload trims/normalizes the title).
    useEffect(() => {
        setTitle(section.title);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [section.id, section.title]);

    function commitTitle() {
        const trimmed = title.trim();

        if (!canUpdate || trimmed === '' || trimmed === section.title) {
            setTitle(section.title);
            return;
        }

        router.put(`/works/${projectSlug}/${workSlug}/sections/${section.id}`, { title: trimmed }, {
            preserveScroll: true,
            preserveState: true,
            only: ['sections', 'currentSection'],
        });
    }

    const statusText =
        status === 'saving'
            ? t('writing.workspace.saving')
            : status === 'saved'
                ? t('writing.workspace.saved')
                : status === 'error'
                    ? t('writing.workspace.save_error')
                    : null;

    const wordsLabel = section.target_words !== null
        ? `${t('writing.workspace.words').replace(':count', wordCount.toLocaleString())} ${t('writing.workspace.of_target').replace(':target', section.target_words.toLocaleString())}`
        : t('writing.workspace.words').replace(':count', wordCount.toLocaleString());

    return (
        <div className={`flex h-full min-h-0 flex-col ${className ?? ''}`}>
            {/* Menu bar — title + label on the left, extras + save status on the right */}
            <div className="flex h-12 shrink-0 items-center gap-3 px-4" style={menuBarStyle}>
                {canUpdate ? (
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={commitTitle}
                        className="min-w-0 flex-1 text-lg font-semibold"
                        style={titleInputStyle}
                        aria-label={t('writing.workspace.section_title_placeholder')}
                        placeholder={t('writing.workspace.section_title_placeholder')}
                    />
                ) : (
                    <h2 className="min-w-0 flex-1 truncate text-lg font-semibold">
                        {section.title}
                    </h2>
                )}
                {section.label && (
                    <span className="shrink-0" style={labelChipStyle}>
                        {section.label}
                    </span>
                )}
                {menuExtras}
                {statusText && (
                    <span
                        className="shrink-0 text-xs"
                        style={status === 'error' ? errorTextStyle : footerMetaStyle}
                    >
                        {statusText}
                    </span>
                )}
            </div>

            {/* The editor surface — its own content wrapper scrolls */}
            {children}

            {/* Footer bar — counts only */}
            <footer className="shrink-0" style={footerStyle}>
                <div className="flex items-center justify-end px-4 py-2 text-xs">
                    <span className="shrink-0 tabular-nums" style={footerMetaStyle}>
                        {wordsLabel}
                        {section.format === 'screenplay' && pageEstimate !== null && (
                            <> · {t('writing.workspace.pages').replace(':count', pageEstimate.toLocaleString())}</>
                        )}
                    </span>
                </div>
            </footer>
        </div>
    );
}

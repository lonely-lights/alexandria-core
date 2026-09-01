import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';

import { stanceAccent, stanceInitial } from './patternChips';
import type { PatternStance } from './threadApi';
import usePromiseGroups from './usePromiseGroups';

/**
 * Cross-work "Open promises" block — Task 6 (design doc
 * 2026-08-29-devices-tropes-design.md Surface #5), on the writing hub
 * (`/p/{project}/writing`). Renders `writing.promises.index`'s groups
 * as-is: scope heading, then its threads oldest-first (the backend
 * already sorts both levels — see PatternThreadService::promises).
 * This is the "3 unfired guns with scope ending in this film" view the
 * design doc calls out — no per-work filtering, unlike the Reports
 * Promises group.
 */

export interface OpenPromisesListProps {
    projectSlug: string;
}

const panelStyle: CSSProperties = {
    background: 'var(--theme-surface-card)',
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const panelHeaderStyle: CSSProperties = {
    borderBottom: '1px solid color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
};

const mutedTextStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 50%, transparent)',
};

const scopeHeadingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 45%, transparent)',
    fontSize: '0.6875rem',
    fontWeight: 700,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
};

const rowStyle: CSSProperties = {
    borderRadius: 'var(--theme-radius-button)',
};

function stanceDotStyle(stance: PatternStance | null): CSSProperties {
    const accent = stanceAccent(stance);

    return {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '1rem',
        height: '1rem',
        borderRadius: '999px',
        border: `1px solid ${accent.border}`,
        background: accent.wash,
        color: accent.border,
        fontSize: '0.5625rem',
        fontWeight: 700,
        flexShrink: 0,
    };
}

export default function OpenPromisesList({ projectSlug }: OpenPromisesListProps) {
    const t = useT();
    const { groups, failed } = usePromiseGroups(projectSlug);

    return (
        <aside className="min-w-0" style={panelStyle} data-writing-open-promises>
            <div className="px-5 py-4" style={panelHeaderStyle}>
                <h2 className="font-serif text-lg font-bold tracking-tight">{t('writing.library.promises_heading')}</h2>
            </div>

            <div className="px-5 py-4">
                {failed && (
                    <p className="text-sm italic" style={{ color: 'var(--theme-status-error-stroke)' }}>
                        {t('writing.library.promises_load_error')}
                    </p>
                )}

                {!failed && groups === null && (
                    <p className="text-sm italic" style={mutedTextStyle}>{t('writing.library.loading')}</p>
                )}

                {groups !== null && groups.length === 0 && (
                    <p className="text-sm italic" style={mutedTextStyle}>{t('writing.library.promises_empty')}</p>
                )}

                {groups?.map((group) => (
                    <div key={`${group.scope_type}:${group.scope_id}`} className="mb-4 last:mb-0">
                        <div className="mb-1.5 truncate" style={scopeHeadingStyle}>{group.scope_title}</div>
                        <div className="flex flex-col gap-1">
                            {group.threads.map((thread) => (
                                <div key={thread.id} className="alex-row flex items-center gap-2 px-2 py-1.5 text-sm" style={rowStyle}>
                                    <span style={stanceDotStyle(thread.stance)} aria-hidden="true">
                                        {stanceInitial(thread.stance)}
                                    </span>
                                    <span className="min-w-0 flex-1 truncate font-medium">{thread.title}</span>
                                    <span className="shrink-0 truncate text-xs" style={mutedTextStyle}>{thread.card_name}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </aside>
    );
}

import { Link } from '@inertiajs/react';
import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import { workUrl } from '@alexandria/lib/urls';
import type { WorkAppearance } from '@alexandria/types/entries';
import {
    cardOuter,
    cardInner,
    chipStyle,
    gradientHeaderSecondary,
    headerIconSecondaryMuted,
    labelMuted,
    rowDivider,
} from './entriesTabStyles';

/**
 * "Appears in" card — Stage 8g.1 (Plan 3 Task 4). Shows where this
 * entry surfaces in the project's written works: per work, the
 * sections that reference it as POV, Setting, or a detected [[wiki]]
 * mention. Renders on the Overview tab only when the writing
 * dashboard reports at least one appearance.
 */

const sectionLinkStyle: CSSProperties = {
    color: 'var(--theme-base-content)',
};

export default function AppearancesCard({
    appearances,
    projectSlug,
}: {
    appearances: WorkAppearance[];
    projectSlug: string;
}) {
    const t = useT();

    function sourceLabel(source: string): string {
        switch (source) {
            case 'pov':
                return t('writing.appears_in.pov');
            case 'setting':
                return t('writing.appears_in.setting');
            default:
                return t('writing.appears_in.mention');
        }
    }

    return (
        <div className="paper-board" style={cardOuter}>
            <div className="overflow-hidden" style={cardInner}>
                <div className="flex items-center gap-2 px-5 py-3" style={gradientHeaderSecondary}>
                    <i className="fa-solid fa-feather-pointed text-xs" style={headerIconSecondaryMuted} />
                    <h3 className="text-sm font-semibold">{t('writing.appears_in.title')}</h3>
                </div>
                <div className="px-5 py-4">
                    {appearances.map((group, groupIndex) => (
                        <div key={group.work.slug} className={groupIndex > 0 ? 'mt-4' : undefined}>
                            <h4 className="mb-1 text-xs font-semibold uppercase tracking-wide" style={labelMuted}>
                                {group.work.title}
                            </h4>
                            <div>
                                {group.sections.map((section, sectionIndex) => (
                                    <div
                                        key={section.slug}
                                        className="alex-row flex items-center gap-2 py-2"
                                        style={sectionIndex > 0 ? rowDivider : undefined}
                                    >
                                        <Link
                                            href={workUrl(projectSlug, group.work.slug, section.slug)}
                                            className="min-w-0 flex-1 truncate text-sm font-medium hover:underline"
                                            style={sectionLinkStyle}
                                        >
                                            {section.title}
                                        </Link>
                                        {section.sources.map((source) => (
                                            <span key={source} style={chipStyle}>
                                                {sourceLabel(source)}
                                                {source === 'mention' && section.mention_count > 1 && (
                                                    <> ×{section.mention_count}</>
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

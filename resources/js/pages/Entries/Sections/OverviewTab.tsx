import { type CSSProperties } from 'react';
import useT from '@alexandria/hooks/useT';
import MentionAwareContent from '@alexandria/components/ui/MentionAwareContent';
import Infobox from '@alexandria/components/entries/Infobox';
import type { InfoboxBlock } from '@alexandria/components/entries/Infobox';
import type { EntryShowEntry } from '../Show';

interface OverviewTabProps {
    contentHtml: string | null;
    entry: EntryShowEntry;
    infoboxBlocks: InfoboxBlock[];
}

const cardOuterStyle: CSSProperties = {
    border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
    borderRadius: 'var(--theme-radius-card)',
};

const cardInnerStyle: CSSProperties = {
    background: 'var(--theme-base-200)',
    borderRadius: 'inherit',
};

const proseStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 80%, transparent)',
};

const emptyIconStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 20%, transparent)',
};

const emptyHeadingStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 40%, transparent)',
};

const emptySubStyle: CSSProperties = {
    color: 'color-mix(in srgb, var(--theme-base-content) 30%, transparent)',
};

export default function OverviewTab({ contentHtml, entry, infoboxBlocks }: OverviewTabProps) {
    const t = useT();
    const hasInfobox = infoboxBlocks.length > 0;

    return (
        <div className="paper-board" style={cardOuterStyle}>
            <div className="overflow-hidden p-6 md:p-8" style={cardInnerStyle}>
                {/* Infobox — floated right so content wraps around it.
                    Stays outside the article's prose wrapper so its
                    own styling is preserved. */}
                {hasInfobox && (
                    <div className="float-right mb-6 ml-8 hidden w-[30%] md:block">
                        <Infobox blocks={infoboxBlocks} entryName={entry.name} />
                    </div>
                )}

                {/* Main content — wraps around the floated infobox */}
                {contentHtml ? (
                    <MentionAwareContent
                        html={contentHtml}
                        className="prose prose-sm max-w-none"
                        style={proseStyle}
                    />
                ) : (
                    <div className="flex flex-col items-center py-16 text-center">
                        <i className="fa-solid fa-file-lines mb-3 text-3xl" style={emptyIconStyle} />
                        <p className="text-sm font-medium" style={emptyHeadingStyle}>{t('entries.overview.empty.title')}</p>
                        <p className="mt-1 text-xs" style={emptySubStyle}>
                            {t('entries.overview.empty.subtitle')}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

import MentionAwareContent from '@alexandria/components/ui/MentionAwareContent';
import Infobox from '@alexandria/components/entries/Infobox';
import type { InfoboxBlock } from '@alexandria/components/entries/Infobox';
import type { EntryShowEntry } from '../Show';

interface OverviewTabProps {
    contentHtml: string | null;
    entry: EntryShowEntry;
    infoboxBlocks: InfoboxBlock[];
}

export default function OverviewTab({ contentHtml, entry, infoboxBlocks }: OverviewTabProps) {
    const hasInfobox = infoboxBlocks.length > 0;

    return (
        <div className="paper-board rounded-2xl border border-base-content/10">
            <div className="overflow-hidden bg-base-200 p-6 md:p-8" style={{ borderRadius: 'inherit' }}>
                {/* Infobox — floated right so content wraps around it.
                    Stays outside the article's prose wrapper so its
                    own styling (bg-secondary, padding) is preserved. */}
                {hasInfobox && (
                    <div className="float-right mb-6 ml-8 hidden w-[30%] md:block">
                        <Infobox blocks={infoboxBlocks} entryName={entry.name} />
                    </div>
                )}

                {/* Main content — wraps around the floated infobox */}
                {contentHtml ? (
                    <MentionAwareContent
                        html={contentHtml}
                        className="prose prose-sm max-w-none text-base-content/80"
                    />
                ) : (
                    <div className="flex flex-col items-center py-16 text-center">
                        <i className="fa-solid fa-file-lines mb-3 text-3xl text-base-content/20" />
                        <p className="text-sm font-medium text-base-content/40">No content yet</p>
                        <p className="mt-1 text-xs text-base-content/30">
                            Add content from the Edit page to see it here.
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
}

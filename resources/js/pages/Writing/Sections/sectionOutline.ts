export interface SectionOutlineItem {
    id: string;
    title: string;
    level: 1 | 2 | 3;
}

function cleanHeadingText(text: string): string {
    return text
        .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        .replace(/\[https?:\/\/[^\s\]]+\s+([^\]]+)\]/g, '$1')
        .replace(/'{2,5}|_{2}/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}

export function extractSectionOutline(content: string | null | undefined): SectionOutlineItem[] {
    if (!content) {
        return [];
    }

    const outline: SectionOutlineItem[] = [];
    const seen = new Map<string, number>();
    const headingPattern = /^(={1,3})[ \t]*(.+?)[ \t]*\1[ \t]*$/gm;

    for (const match of content.matchAll(headingPattern)) {
        const level = match[1].length as 1 | 2 | 3;
        const title = cleanHeadingText(match[2]);

        if (!title) {
            continue;
        }

        const baseId = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'heading';
        const count = seen.get(baseId) ?? 0;
        seen.set(baseId, count + 1);

        outline.push({
            id: count === 0 ? baseId : `${baseId}-${count + 1}`,
            title,
            level,
        });
    }

    return outline;
}

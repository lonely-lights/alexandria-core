/**
 * Strips wiki markup from text for display in search results, hover cards, etc.
 * Does not render — just removes syntax characters to produce clean plain text.
 */
export function stripWikiMarkup(text: string): string {
    return text
        // Bold+Italic: '''''text''''' → text
        .replace(/'''''(.+?)'''''/g, '$1')
        // Bold: '''text''' → text
        .replace(/'''(.+?)'''/g, '$1')
        // Italic: ''text'' → text
        .replace(/''(.+?)''/g, '$1')
        // Underline: __text__ → text (only when content between __ is not just more underscores)
        .replace(/__([^_].*?)__/g, '$1')
        // Headings: == Heading == → Heading
        .replace(/^={2,6}\s*(.+?)\s*={2,6}$/gm, '$1')
        // Bullet list: * item → item
        .replace(/^\*\s+/gm, '')
        // Numbered list: # item → item
        .replace(/^#\s+/gm, '')
        // Entry links: [[Entry Name|Display Text]] → Display Text, [[Entry Name]] → Entry Name
        .replace(/\[\[([^|\]]+)\|([^\]]+)\]\]/g, '$2')
        .replace(/\[\[([^\]]+)\]\]/g, '$1')
        // Links: [url display text] → display text
        .replace(/\[https?:\/\/\S+\s+([^\]]+)\]/g, '$1')
        // Clean up any remaining stray quotes
        .replace(/'{2,}/g, '');
}

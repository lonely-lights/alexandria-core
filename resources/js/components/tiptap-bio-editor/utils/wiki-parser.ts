/**
 * Wiki Parser - Converts Alexandria wiki markup to HTML for TipTap
 *
 * This client-side parser mirrors the PHP ContentRendererService processors.
 *
 * Supported syntax:
 * - '''bold''' → <strong>bold</strong>
 * - ''italic'' → <em>italic</em>
 * - __underline__ → <u>underline</u>
 * - '''''bold italic''''' → <strong><em>bold italic</em></strong>
 * - == Heading 2 == → <h2>Heading 2</h2>
 * - === Heading 3 === → <h3>Heading 3</h3>
 * - * bullet item → <ul><li>bullet item</li></ul>
 * - # numbered item → <ol><li>numbered item</li></ol>
 * - [[Entry Name]] → <a data-type="entry-link" data-name="Entry Name">Entry Name</a>
 * - [[Entry Name|Display]] → <a data-type="entry-link" data-name="Entry Name">Display</a>
 * - @username → <a data-type="mention" data-label="username">@username</a>
 * - [url text] → <a href="url">text</a>
 * - [[Image:url]] → <img src="url">
 * - [[YouTube:url]] → <div data-youtube-video="url"></div>
 */

type ListType = 'bullet' | 'ordered';

interface ListItem {
    depth: number;
    content: string;
}

/**
 * Parse wiki markup to HTML, suitable for feeding into TipTap's setContent().
 */
export function parseWikiToHtml(wiki: string): string {
    if (!wiki || typeof wiki !== 'string') {
        return '';
    }

    let html = wiki;

    // Process block elements first (headings, lists)
    html = processHeadings(html);
    html = processLists(html);

    // Process special embeds
    html = processImages(html);
    html = processYoutube(html);

    // Process inline elements
    html = processEntryLinks(html);
    html = processMentions(html);
    html = processExternalLinks(html);
    html = processBoldItalic(html);

    // Process paragraphs
    html = processParagraphs(html);

    return html;
}

/**
 * Process headings: == Text == → <h2>Text</h2>
 */
function processHeadings(text: string): string {
    // H6 to H2 (process longer markers first)
    for (let level = 6; level >= 2; level--) {
        const marker = '='.repeat(level);
        const regex = new RegExp(`^${marker}\\s*(.+?)\\s*${marker}\\s*$`, 'gm');
        text = text.replace(regex, `<h${level}>$1</h${level}>`);
    }
    return text;
}

/**
 * Process bullet and ordered lists.
 */
function processLists(text: string): string {
    const lines = text.split('\n');
    const result: string[] = [];
    let currentList: ListItem[] | null = null;
    let currentType: ListType | null = null;

    for (const line of lines) {
        const bulletMatch = line.match(/^(\*+)\s*(.*)$/);
        const orderedMatch = line.match(/^(#+)\s*(.*)$/);

        if (bulletMatch) {
            const depth = bulletMatch[1].length;
            const content = bulletMatch[2];

            if (currentType !== 'bullet' || !currentList) {
                if (currentList && currentType) {
                    result.push(closeList(currentList, currentType));
                }
                currentList = [];
                currentType = 'bullet';
            }

            currentList.push({ depth, content });
        } else if (orderedMatch) {
            const depth = orderedMatch[1].length;
            const content = orderedMatch[2];

            if (currentType !== 'ordered' || !currentList) {
                if (currentList && currentType) {
                    result.push(closeList(currentList, currentType));
                }
                currentList = [];
                currentType = 'ordered';
            }

            currentList.push({ depth, content });
        } else {
            if (currentList && currentType) {
                result.push(closeList(currentList, currentType));
                currentList = null;
                currentType = null;
            }
            result.push(line);
        }
    }

    if (currentList && currentType) {
        result.push(closeList(currentList, currentType));
    }

    return result.join('\n');
}

/**
 * Close a list and generate HTML.
 */
function closeList(items: ListItem[], type: ListType): string {
    const tag = type === 'bullet' ? 'ul' : 'ol';
    const listItems = items.map((item) => `<li>${item.content}</li>`).join('');
    return `<${tag}>${listItems}</${tag}>`;
}

/**
 * Process images: [[Image:url]] or [[Image:url|alt]]
 */
function processImages(text: string): string {
    return text.replace(/\[\[Image:([^|]+?)(?:\|([^]+?))?\]\]/g, (_match, src: string, alt?: string) => {
        const altText = alt ? escapeHtml(alt) : '';
        return `<img src="${escapeHtml(src)}" alt="${altText}">`;
    });
}

/**
 * Process YouTube embeds: [[YouTube:url]]
 */
function processYoutube(text: string): string {
    return text.replace(/\[\[YouTube:([^]+?)\]\]/g, (_match, src: string) => {
        return `<div data-youtube-video data-src="${escapeHtml(src)}"></div>`;
    });
}

/**
 * Process entry links: [[Entry Name]] or [[Entry Name|Display Text]]
 */
function processEntryLinks(text: string): string {
    return text.replace(/\[\[([^|]+?)(?:\|([^]+?))?\]\]/g, (_match, name: string, displayText?: string) => {
        const display = displayText || name;
        // Use a span with data attributes that TipTap can recognize
        return `<a data-type="entry-link" data-name="${escapeHtml(name)}" class="entry-link">${escapeHtml(display)}</a>`;
    });
}

/**
 * Process user mentions: @username
 */
function processMentions(text: string): string {
    // Match @username (alphanumeric and underscores, 2-30 chars)
    return text.replace(/@([a-zA-Z0-9_]{2,30})(?![a-zA-Z0-9_])/g, (_match, username: string) => {
        return `<a href="/u/${username.toLowerCase()}" data-type="mention" data-id="${escapeHtml(username)}" data-label="${escapeHtml(username)}" class="mention">@${escapeHtml(username)}</a>`;
    });
}

/**
 * Process external links: [url text] or bare URLs
 */
function processExternalLinks(text: string): string {
    // Process [url text] format
    text = text.replace(/\[(\S+)\s+([^]+?)\]/g, (_match, url: string, linkText: string) => {
        return `<a href="${escapeHtml(url)}" rel="noopener noreferrer nofollow">${escapeHtml(linkText)}</a>`;
    });

    return text;
}

/**
 * Process bold, italic, and underline: '''bold''', ''italic'', __underline__, '''''both'''''
 */
function processBoldItalic(text: string): string {
    // Bold+Italic first (5 quotes)
    text = text.replace(/'''''(.+?)'''''/g, '<strong><em>$1</em></strong>');

    // Bold (3 quotes)
    text = text.replace(/'''(.+?)'''/g, '<strong>$1</strong>');

    // Italic (2 quotes)
    text = text.replace(/''(.+?)''/g, '<em>$1</em>');

    // Underline (double underscore)
    text = text.replace(/__(.+?)__/g, '<u>$1</u>');

    return text;
}

/**
 * Process paragraphs: wrap text blocks in <p> tags.
 */
function processParagraphs(text: string): string {
    // Split by double newlines
    const blocks = text.split(/\n{2,}/);

    return blocks
        .map((block) => {
            block = block.trim();
            if (!block) return '';

            // Don't wrap block elements
            if (
                block.startsWith('<h') ||
                block.startsWith('<ul') ||
                block.startsWith('<ol') ||
                block.startsWith('<div') ||
                block.startsWith('<img')
            ) {
                return block;
            }

            // Convert single newlines to <br> within paragraph
            block = block.replace(/\n/g, '<br>');

            return `<p>${block}</p>`;
        })
        .filter((block) => block)
        .join('');
}

/**
 * Escape HTML special characters.
 */
function escapeHtml(text: string): string {
    if (!text) return '';
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

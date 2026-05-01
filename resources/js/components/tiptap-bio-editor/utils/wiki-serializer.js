/**
 * Wiki Serializer - Converts TipTap document to Alexandria wiki markup
 *
 * Supported conversions:
 * - Bold: '''text'''
 * - Italic: ''text''
 * - Underline: __text__
 * - Bold+Italic: '''''text'''''
 * - Headings: == H2 ==, === H3 ===, etc.
 * - Bullet lists: * item
 * - Ordered lists: # item
 * - Links: [url display text] or just the URL
 * - User mentions: @username
 * - Entry links: [[Entry Name]] or [[Entry Name|Display Text]]
 * - Paragraphs: double newline separation
 */

/**
 * Serialize a TipTap editor's content to wiki markup
 * @param {import('@tiptap/core').Editor} editor - The TipTap editor instance
 * @returns {string} Wiki markup string
 */
export function serializeToWiki(editor) {
    const json = editor.getJSON();
    return serializeNode(json);
}

/**
 * Serialize a TipTap JSON node to wiki markup
 * @param {Object} node - TipTap JSON node
 * @param {Object} context - Serialization context (list type, depth, etc.)
 * @returns {string} Wiki markup string
 */
function serializeNode(node, context = {}) {
    if (!node) return '';

    switch (node.type) {
        case 'doc':
            return serializeChildren(node.content, context);

        case 'paragraph':
            return serializeParagraph(node, context);

        case 'heading':
            return serializeHeading(node, context);

        case 'bulletList':
            return serializeList(node, '*', context);

        case 'orderedList':
            return serializeList(node, '#', context);

        case 'listItem':
            return serializeListItem(node, context);

        case 'text':
            return serializeText(node, context);

        case 'hardBreak':
            return '\n';

        case 'image':
            return serializeImage(node, context);

        case 'youtube':
            return serializeYoutube(node, context);

        case 'mention':
            return serializeMention(node, context);

        case 'entryLink':
            return serializeEntryLink(node, context);

        default:
            // For unknown nodes, try to serialize children
            if (node.content) {
                return serializeChildren(node.content, context);
            }
            return '';
    }
}

/**
 * Serialize an array of child nodes
 */
function serializeChildren(children, context) {
    if (!children || !Array.isArray(children)) return '';

    const results = [];
    for (let i = 0; i < children.length; i++) {
        const child = children[i];
        const result = serializeNode(child, context);
        results.push(result);
    }

    // Join with appropriate separator based on context
    if (context.inList) {
        return results.join('');
    }

    // Paragraphs and block elements separated by double newline
    return results.join('\n\n');
}

/**
 * Serialize a paragraph node
 */
function serializeParagraph(node, context) {
    if (!node.content) return '';
    return serializeInlineContent(node.content, context);
}

/**
 * Serialize a heading node
 * H2 = ==, H3 = ===, etc.
 */
function serializeHeading(node, context) {
    const level = node.attrs?.level || 2;
    const marker = '='.repeat(level);
    const content = node.content ? serializeInlineContent(node.content, context) : '';
    return `${marker} ${content} ${marker}`;
}

/**
 * Serialize a list (bullet or ordered)
 */
function serializeList(node, marker, context) {
    if (!node.content) return '';

    const depth = (context.listDepth || 0) + 1;
    const items = [];

    for (const item of node.content) {
        const itemContext = {
            ...context,
            inList: true,
            listMarker: marker,
            listDepth: depth,
        };
        items.push(serializeNode(item, itemContext));
    }

    return items.join('\n');
}

/**
 * Serialize a list item
 */
function serializeListItem(node, context) {
    const marker = context.listMarker || '*';
    const depth = context.listDepth || 1;
    const prefix = marker.repeat(depth) + ' ';

    if (!node.content) return prefix;

    // List items can contain paragraphs or nested lists
    const parts = [];
    for (const child of node.content) {
        if (child.type === 'paragraph') {
            parts.push(prefix + serializeInlineContent(child.content, context));
        } else if (child.type === 'bulletList' || child.type === 'orderedList') {
            // Nested list - serialize with increased depth
            parts.push(serializeNode(child, context));
        } else {
            parts.push(serializeNode(child, context));
        }
    }

    return parts.join('\n');
}

/**
 * Serialize inline content (text with marks)
 */
function serializeInlineContent(content, context) {
    if (!content || !Array.isArray(content)) return '';
    return content.map(node => serializeNode(node, context)).join('');
}

/**
 * Serialize a text node with its marks (bold, italic, underline, link, etc.)
 */
function serializeText(node) {
    let text = node.text || '';

    if (!node.marks || node.marks.length === 0) {
        return text;
    }

    // Sort marks to handle nesting properly (bold+italic = ''''')
    const marks = [...node.marks];

    // Check for formatting marks
    const hasBold = marks.some(m => m.type === 'bold');
    const hasItalic = marks.some(m => m.type === 'italic');
    const hasUnderline = marks.some(m => m.type === 'underline');
    const hasLink = marks.find(m => m.type === 'link');

    // Apply link first (outermost)
    if (hasLink) {
        const href = hasLink.attrs?.href || '';
        // Use simple format: [url text] or just url if text matches
        if (text === href) {
            text = href;
        } else {
            text = `[${href} ${text}]`;
        }
    }

    // Apply underline (innermost after link)
    if (hasUnderline) {
        text = `__${text}__`;
    }

    // Apply bold+italic or individual marks
    if (hasBold && hasItalic) {
        text = `'''''${text}'''''`;
    } else if (hasBold) {
        text = `'''${text}'''`;
    } else if (hasItalic) {
        text = `''${text}''`;
    }

    return text;
}

/**
 * Serialize an image node
 */
function serializeImage(node) {
    const src = node.attrs?.src || '';
    const alt = node.attrs?.alt || '';

    if (alt) {
        return `[[Image:${src}|${alt}]]`;
    }
    return `[[Image:${src}]]`;
}

/**
 * Serialize a YouTube embed
 */
function serializeYoutube(node) {
    const src = node.attrs?.src || '';
    return `[[YouTube:${src}]]`;
}

/**
 * Serialize a user mention (@username)
 */
function serializeMention(node) {
    const label = node.attrs?.label || node.attrs?.id || '';
    return `@${label}`;
}

/**
 * Serialize an entry link ([[Entry Name]])
 */
function serializeEntryLink(node) {
    const name = node.attrs?.name || node.attrs?.label || '';
    const displayText = node.attrs?.displayText || '';

    if (displayText && displayText !== name) {
        return `[[${name}|${displayText}]]`;
    }
    return `[[${name}]]`;
}


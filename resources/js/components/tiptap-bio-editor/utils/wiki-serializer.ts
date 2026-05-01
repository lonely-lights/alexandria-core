import type { Editor } from '@tiptap/core';

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
 * Shape of a TipTap JSON document/node. The Tiptap public type is `JSONContent`,
 * but it isn't re-exported from `@tiptap/core` cleanly enough for our needs;
 * we restate the relevant subset locally.
 */
interface WikiNode {
    type?: string;
    text?: string;
    attrs?: Record<string, unknown>;
    marks?: WikiMark[];
    content?: WikiNode[];
}

interface WikiMark {
    type: string;
    attrs?: Record<string, unknown>;
}

interface SerializeContext {
    inList?: boolean;
    listMarker?: string;
    listDepth?: number;
}

/**
 * Serialize a TipTap editor's content to wiki markup.
 */
export function serializeToWiki(editor: Editor): string {
    const json = editor.getJSON() as WikiNode;
    return serializeNode(json);
}

/**
 * Serialize a TipTap JSON node to wiki markup.
 */
function serializeNode(node: WikiNode | undefined, context: SerializeContext = {}): string {
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
            return serializeText(node);

        case 'hardBreak':
            return '\n';

        case 'image':
            return serializeImage(node);

        case 'youtube':
            return serializeYoutube(node);

        case 'mention':
            return serializeMention(node);

        case 'entryLink':
            return serializeEntryLink(node);

        default:
            // For unknown nodes, try to serialize children
            if (node.content) {
                return serializeChildren(node.content, context);
            }
            return '';
    }
}

/**
 * Serialize an array of child nodes.
 */
function serializeChildren(children: WikiNode[] | undefined, context: SerializeContext): string {
    if (!children || !Array.isArray(children)) return '';

    const results: string[] = [];
    for (const child of children) {
        results.push(serializeNode(child, context));
    }

    // Join with appropriate separator based on context
    if (context.inList) {
        return results.join('');
    }

    // Paragraphs and block elements separated by double newline
    return results.join('\n\n');
}

/**
 * Serialize a paragraph node.
 */
function serializeParagraph(node: WikiNode, context: SerializeContext): string {
    if (!node.content) return '';
    return serializeInlineContent(node.content, context);
}

/**
 * Serialize a heading node. H2 = ==, H3 = ===, etc.
 */
function serializeHeading(node: WikiNode, context: SerializeContext): string {
    const level = (node.attrs?.level as number | undefined) ?? 2;
    const marker = '='.repeat(level);
    const content = node.content ? serializeInlineContent(node.content, context) : '';
    return `${marker} ${content} ${marker}`;
}

/**
 * Serialize a list (bullet or ordered).
 */
function serializeList(node: WikiNode, marker: string, context: SerializeContext): string {
    if (!node.content) return '';

    const depth = (context.listDepth ?? 0) + 1;
    const items: string[] = [];

    for (const item of node.content) {
        const itemContext: SerializeContext = {
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
 * Serialize a list item.
 */
function serializeListItem(node: WikiNode, context: SerializeContext): string {
    const marker = context.listMarker ?? '*';
    const depth = context.listDepth ?? 1;
    const prefix = marker.repeat(depth) + ' ';

    if (!node.content) return prefix;

    // List items can contain paragraphs or nested lists
    const parts: string[] = [];
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
 * Serialize inline content (text with marks).
 */
function serializeInlineContent(content: WikiNode[] | undefined, context: SerializeContext): string {
    if (!content || !Array.isArray(content)) return '';
    return content.map((node) => serializeNode(node, context)).join('');
}

/**
 * Serialize a text node with its marks (bold, italic, underline, link, etc.).
 */
function serializeText(node: WikiNode): string {
    let text = node.text ?? '';

    if (!node.marks || node.marks.length === 0) {
        return text;
    }

    // Sort marks to handle nesting properly (bold+italic = ''''')
    const marks = [...node.marks];

    // Check for formatting marks
    const hasBold = marks.some((m) => m.type === 'bold');
    const hasItalic = marks.some((m) => m.type === 'italic');
    const hasUnderline = marks.some((m) => m.type === 'underline');
    const linkMark = marks.find((m) => m.type === 'link');

    // Apply link first (outermost)
    if (linkMark) {
        const href = (linkMark.attrs?.href as string | undefined) ?? '';
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
 * Serialize an image node.
 */
function serializeImage(node: WikiNode): string {
    const src = (node.attrs?.src as string | undefined) ?? '';
    const alt = (node.attrs?.alt as string | undefined) ?? '';

    if (alt) {
        return `[[Image:${src}|${alt}]]`;
    }
    return `[[Image:${src}]]`;
}

/**
 * Serialize a YouTube embed.
 */
function serializeYoutube(node: WikiNode): string {
    const src = (node.attrs?.src as string | undefined) ?? '';
    return `[[YouTube:${src}]]`;
}

/**
 * Serialize a user mention (@username).
 */
function serializeMention(node: WikiNode): string {
    const label = (node.attrs?.label as string | undefined) ?? (node.attrs?.id as string | undefined) ?? '';
    return `@${label}`;
}

/**
 * Serialize an entry link ([[Entry Name]]).
 */
function serializeEntryLink(node: WikiNode): string {
    const name = (node.attrs?.name as string | undefined) ?? (node.attrs?.label as string | undefined) ?? '';
    const displayText = (node.attrs?.displayText as string | undefined) ?? '';

    if (displayText && displayText !== name) {
        return `[[${name}|${displayText}]]`;
    }
    return `[[${name}]]`;
}

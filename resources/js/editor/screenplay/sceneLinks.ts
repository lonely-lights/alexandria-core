import type { JSONContent } from "@tiptap/core";

export interface ScreenplaySceneLink {
    key: string;
    id: number | string | null;
    name: string;
    displayText: string;
    slug: string | null;
    blueprintSlug: string | null;
    mentions: number;
    characterCues: number;
    dialogueWords: number;
}

interface LinkRef {
    key: string;
    id: number | string | null;
    name: string;
    displayText: string;
    slug: string | null;
    blueprintSlug: string | null;
}

function textFromNode(node: JSONContent): string {
    if (node.type === "text") {
        return node.text ?? "";
    }

    return (node.content ?? []).map(textFromNode).join("");
}

function collectEntryLinks(node: JSONContent): LinkRef[] {
    if (node.type === "entryLink") {
        const id = (node.attrs?.id as number | string | null | undefined) ?? null;
        const name = (node.attrs?.name as string | undefined) ?? "";
        const displayText = textFromNode(node)
            || (node.attrs?.displayText as string | undefined)
            || name;

        if (name === "") {
            return [];
        }

        return [
            {
                key: id !== null ? `id:${id}` : `name:${name}`,
                id,
                name,
                displayText,
                slug: (node.attrs?.slug as string | null | undefined) ?? null,
                blueprintSlug: (node.attrs?.blueprintSlug as string | null | undefined) ?? null,
            },
        ];
    }

    return (node.content ?? []).flatMap(collectEntryLinks);
}

function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function sceneBounds(doc: JSONContent, activeBlockIndex: number): { start: number; end: number } {
    const blocks = doc.content ?? [];
    let start = 0;
    let end = blocks.length;

    for (let index = Math.min(activeBlockIndex, blocks.length - 1); index >= 0; index -= 1) {
        if (blocks[index]?.type === "slugline") {
            start = index;
            break;
        }
    }

    for (let index = Math.max(activeBlockIndex + 1, start + 1); index < blocks.length; index += 1) {
        if (blocks[index]?.type === "slugline") {
            end = index;
            break;
        }
    }

    return { start, end };
}

export function extractScreenplaySceneLinks(
    doc: JSONContent,
    activeBlockIndex: number,
): ScreenplaySceneLink[] {
    const blocks = doc.content ?? [];
    const { start, end } = sceneBounds(doc, activeBlockIndex);
    const links = new Map<string, ScreenplaySceneLink>();
    let activeCharacterKeys: string[] = [];

    function ensureLink(ref: LinkRef): ScreenplaySceneLink {
        const existing = links.get(ref.key);

        if (existing !== undefined) {
            return existing;
        }

        const link: ScreenplaySceneLink = {
            key: ref.key,
            id: ref.id,
            name: ref.name,
            displayText: ref.displayText,
            slug: ref.slug,
            blueprintSlug: ref.blueprintSlug,
            mentions: 0,
            characterCues: 0,
            dialogueWords: 0,
        };

        links.set(ref.key, link);

        return link;
    }

    for (let index = start; index < end; index += 1) {
        const block = blocks[index];

        if (!block) {
            continue;
        }

        const refs = collectEntryLinks(block);

        for (const ref of refs) {
            const link = ensureLink(ref);
            link.mentions += 1;

            if (block.type === "character") {
                link.characterCues += 1;
            }
        }

        if (block.type === "character") {
            activeCharacterKeys = refs.map((ref) => ref.key);
        } else if (block.type === "dialogue" && activeCharacterKeys.length > 0) {
            const words = countWords(textFromNode(block));

            for (const key of activeCharacterKeys) {
                const link = links.get(key);

                if (link !== undefined) {
                    link.dialogueWords += words;
                }
            }
        } else if (block.type !== "parenthetical") {
            activeCharacterKeys = [];
        }
    }

    return [...links.values()].sort((a, b) => {
        if (b.characterCues !== a.characterCues) {
            return b.characterCues - a.characterCues;
        }

        if (b.mentions !== a.mentions) {
            return b.mentions - a.mentions;
        }

        return a.name.localeCompare(b.name);
    });
}

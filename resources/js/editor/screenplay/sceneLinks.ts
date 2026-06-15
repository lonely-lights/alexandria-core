import type { JSONContent } from "@tiptap/core";

export interface ScreenplaySceneLink {
    key: string;
    id: number | string | null;
    name: string;
    displayText: string;
    variants: Array<{
        text: string;
        mentions: number;
        characterCues: number;
    }>;
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

function normalizeSpaces(text: string): string {
    return text.replace(/\s+/g, " ").trim();
}

function stripContinuationSuffix(text: string): string {
    return normalizeSpaces(
        text.replace(
            /\s*\((?:CONT\.?|CONT'D|CONTINUED)\)\s*$/i,
            "",
        ),
    );
}

function characterRef(ref: LinkRef): LinkRef {
    if (ref.id !== null) {
        return ref;
    }

    const name = stripContinuationSuffix(ref.name);

    return {
        ...ref,
        key: `name:${name.toLocaleLowerCase()}`,
        name,
    };
}

function countWords(text: string): number {
    return text.trim().split(/\s+/).filter(Boolean).length;
}

function stripParentheticals(text: string): string {
    return text.replace(/\([^)]*\)/g, " ");
}

function countDialogueWords(text: string): number {
    return countWords(stripParentheticals(text));
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

    function addVariant(
        link: ScreenplaySceneLink,
        text: string,
        isCharacterCue: boolean,
    ): void {
        const variantText = normalizeSpaces(text);

        if (variantText === "") {
            return;
        }

        let variant = link.variants.find((item) => item.text === variantText);

        if (variant === undefined) {
            variant = { text: variantText, mentions: 0, characterCues: 0 };
            link.variants.push(variant);
        }

        variant.mentions += 1;

        if (isCharacterCue) {
            variant.characterCues += 1;
        }
    }

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
            variants: [],
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

        const refs = collectEntryLinks(block)
            .map((ref) => (block.type === "character" ? characterRef(ref) : ref));
        const characterCue = block.type === "character"
            ? normalizeSpaces(textFromNode(block))
            : "";

        for (const ref of refs) {
            const link = ensureLink(ref);
            link.mentions += 1;
            addVariant(
                link,
                characterCue !== "" ? characterCue : ref.displayText,
                block.type === "character",
            );

            if (block.type === "character") {
                link.characterCues += 1;
            }
        }

        if (block.type === "character") {
            activeCharacterKeys = refs.map((ref) => ref.key);
        } else if (block.type === "dialogue" && activeCharacterKeys.length > 0) {
            const words = countDialogueWords(textFromNode(block));

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

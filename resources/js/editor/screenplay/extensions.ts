import { Extension, Node, type Editor, type JSONContent } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

import createEntryLinkExtension from "../../components/tiptap-bio-editor/extensions/entry-link";
import { ELEMENTS, ENTER_NEXT, TAB_CYCLE } from "./formatSpec";
import type { ScreenplayBlock, ScreenplayElement } from "./types";

/**
 * Screenplay TipTap extensions — Stage 8g.1 (Plan 3 Task 2).
 *
 * The schema IS the format: the document override only admits the six
 * screenplay block nodes, so headings/lists/marks are impossible by
 * construction. Element flow (Enter/Tab/`(`) follows formatSpec.ts.
 */

function isScreenplayElement(name: string): name is ScreenplayElement {
    return (ELEMENTS as string[]).includes(name);
}

/** Doc override — the schema itself enforces the format. */
const ScreenplayDocument = Node.create({
    name: "doc",
    topNode: true,
    content: "screenplayBlock+",
});

/** Plain text node (StarterKit isn't loaded in the screenplay editor). */
const ScreenplayText = Node.create({
    name: "text",
    group: "inline",
});

/**
 * One factory for the six block nodes. Each renders as
 * `<p data-element="<name>" class="sp-<name>">` (layout lives in
 * resources/css/components/screenplay.css). Action and character
 * additionally admit the inline `entryLink` atom so worldbuilding links
 * can annotate action beats and tie character cues to entries.
 */
function createScreenplayBlock(name: ScreenplayElement, content = "text*") {
    return Node.create({
        name,
        group: "screenplayBlock",
        content,

        parseHTML() {
            return [{ tag: `p[data-element="${name}"]` }];
        },

        renderHTML() {
            return ["p", { "data-element": name, class: `sp-${name}` }, 0];
        },
    });
}

const Slugline = createScreenplayBlock("slugline");
const Action = createScreenplayBlock("action", "(text | entryLink)*");
const Character = createScreenplayBlock("character", "(text | entryLink)*");
const Parenthetical = createScreenplayBlock("parenthetical");
const Dialogue = createScreenplayBlock("dialogue");
const Transition = createScreenplayBlock("transition");

/* ── Keymap ── */

/**
 * Enter:
 * - empty block → CONVERT it per ENTER_NEXT instead of inserting (an
 *   empty block would vanish on serialize anyway);
 * - cursor at the END of a non-empty block → split into a new block of
 *   type ENTER_NEXT[current];
 * - mid-text (or a non-empty selection) → default-style split keeping
 *   the current type.
 *
 * Always returns true — the StarterKit Enter chain isn't loaded here,
 * and falling through to ProseMirror's base commands could try to
 * create a (nonexistent) paragraph.
 */
function handleEnter(editor: Editor): boolean {
    const { selection } = editor.state;
    const { $from, empty } = selection;
    const parent = $from.parent;

    if (!isScreenplayElement(parent.type.name)) {
        return false;
    }

    if (!empty) {
        editor.chain().deleteSelection().splitBlock().run();

        return true;
    }

    const element = parent.type.name;
    const next = ENTER_NEXT[element];

    if (parent.content.size === 0) {
        if (next !== element) {
            editor.commands.setNode(next);
        }

        return true;
    }

    if ($from.parentOffset === parent.content.size) {
        // ALWAYS setNode after an at-end split: ProseMirror fills the
        // fresh block with the schema's default type (the first
        // registered node — slugline), so even a same-type transition
        // (action → action) needs the explicit conversion. Caught by
        // the Plan 4 browser smokes.
        editor.chain().splitBlock().setNode(next).run();

        return true;
    }

    editor.commands.splitBlock();

    return true;
}

/**
 * Tab / Shift-Tab:
 * - EMPTY block whose type is in TAB_CYCLE → cycle forward/backward
 *   (action → character → transition → slugline → action);
 * - otherwise Tab in character or dialogue → convert to parenthetical
 *   (covers dialogue in ANY content state — empty dialogue isn't in
 *   the cycle — and character WITH text; an empty character cycles so
 *   the documented TAB_CYCLE stays reachable past it);
 * - otherwise consume the keystroke (never insert \t / move focus).
 */
function handleTab(editor: Editor, direction: 1 | -1): boolean {
    const parent = editor.state.selection.$from.parent;

    if (!isScreenplayElement(parent.type.name)) {
        return true;
    }

    const element = parent.type.name;

    if (parent.content.size === 0) {
        const index = TAB_CYCLE.indexOf(element);

        if (index !== -1) {
            const length = TAB_CYCLE.length;
            editor.commands.setNode(TAB_CYCLE[(index + direction + length) % length]);

            return true;
        }
    }

    if (direction === 1 && (element === "character" || element === "dialogue")) {
        editor.commands.setNode("parenthetical");
    }

    return true;
}

const ScreenplayKeymap = Extension.create({
    name: "screenplayKeymap",

    // Above the default extension priority (100) so these win over any
    // other handlers.
    priority: 1000,

    addKeyboardShortcuts() {
        // Final Draft's element numbers (Scene Heading 0 … Transition 5),
        // Alt-shifted because browsers reserve plain Mod+1-8 for tab
        // switching: Ctrl+Alt+N on Windows, ⌘⌥N on Mac (the latter is
        // Final Draft's own Mac binding).
        const elementShortcuts = Object.fromEntries(
            (
                [
                    ["0", "slugline"],
                    ["1", "action"],
                    ["2", "character"],
                    ["3", "parenthetical"],
                    ["4", "dialogue"],
                    ["5", "transition"],
                ] as const
            ).map(([digit, element]) => [
                `Mod-Alt-${digit}`,
                ({ editor }: { editor: Editor }) => {
                    convertCurrentBlock(editor, element);

                    return true;
                },
            ]),
        );

        return {
            Enter: ({ editor }) => handleEnter(editor),
            Tab: ({ editor }) => handleTab(editor, 1),
            "Shift-Tab": ({ editor }) => handleTab(editor, -1),
            ...elementShortcuts,
        };
    },

    addProseMirrorPlugins() {
        const extension = this;

        return [
            new Plugin({
                key: new PluginKey("screenplayParenInput"),
                props: {
                    // `(` typed at the start of an EMPTY dialogue block
                    // converts it to a parenthetical and consumes the
                    // keystroke — the wrapping parens render via CSS
                    // ::before/::after, so the stored text stays
                    // unwrapped, matching the codec's canonical form.
                    handleTextInput(view, _from, _to, text): boolean {
                        if (text !== "(") {
                            return false;
                        }

                        const { $from, empty } = view.state.selection;
                        const parent = $from.parent;

                        if (
                            !empty ||
                            parent.type.name !== "dialogue" ||
                            parent.content.size !== 0
                        ) {
                            return false;
                        }

                        extension.editor.commands.setNode("parenthetical");

                        return true;
                    },
                },
            }),
        ];
    },
});

/**
 * The full extension array for a screenplay editor instance.
 *
 * Placeholder is deliberately omitted (the "INT. ..." hint): its
 * empty-node decoration CSS targets paragraph geometry and fights the
 * indented screenplay elements — revisit if onboarding needs it.
 */
export function buildScreenplayExtensions({ projectId }: { projectId?: number } = {}) {
    return [
        ScreenplayDocument,
        ScreenplayText,
        Slugline,
        Action,
        Character,
        Parenthetical,
        Dialogue,
        Transition,
        createEntryLinkExtension({ projectId: projectId ?? null, triggers: ["[[", "@"] }),
        ScreenplayKeymap,
    ];
}

/* ── Doc ↔ blocks bridge ── */

/**
 * Entry links inside action/character serialize back to wiki text using the
 * exact emission format of wiki-serializer.ts's serializeEntryLink:
 * `[[Name]]`, or `[[Name|Display]]` when a distinct display text is
 * set.
 */
function inlineNodeToText(node: JSONContent): string {
    if (node.type === "text") {
        return node.text ?? "";
    }

    if (node.type === "entryLink") {
        const name = (node.attrs?.name as string | undefined) ?? "";
        const displayText = (node.content ?? []).map(inlineNodeToText).join("")
            || (node.attrs?.displayText as string | undefined)
            || "";

        if (displayText && displayText !== name) {
            return `[[${name}|${displayText}]]`;
        }

        return `[[${name}]]`;
    }

    return "";
}

const WIKI_LINK_PATTERN = /\[\[([^|\]]+)(?:\|([^\]]+))?\]\]/g;

function blockAllowsEntryLinks(element: ScreenplayElement): boolean {
    return element === "action" || element === "character";
}

function inlineContentFromText(text: string, allowEntryLinks: boolean): JSONContent[] {
    if (!allowEntryLinks) {
        return text === "" ? [] : [{ type: "text", text }];
    }

    const content: JSONContent[] = [];
    let cursor = 0;

    for (const match of text.matchAll(WIKI_LINK_PATTERN)) {
        const index = match.index ?? 0;

        if (index > cursor) {
            content.push({ type: "text", text: text.slice(cursor, index) });
        }

        const name = match[1];
        const displayText = match[2] ?? name;
        content.push({
            type: "entryLink",
            attrs: {
                id: null,
                name,
                displayText,
                slug: null,
                blueprintSlug: null,
            },
        });
        cursor = index + match[0].length;
    }

    if (cursor < text.length) {
        content.push({ type: "text", text: text.slice(cursor) });
    }

    return content;
}

/**
 * Blocks → TipTap doc JSON. Parenthetical text arrives WITHOUT parens
 * (codec canonical form) and stays unwrapped — the CSS renders the
 * parens. `[[...]]` wiki links hydrate as entryLink atoms in blocks that
 * admit links, so saved screenplay references remain inspectable after
 * reload.
 *
 * Multi-line block text (codec runs can join lines with \n) splits
 * into consecutive sibling blocks of the same element — text nodes
 * can't hold newlines, and the codec re-merges dialogue lines under a
 * character on the next parse anyway.
 */
export function blocksToDoc(blocks: ScreenplayBlock[]): JSONContent {
    const content: JSONContent[] = [];

    for (const block of blocks) {
        for (const line of block.text.split("\n")) {
            const inlineContent = inlineContentFromText(line, blockAllowsEntryLinks(block.element));

            content.push({
                type: block.element,
                ...(inlineContent.length > 0 ? { content: inlineContent } : {}),
            });
        }
    }

    // The doc demands `screenplayBlock+` — an empty section opens on a
    // single empty action block.
    if (content.length === 0) {
        content.push({ type: "action" });
    }

    return { type: "doc", content };
}

/**
 * Convert the current block to another element, first flattening any
 * entryLink atoms back to their [[wiki]] text — every element except
 * action only admits plain text, and a bare setNode would silently
 * drop the atoms (data loss).
 */
export function convertCurrentBlock(editor: Editor, element: ScreenplayElement): void {
    const { $from } = editor.state.selection;
    const parent = $from.parent;

    let hasEntryLinks = false;
    parent.forEach((child) => {
        if (child.type.name === "entryLink") {
            hasEntryLinks = true;
        }
    });

    if (!hasEntryLinks || blockAllowsEntryLinks(element)) {
        editor.commands.setNode(element);

        return;
    }

    // Same emission docToBlocks uses, so [[Name|Display]] round-trips
    // through the codec exactly.
    const text = ((parent.toJSON() as JSONContent).content ?? [])
        .map(inlineNodeToText)
        .join("");

    // One transaction (a chain is a single tr): replace the whole
    // block with a plain-text node of the target element.
    editor
        .chain()
        .insertContentAt(
            { from: $from.before(), to: $from.after() },
            {
                type: element,
                ...(text !== "" ? { content: [{ type: "text", text }] } : {}),
            },
        )
        .run();
}

/** TipTap doc JSON → blocks (inverse of blocksToDoc). */
export function docToBlocks(doc: JSONContent): ScreenplayBlock[] {
    const blocks: ScreenplayBlock[] = [];

    for (const node of doc.content ?? []) {
        const element = node.type ?? "";

        if (!isScreenplayElement(element)) {
            continue;
        }

        blocks.push({
            element,
            text: (node.content ?? []).map(inlineNodeToText).join(""),
        });
    }

    return blocks;
}

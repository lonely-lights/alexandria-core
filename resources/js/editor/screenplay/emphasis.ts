export type ScreenplayMark = "bold" | "italic" | "underline";

export interface ScreenplayTextRun {
    text: string;
    marks: ScreenplayMark[];
}

export const SCREENPLAY_MARKS: ScreenplayMark[] = [
    "bold",
    "italic",
    "underline",
];
const OPEN_ORDER: ScreenplayMark[] = ["underline", "bold", "italic"];
const DELIMITERS: Record<ScreenplayMark, string> = {
    bold: "**",
    italic: "*",
    underline: "_",
};
const INLINE_TOKENS =
    /\\([\\*_nN])|(\[\[([^\]|]+)(?:\|([^\]]+))?\]\])|(\*+)|(_)/g;

/** Fountain emphasis. Unpaired delimiters and wiki-link targets stay literal. */
export function parseScreenplayEmphasis(text: string): ScreenplayTextRun[] {
    const tokens: Array<{
        text: string;
        mark?: ScreenplayMark;
        paired?: boolean;
    }> = [];
    const open = new Map<
        ScreenplayMark,
        { index: number; characters: number }
    >();
    let characters = 0;
    let cursor = 0;
    const literal = (value: string) => {
        if (value !== "") {
            tokens.push({ text: value });
        }

        characters += value.length;
    };
    const delimiter = (mark: ScreenplayMark) => {
        const token = { text: DELIMITERS[mark], mark, paired: false };
        const previous = open.get(mark);

        if (previous) {
            if (characters > previous.characters) {
                token.paired = true;
                tokens[previous.index].paired = true;
            }

            open.delete(mark);
        } else {
            open.set(mark, { index: tokens.length, characters });
        }

        tokens.push(token);
    };

    for (const match of text.matchAll(INLINE_TOKENS)) {
        const index = match.index ?? 0;
        literal(text.slice(cursor, index));

        if (match[1] !== undefined) {
            literal(/[nN]/.test(match[1]) ? "\n" : match[1]);
        } else if (match[2] !== undefined) {
            literal(match[2]);
        } else if (match[5] !== undefined) {
            let stars = match[5].length;

            // Close existing styles before opening a different adjacent style.
            if (open.has("italic") && stars % 2 === 1) {
                delimiter("italic");
                stars--;
            }

            if (open.has("bold") && stars >= 2) {
                delimiter("bold");
                stars -= 2;
            }

            while (stars >= 2) {
                delimiter("bold");
                stars -= 2;
            }

            if (stars === 1) {
                delimiter("italic");
            }
        } else {
            delimiter("underline");
        }

        cursor = index + match[0].length;
    }

    literal(text.slice(cursor));

    const active = new Set<ScreenplayMark>();
    const runs: ScreenplayTextRun[] = [];

    for (const token of tokens) {
        if (token.mark && token.paired) {
            if (active.has(token.mark)) {
                active.delete(token.mark);
            } else {
                active.add(token.mark);
            }

            continue;
        }

        const marks = SCREENPLAY_MARKS.filter((mark) => active.has(mark));
        const last = runs[runs.length - 1];

        if (last && last.marks.join(",") === marks.join(",")) {
            last.text += token.text;
        } else {
            runs.push({ text: token.text, marks });
        }
    }

    return runs;
}

export function serializeScreenplayEmphasis(runs: ScreenplayTextRun[]): string {
    let active: ScreenplayMark[] = [];
    let result = "";

    for (const run of runs) {
        if (run.text === "") {
            continue;
        }

        for (const mark of [...OPEN_ORDER].reverse()) {
            if (active.includes(mark) && !run.marks.includes(mark)) {
                result += DELIMITERS[mark];
            }
        }

        for (const mark of OPEN_ORDER) {
            if (!active.includes(mark) && run.marks.includes(mark)) {
                result += DELIMITERS[mark];
            }
        }

        // Link display text is encoded separately; never escape its target.
        // Explicit soft breaks stay inside their element, including blank lines.
        result += run.text.replace(
            /\[\[([^\]|]+)(?:\|([^\]]+))?\]\]|[\\*_\n]/g,
            (value) =>
                value.startsWith("[[")
                    ? value
                    : value === "\n"
                      ? "\\n"
                      : `\\${value}`,
        );
        active = run.marks;
    }

    for (const mark of [...OPEN_ORDER].reverse()) {
        if (active.includes(mark)) {
            result += DELIMITERS[mark];
        }
    }

    return result;
}

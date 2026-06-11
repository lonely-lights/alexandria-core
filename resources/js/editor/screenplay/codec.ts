import type { ScreenplayBlock } from "./types";

/**
 * Screenplay text codec — a Fountain-flavored plain-text serialization for
 * screenplay sections.
 *
 * Canonical-form guarantees (what makes round-trips deterministic):
 * - slugline / character / transition text is uppercased AT PARSE, so the
 *   stored form is stable and `parse(serialize(blocks))` deep-equals
 *   `blocks` for any blocks the editor can produce;
 * - parenthetical text is stored WITHOUT the wrapping parens (serialize
 *   re-wraps);
 * - serialize emits force-marker escapes (`.` slugline, `>` transition,
 *   `@` character, `!` action) whenever the canonical emission would
 *   otherwise re-parse as a different element.
 *
 * Wiki links `[[Name|Display]]` are just text to the codec and pass through
 * verbatim.
 */
const SLUGLINE_PREFIX = /^(INT|EXT|EST|INT\.?\/EXT|I\/E)[.\s]/i;

const FORCE_MARKER = /^[.>@!]/;

const FULLY_PARENTHESIZED = /^\(.*\)$/;

/** At least one letter, no lowercase letters (digits/punct/spaces fine). */
function isAllCaps(line: string): boolean {
    return /\p{Lu}/u.test(line) && !/\p{Ll}/u.test(line);
}

export function parseScreenplay(text: string): ScreenplayBlock[] {
    const lines = text
        .replace(/\r\n?/g, "\n")
        .split("\n")
        .map((line) => line.replace(/\s+$/u, ""));

    const blocks: ScreenplayBlock[] = [];
    let run: string[] = [];

    for (const line of lines) {
        if (line === "") {
            if (run.length > 0) {
                parseRun(run, blocks);
                run = [];
            }
        } else {
            run.push(line);
        }
    }

    if (run.length > 0) {
        parseRun(run, blocks);
    }

    return blocks;
}

/**
 * Parse one run (consecutive non-blank lines). A forced slugline, transition,
 * or action consumes only its own line — the remaining lines re-process as a
 * new run. A (forced or natural) character consumes the rest of the run as
 * parenthetical/dialogue blocks.
 */
function parseRun(lines: string[], blocks: ScreenplayBlock[]): void {
    if (lines.length === 0) {
        return;
    }

    const first = lines[0];
    const rest = lines.slice(1);

    switch (first[0]) {
        case ".":
            blocks.push({
                element: "slugline",
                text: first.slice(1).toUpperCase(),
            });
            parseRun(rest, blocks);

            return;
        case ">":
            blocks.push({
                element: "transition",
                text: first.slice(1).toUpperCase(),
            });
            parseRun(rest, blocks);

            return;
        case "!":
            blocks.push({ element: "action", text: first.slice(1) });
            parseRun(rest, blocks);

            return;
        case "@":
            blocks.push({
                element: "character",
                text: first.slice(1).toUpperCase(),
            });
            parseSpeechLines(rest, blocks);

            return;
    }

    if (lines.length === 1 && SLUGLINE_PREFIX.test(first)) {
        blocks.push({ element: "slugline", text: first.toUpperCase() });

        return;
    }

    if (lines.length === 1 && isAllCaps(first) && first.endsWith("TO:")) {
        blocks.push({ element: "transition", text: first });

        return;
    }

    if (lines.length > 1 && isAllCaps(first)) {
        blocks.push({ element: "character", text: first });
        parseSpeechLines(rest, blocks);

        return;
    }

    blocks.push({ element: "action", text: lines.join("\n") });
}

/**
 * Walk the lines following a character: a line fully wrapped in `(...)`
 * becomes its own parenthetical block (stored without the parens);
 * consecutive non-paren lines merge into one dialogue block.
 */
function parseSpeechLines(lines: string[], blocks: ScreenplayBlock[]): void {
    let dialogue: string[] = [];

    const flush = (): void => {
        if (dialogue.length > 0) {
            blocks.push({ element: "dialogue", text: dialogue.join("\n") });
            dialogue = [];
        }
    };

    for (const line of lines) {
        if (FULLY_PARENTHESIZED.test(line)) {
            flush();
            blocks.push({ element: "parenthetical", text: line.slice(1, -1) });
        } else {
            dialogue.push(line);
        }
    }

    flush();
}

export function serializeScreenplay(blocks: ScreenplayBlock[]): string {
    const runs: string[][] = [];

    /**
     * True while emitting a character's speech run: the character line and
     * every immediately-following parenthetical/dialogue block join into ONE
     * run (single newlines), which is exactly what makes the parser's
     * character walk re-produce them.
     */
    let chainActive = false;

    blocks.forEach((block, index) => {
        switch (block.element) {
            case "slugline": {
                const upper = block.text.toUpperCase();
                runs.push([SLUGLINE_PREFIX.test(upper) ? upper : `.${upper}`]);
                chainActive = false;
                break;
            }
            case "transition": {
                const upper = block.text.toUpperCase();
                runs.push([upper.endsWith("TO:") ? upper : `>${upper}`]);
                chainActive = false;
                break;
            }
            case "character": {
                const upper = block.text.toUpperCase();
                const next = blocks[index + 1];
                const hasSpeech =
                    next?.element === "parenthetical" ||
                    next?.element === "dialogue";
                // Escape when the name would re-parse as a slugline or carries
                // a force char — and ALSO when no speech follows: without the
                // multi-line run context a lone name would re-parse as action
                // (or transition/slugline).
                const needsEscape =
                    !hasSpeech ||
                    SLUGLINE_PREFIX.test(upper) ||
                    FORCE_MARKER.test(upper);
                runs.push([needsEscape ? `@${upper}` : upper]);
                chainActive = true;
                break;
            }
            case "parenthetical": {
                const wrapped = FULLY_PARENTHESIZED.test(block.text)
                    ? block.text
                    : `(${block.text})`;

                if (chainActive) {
                    runs[runs.length - 1].push(wrapped);
                } else {
                    // Orphan parenthetical (no preceding character run) is
                    // unreachable from the editor; emit it as its own run.
                    runs.push([wrapped]);
                }
                break;
            }
            case "dialogue": {
                if (chainActive) {
                    runs[runs.length - 1].push(...block.text.split("\n"));
                } else {
                    // Orphan dialogue (no preceding character/parenthetical)
                    // is unreachable from the editor — dialogue only ever
                    // exists under a character. Serialize it with ACTION
                    // semantics (action escape rules) as a deliberate
                    // simplification rather than inventing a dialogue-only
                    // escape syntax.
                    runs.push(escapeActionLines(block.text.split("\n")));
                }
                break;
            }
            case "action": {
                runs.push(escapeActionLines(block.text.split("\n")));
                chainActive = false;
                break;
            }
        }
    });

    return runs.map((run) => run.join("\n")).join("\n\n");
}

/**
 * Prefix `!` to the FIRST line iff the run would otherwise mis-parse: the
 * line starts with a force char, a single-line run would hit the slugline
 * or transition rules, or a multi-line run's all-caps first line would
 * become a character. A single all-caps line WITHOUT `TO:` parses back as
 * action, so it is NOT escaped. Note a `!`-forced line is its own block on
 * parse, so an escaped multi-line action re-parses as action + action —
 * same element semantics, split blocks.
 */
function escapeActionLines(lines: string[]): string[] {
    const first = lines[0] ?? "";
    const singleLine = lines.length === 1;
    const needsEscape =
        FORCE_MARKER.test(first) ||
        (singleLine && SLUGLINE_PREFIX.test(first)) ||
        (singleLine && isAllCaps(first) && first.endsWith("TO:")) ||
        (!singleLine && isAllCaps(first));

    return needsEscape ? [`!${first}`, ...lines.slice(1)] : [...lines];
}

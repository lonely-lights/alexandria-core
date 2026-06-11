export type ScreenplayElement =
    | "slugline"
    | "action"
    | "character"
    | "parenthetical"
    | "dialogue"
    | "transition";

export interface ScreenplayBlock {
    element: ScreenplayElement;
    /**
     * Canonical stored text (see codec.ts):
     * - slugline / character / transition: always uppercase (uppercased at
     *   parse time so round-trips are idempotent);
     * - parenthetical: the inner text WITHOUT the wrapping parens;
     * - action / dialogue: verbatim, may contain newlines.
     */
    text: string;
}

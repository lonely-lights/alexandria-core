import type { ScreenplayElement } from "./types";

/** Enter at the end of a block starts this element next. */
export const ENTER_NEXT: Record<ScreenplayElement, ScreenplayElement> = {
    slugline: "action",
    action: "action",
    character: "dialogue",
    parenthetical: "dialogue",
    dialogue: "character",
    transition: "slugline",
};

/** Tab on an EMPTY block cycles through this order. */
export const TAB_CYCLE: ScreenplayElement[] = [
    "action",
    "character",
    "transition",
    "slugline",
];

/** Ordered list for the element indicator dropdown. */
export const ELEMENTS: ScreenplayElement[] = [
    "slugline",
    "action",
    "character",
    "parenthetical",
    "dialogue",
    "transition",
];

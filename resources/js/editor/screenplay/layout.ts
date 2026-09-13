import type { CSSProperties } from 'react';

export interface ScreenplayLayout {
    name: string;
    page: { widthIn: number; heightIn: number };
    margins: { topIn: number; rightIn: number; bottomIn: number; leftIn: number };
    font: { family: string; sizePt: number; lineHeightPt: number; charactersPerInch: number };
    paragraphSpacePt: number;
    sceneSpacePt: number;
    /** Element positions measured from the left edge of the paper. */
    characterLeftIn: number;
    parenthetical: { leftIn: number; widthIn: number };
    dialogue: { leftIn: number; widthIn: number };
}

/** Named print defaults, independent of the writer's display zoom and prose settings. */
export const SCREENPLAY_LAYOUTS: Record<'standard', ScreenplayLayout> = {
    standard: {
        name: 'Standard screenplay',
        page: { widthIn: 8.5, heightIn: 11 },
        margins: { topIn: 1, rightIn: 1, bottomIn: 1, leftIn: 1.5 },
        font: {
            family: "'Courier Prime', 'Courier New', Courier, monospace",
            sizePt: 12,
            lineHeightPt: 12,
            charactersPerInch: 10,
        },
        paragraphSpacePt: 12,
        sceneSpacePt: 24,
        characterLeftIn: 3.7,
        parenthetical: { leftIn: 3.1, widthIn: 2.5 },
        dialogue: { leftIn: 2.5, widthIn: 3.5 },
    },
};

export const DEFAULT_SCREENPLAY_LAYOUT = SCREENPLAY_LAYOUTS.standard;

export function screenplayLayoutStyle(layout: ScreenplayLayout = DEFAULT_SCREENPLAY_LAYOUT): CSSProperties {
    return {
        '--alex-screenplay-page-width': `${layout.page.widthIn}in`,
        '--alex-screenplay-page-height': `${layout.page.heightIn}in`,
        '--alex-screenplay-margin-top': `${layout.margins.topIn}in`,
        '--alex-screenplay-margin-right': `${layout.margins.rightIn}in`,
        '--alex-screenplay-margin-bottom': `${layout.margins.bottomIn}in`,
        '--alex-screenplay-margin-left': `${layout.margins.leftIn}in`,
        '--alex-screenplay-font': layout.font.family,
        '--alex-screenplay-font-size': `${layout.font.sizePt}pt`,
        '--alex-screenplay-line-height': `${layout.font.lineHeightPt}pt`,
        '--alex-screenplay-character-width': `${1 / layout.font.charactersPerInch}in`,
        '--alex-screenplay-paragraph-space': `${layout.paragraphSpacePt}pt`,
        '--alex-screenplay-scene-space': `${layout.sceneSpacePt}pt`,
        '--alex-screenplay-character-indent': `${layout.characterLeftIn - layout.margins.leftIn}in`,
        '--alex-screenplay-parenthetical-indent': `${layout.parenthetical.leftIn - layout.margins.leftIn}in`,
        '--alex-screenplay-parenthetical-width': `${layout.parenthetical.widthIn}in`,
        '--alex-screenplay-dialogue-indent': `${layout.dialogue.leftIn - layout.margins.leftIn}in`,
        '--alex-screenplay-dialogue-width': `${layout.dialogue.widthIn}in`,
    } as CSSProperties;
}

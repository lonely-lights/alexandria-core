import { createContext, useContext } from "react";
import standard from "../../../screenplay-standard.json";
import { ELEMENTS } from "./formatSpec";
import type { ScreenplayElement } from "./types";

export const SCREENPLAY_FONTS = [
    "Courier Prime",
    "Courier New",
    "Arial",
    "Times New Roman",
] as const;
export type ScreenplayElementSettings = {
    nextElement: ScreenplayElement;
    shortcut: string;
    startNewPage: boolean;
    paginateAs: ScreenplayElement;
    font: (typeof SCREENPLAY_FONTS)[number];
    sizePt: number;
    bold: boolean;
    italic: boolean;
    underline: boolean;
    allCaps: boolean;
    alignment: "left" | "center" | "right" | "justify";
    lineSpacing: number;
    spaceBefore: number;
    leftIn: number;
    rightIn: number;
};
export type ScreenplayTemplate = {
    version: 1;
    format: "screenplay";
    name: string;
    elements: Record<ScreenplayElement, ScreenplayElementSettings>;
    originalElements?: Record<ScreenplayElement, ScreenplayElementSettings>;
};
export const STANDARD_SCREENPLAY_TEMPLATE = standard as ScreenplayTemplate;
export const ScreenplayTemplateContext = createContext<ScreenplayTemplate>(
    STANDARD_SCREENPLAY_TEMPLATE,
);
export const useScreenplayTemplate = () =>
    useContext(ScreenplayTemplateContext);

/** Keep the template baseline when document settings are applied and reloaded. */
export function withTemplateBaseline(
    template: ScreenplayTemplate,
): ScreenplayTemplate {
    return {
        ...structuredClone(template),
        originalElements: structuredClone(
            template.originalElements ??
                (template.name === STANDARD_SCREENPLAY_TEMPLATE.name
                    ? STANDARD_SCREENPLAY_TEMPLATE.elements
                    : template.elements),
        ),
    };
}

export function isScreenplayTemplateModified(
    template: ScreenplayTemplate,
): boolean {
    const original =
        template.originalElements ??
        (template.name === STANDARD_SCREENPLAY_TEMPLATE.name
            ? STANDARD_SCREENPLAY_TEMPLATE.elements
            : template.elements);

    return ELEMENTS.some((element) =>
        (
            Object.keys(
                STANDARD_SCREENPLAY_TEMPLATE.elements[element],
            ) as (keyof ScreenplayElementSettings)[]
        ).some(
            (key) => template.elements[element][key] !== original[element][key],
        ),
    );
}

/** Validate template files before they can affect the document or generate CSS. */
export function parseScreenplayTemplate(
    value: unknown,
    translate: (key: string) => string = (key) => key,
): ScreenplayTemplate {
    const template = value as ScreenplayTemplate | null;

    if (
        !template ||
        template.version !== 1 ||
        template.format !== "screenplay" ||
        typeof template.name !== "string" ||
        !template.name.trim() ||
        template.name.length > 100 ||
        !template.elements ||
        Object.keys(template.elements).length !== ELEMENTS.length
    ) {
        throw new Error(translate("writing.elements.invalid_template"));
    }

    const shortcuts = new Set<string>();

    for (const element of ELEMENTS) {
        const settings = template.elements[element];

        if (
            !settings ||
            !ELEMENTS.includes(settings.nextElement) ||
            !ELEMENTS.includes(settings.paginateAs) ||
            !SCREENPLAY_FONTS.includes(settings.font) ||
            !["left", "center", "right", "justify"].includes(
                settings.alignment,
            ) ||
            typeof settings.shortcut !== "string" ||
            !/^\d?$/.test(settings.shortcut) ||
            ["startNewPage", "bold", "italic", "underline", "allCaps"].some(
                (key) =>
                    typeof settings[key as keyof ScreenplayElementSettings] !==
                    "boolean",
            ) ||
            !Number.isFinite(settings.sizePt) ||
            settings.sizePt < 8 ||
            settings.sizePt > 36 ||
            !Number.isFinite(settings.lineSpacing) ||
            settings.lineSpacing < 1 ||
            settings.lineSpacing > 3 ||
            !Number.isFinite(settings.spaceBefore) ||
            settings.spaceBefore < 0 ||
            settings.spaceBefore > 6 ||
            !Number.isFinite(settings.leftIn) ||
            settings.leftIn < 1.5 ||
            !Number.isFinite(settings.rightIn) ||
            settings.rightIn > 7.5 ||
            settings.rightIn - settings.leftIn < 0.5
        ) {
            throw new Error(
                translate("writing.elements.invalid_settings"),
            );
        }

        if (settings.shortcut && shortcuts.has(settings.shortcut)) {
            throw new Error(translate("writing.elements.validation_shortcut"));
        }

        if (settings.shortcut) {
            shortcuts.add(settings.shortcut);
        }
    }

    if (template.originalElements !== undefined) {
        parseScreenplayTemplate({
            version: template.version,
            format: template.format,
            name: template.name,
            elements: template.originalElements,
        }, translate);
    }

    return structuredClone(template);
}

export function screenplayFontFamily(
    font: ScreenplayElementSettings["font"],
): string {
    return font.startsWith("Courier")
        ? "'" + font + "', 'Courier New', monospace"
        : "'" + font + "'";
}

export function screenplayLetterSpacing(
    settings: ScreenplayElementSettings,
): string {
    return settings.font.startsWith("Courier")
        ? "calc(" + settings.sizePt / 120 + "in - 1ch)"
        : "normal";
}

export function screenplayTemplateCss(template: ScreenplayTemplate): string {
    return ELEMENTS.map((element) => {
        const s = template.elements[element];
        const selector =
            ".writing-workspace-shell .rte-screenplay .tiptap-editor .ProseMirror p.sp-" +
            element;
        const font = screenplayFontFamily(s.font);

        return (
            selector +
            "{font-family:" +
            font +
            ";font-size:" +
            s.sizePt +
            "pt;font-weight:" +
            (s.bold ? 700 : 400) +
            ";font-style:" +
            (s.italic ? "italic" : "normal") +
            ";text-decoration:" +
            (s.underline ? "underline" : "none") +
            ";text-transform:" +
            (s.allCaps ? "uppercase" : "none") +
            ";text-align:" +
            s.alignment +
            ";line-height:" +
            s.sizePt * s.lineSpacing +
            "pt;break-before:" +
            (s.startNewPage ? "page" : "auto") +
            ";}" +
            "@media(min-width:1024px){" +
            selector +
            "{margin-left:" +
            (s.leftIn - 1.5) +
            "in;width:" +
            (s.rightIn - s.leftIn) +
            "in;max-width:none;letter-spacing:" +
            screenplayLetterSpacing(s) +
            ";}" +
            selector +
            ":not(:first-child){margin-top:" +
            s.spaceBefore * s.sizePt +
            "pt;}}"
        );
    }).join("\n");
}

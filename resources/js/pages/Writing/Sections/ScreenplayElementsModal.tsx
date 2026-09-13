import { router } from "@inertiajs/react";
import { useRef, useState } from "react";
import Input from "@alexandria/components/form/Input";
import Select from "@alexandria/components/form/Select";
import Toggle from "@alexandria/components/form/Toggle";
import Button from "@alexandria/components/ui/Button";
import Modal, {
    ModalHeader,
    ModalFooter,
} from "@alexandria/components/ui/Modal";
import { useToastContext } from "@alexandria/components/ui/ToastProvider";
import { ELEMENTS } from "@alexandria/editor/screenplay/formatSpec";
import {
    parseScreenplayTemplate,
    isScreenplayTemplateModified,
    withTemplateBaseline,
    screenplayFontFamily,
    screenplayLetterSpacing,
    SCREENPLAY_FONTS,
    STANDARD_SCREENPLAY_TEMPLATE,
} from "@alexandria/editor/screenplay/template";
import type {
    ScreenplayTemplate,
    ScreenplayElementSettings,
} from "@alexandria/editor/screenplay/template";
import type { ScreenplayElement } from "@alexandria/editor/screenplay/types";
import useT from "@alexandria/hooks/useT";

export default function ScreenplayElementsModal({
    template,
    workUrl,
    beforeApply,
    onClose,
}: {
    template: ScreenplayTemplate;
    workUrl: string;
    beforeApply: () => Promise<boolean[]>;
    onClose: () => void;
}) {
    const t = useT();
    const toast = useToastContext();
    const reportError = (message: string) =>
        toast.show(message, { type: "danger", duration: 7000 });
    const [draft, setDraft] = useState(() => withTemplateBaseline(template));
    const [templateName, setTemplateName] = useState<string | null>(null);
    const [element, setElement] = useState<ScreenplayElement>("action");
    const [tab, setTab] = useState<"basic" | "font" | "paragraph">("basic");
    const [saving, setSaving] = useState(false);
    const fileInput = useRef<HTMLInputElement>(null);
    const settings = draft.elements[element];
    const label = (key: string) => t(`writing.elements.${key}`);
    const elementOptions = ELEMENTS.map((value) => ({
        value,
        label: label(value),
    }));
    const update = (change: Partial<ScreenplayElementSettings>) => {
        setDraft((current) => ({
            ...current,
            elements: {
                ...current.elements,
                [element]: { ...current.elements[element], ...change },
            },
        }));
    };
    const validate = (value = draft) => {
        try {
            return parseScreenplayTemplate(value, t);
        } catch (error) {
            reportError(
                error instanceof Error
                    ? error.message
                    : label("invalid"),
            );

            return null;
        }
    };
    const saveTemplate = () => {
        const valid = validate({
            version: draft.version,
            format: draft.format,
            name: templateName?.trim() ?? draft.name,
            elements: draft.elements,
        });

        if (!valid) {
            return;
        }

        const url = URL.createObjectURL(
            new Blob([JSON.stringify(valid, null, 2)], {
                type: "application/json",
            }),
        );
        const link = document.createElement("a");
        link.href = url;
        link.download =
            (valid.name.replace(/[^a-z0-9 -]/gi, "").trim() || "screenplay") +
            ".screenplay-template.json";
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        setDraft({
            ...valid,
            originalElements: structuredClone(valid.elements),
        });
        setTemplateName(null);
    };
    const apply = async () => {
        const valid = validate();

        if (!valid) {
            return;
        }

        setSaving(true);

        try {
            const result = await beforeApply();

            if (result.some((saved) => !saved)) {
                throw new Error(label("save_text_failed"));
            }

            router.put(
                workUrl,
                { screenplay_template: valid },
                {
                    preserveScroll: true,
                    onSuccess: onClose,
                    onError: (errors) =>
                        reportError(
                            Object.values(errors)[0] ??
                                label("save_failed"),
                        ),
                    onFinish: () => setSaving(false),
                },
            );
        } catch (error) {
            reportError(
                error instanceof Error
                    ? error.message
                    : label("save_failed"),
            );
            setSaving(false);
        }
    };

    return (
        <Modal
            open
            onClose={onClose}
            dismissible={!saving}
            maxWidth="max-w-3xl"
        >
            <ModalHeader
                title={label("title")}
                onClose={saving ? () => {} : onClose}
            />
            <div
                className="min-h-0 flex-1 overflow-y-auto p-5"
                data-screenplay-elements
            >
                <p className="mb-4 text-sm opacity-70">
                    {label("scope")}
                </p>
                <fieldset disabled={saving} className="space-y-4">
                    <p
                        className="text-sm font-medium"
                        data-screenplay-template-name
                        aria-live="polite"
                    >
                        {draft.name}
                        {isScreenplayTemplateModified(draft) &&
                            label("modified_unsaved")}
                    </p>
                    {templateName !== null && (
                        <form
                            className="space-y-3 rounded border border-current/20 p-3"
                            onSubmit={(event) => {
                                event.preventDefault();
                                saveTemplate();
                            }}
                        >
                            <Input
                                name="screenplay-template-name"
                                label={label("name")}
                                value={templateName}
                                maxLength={100}
                                autoFocus
                                onChange={(event) =>
                                    setTemplateName(event.target.value)
                                }
                            />
                            <div className="flex gap-2">
                                <Button type="submit" size="xs">
                                    {label("save_template_confirm")}
                                </Button>
                                <Button
                                    type="button"
                                    size="xs"
                                    variant="secondary"
                                    onClick={() => setTemplateName(null)}
                                >
                                    {label("cancel_save")}
                                </Button>
                            </div>
                        </form>
                    )}
                    <div className="grid gap-5 sm:grid-cols-[11rem_1fr]">
                        <nav
                            aria-label={label("element")}
                            className="flex flex-wrap content-start gap-1 sm:flex-col"
                        >
                            {elementOptions.map((option) => (
                                <button
                                    type="button"
                                    key={option.value}
                                    data-screenplay-element-setting={
                                        option.value
                                    }
                                    aria-pressed={element === option.value}
                                    className="flex items-center justify-between gap-2 rounded px-3 py-2 text-left text-sm"
                                    style={
                                        element === option.value
                                            ? {
                                                  background:
                                                      "var(--theme-brand-primary-highlight-bg)",
                                                  color: "var(--theme-brand-primary-highlight-fg)",
                                                  boxShadow:
                                                      "inset 3px 0 var(--theme-brand-primary-500)",
                                                  fontWeight: 600,
                                              }
                                            : undefined
                                    }
                                    onClick={() => setElement(option.value)}
                                >
                                    {option.label}
                                    {element === option.value && (
                                        <i
                                            className="fa-solid fa-check text-xs"
                                            aria-hidden="true"
                                        />
                                    )}
                                </button>
                            ))}
                        </nav>
                        <div className="min-w-0 space-y-4">
                            <div
                                className="flex gap-2"
                                role="tablist"
                                aria-label={label("settings")}
                            >
                                {(["basic", "font", "paragraph"] as const).map(
                                    (value) => (
                                        <button
                                            type="button"
                                            role="tab"
                                            aria-selected={tab === value}
                                            key={value}
                                            className={`border-b-2 px-3 py-2 text-sm ${tab === value ? "border-current" : "border-transparent opacity-60"}`}
                                            onClick={() => setTab(value)}
                                        >
                                            {label(value)}
                                        </button>
                                    ),
                                )}
                            </div>
                            {tab === "basic" && (
                                <div className="space-y-4" role="tabpanel">
                                    <Toggle
                                        label={label("new_page")}
                                        checked={settings.startNewPage}
                                        onChange={(value) =>
                                            update({ startNewPage: value })
                                        }
                                    />
                                    <Select
                                        name="screenplay-paginate-as"
                                        label={label("paginate")}
                                        value={settings.paginateAs}
                                        options={elementOptions}
                                        onChange={(event) =>
                                            update({
                                                paginateAs: event.target
                                                    .value as ScreenplayElement,
                                            })
                                        }
                                    />
                                    <Select
                                        name="screenplay-next-element"
                                        label={label("next")}
                                        value={settings.nextElement}
                                        options={elementOptions}
                                        onChange={(event) =>
                                            update({
                                                nextElement: event.target
                                                    .value as ScreenplayElement,
                                            })
                                        }
                                    />
                                    <Select
                                        name="screenplay-shortcut"
                                        label={label("shortcut")}
                                        value={settings.shortcut}
                                        options={[
                                            {
                                                value: "",
                                                label: label("none"),
                                            },
                                            ...Array.from(
                                                { length: 10 },
                                                (_, value) => ({
                                                    value: String(value),
                                                    label: String(value),
                                                }),
                                            ),
                                        ]}
                                        onChange={(event) =>
                                            update({
                                                shortcut: event.target.value,
                                            })
                                        }
                                    />
                                    <p className="text-xs opacity-70">
                                        {label("break_help")}
                                    </p>
                                </div>
                            )}
                            {tab === "font" && (
                                <div className="space-y-4" role="tabpanel">
                                    <Select
                                        name="screenplay-element-font"
                                        label={label("font")}
                                        value={settings.font}
                                        options={SCREENPLAY_FONTS.map(
                                            (value) => ({
                                                value,
                                                label: value,
                                            }),
                                        )}
                                        onChange={(event) =>
                                            update({
                                                font: event.target
                                                    .value as ScreenplayElementSettings["font"],
                                            })
                                        }
                                    />
                                    <Input
                                        name="screenplay-font-size"
                                        type="number"
                                        min={8}
                                        max={36}
                                        label={label("size")}
                                        value={settings.sizePt}
                                        onChange={(event) =>
                                            update({
                                                sizePt: event.target
                                                    .valueAsNumber,
                                            })
                                        }
                                    />
                                    <div className="grid grid-cols-2 gap-3">
                                        {(
                                            [
                                                "bold",
                                                "italic",
                                                "underline",
                                                "allCaps",
                                            ] as const
                                        ).map((flag) => (
                                            <Toggle
                                                key={flag}
                                                label={label(flag)}
                                                checked={settings[flag]}
                                                onChange={(value) =>
                                                    update({ [flag]: value })
                                                }
                                            />
                                        ))}
                                    </div>
                                    <Button
                                        type="button"
                                        variant="secondary"
                                        size="xs"
                                        data-screenplay-font-all
                                        onClick={() =>
                                            setDraft((current) => ({
                                                ...current,
                                                elements: Object.fromEntries(
                                                    ELEMENTS.map((key) => [
                                                        key,
                                                        {
                                                            ...current.elements[
                                                                key
                                                            ],
                                                            font: settings.font,
                                                            sizePt: settings.sizePt,
                                                        },
                                                    ]),
                                                ) as ScreenplayTemplate["elements"],
                                            }))
                                        }
                                    >
                                        {label("font_all")}
                                    </Button>
                                    <p
                                        className="rounded border border-current/20 p-3"
                                        data-screenplay-font-preview
                                        style={{
                                            fontFamily: screenplayFontFamily(
                                                settings.font,
                                            ),
                                            fontSize: `${settings.sizePt}pt`,
                                            lineHeight: `${settings.sizePt * settings.lineSpacing}pt`,
                                            letterSpacing:
                                                screenplayLetterSpacing(
                                                    settings,
                                                ),
                                            fontKerning: "none",
                                            fontVariantLigatures: "none",
                                            fontWeight: settings.bold
                                                ? 700
                                                : 400,
                                            fontStyle: settings.italic
                                                ? "italic"
                                                : "normal",
                                            textDecoration: settings.underline
                                                ? "underline"
                                                : "none",
                                            textTransform: settings.allCaps
                                                ? "uppercase"
                                                : "none",
                                        }}
                                    >
                                        {label("sample")}
                                    </p>
                                </div>
                            )}
                            {tab === "paragraph" && (
                                <div
                                    className="grid grid-cols-2 gap-4"
                                    role="tabpanel"
                                >
                                    <Select
                                        name="screenplay-alignment"
                                        label={label("alignment")}
                                        value={settings.alignment}
                                        options={[
                                            "left",
                                            "center",
                                            "right",
                                            "justify",
                                        ].map((value) => ({
                                            value,
                                            label: label(value),
                                        }))}
                                        onChange={(event) =>
                                            update({
                                                alignment: event.target
                                                    .value as ScreenplayElementSettings["alignment"],
                                            })
                                        }
                                    />
                                    <Input
                                        name="screenplay-spacing"
                                        type="number"
                                        min={1}
                                        max={3}
                                        step={0.5}
                                        label={label("spacing")}
                                        value={settings.lineSpacing}
                                        onChange={(event) =>
                                            update({
                                                lineSpacing:
                                                    event.target.valueAsNumber,
                                            })
                                        }
                                    />
                                    <Input
                                        name="screenplay-space-before"
                                        type="number"
                                        min={0}
                                        max={6}
                                        step={0.5}
                                        label={label("before")}
                                        value={settings.spaceBefore}
                                        onChange={(event) =>
                                            update({
                                                spaceBefore:
                                                    event.target.valueAsNumber,
                                            })
                                        }
                                    />
                                    <div />
                                    <Input
                                        name="screenplay-indent-left"
                                        type="number"
                                        min={1.5}
                                        max={7}
                                        step={0.05}
                                        label={label("left_edge")}
                                        value={settings.leftIn}
                                        onChange={(event) =>
                                            update({
                                                leftIn: event.target
                                                    .valueAsNumber,
                                            })
                                        }
                                    />
                                    <Input
                                        name="screenplay-indent-right"
                                        type="number"
                                        min={2}
                                        max={7.5}
                                        step={0.05}
                                        label={label("right_edge")}
                                        value={settings.rightIn}
                                        onChange={(event) =>
                                            update({
                                                rightIn:
                                                    event.target.valueAsNumber,
                                            })
                                        }
                                    />
                                    <p className="col-span-2 text-xs opacity-70">
                                        {label("indent_help")}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </fieldset>
            </div>
            <ModalFooter>
                <div
                    className="flex w-full flex-wrap items-center gap-2"
                    data-screenplay-elements-footer
                >
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={saving || templateName !== null}
                        onClick={() => {
                            setDraft(
                                withTemplateBaseline(
                                    STANDARD_SCREENPLAY_TEMPLATE,
                                ),
                            );
                        }}
                        size="xs"
                    >
                        {label("reset")}
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={saving || templateName !== null}
                        onClick={() => fileInput.current?.click()}
                        size="xs"
                    >
                        {label("load")}
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={saving || templateName !== null}
                        onClick={() => {
                            if (validate()) {
                                setTemplateName(draft.name);
                            }
                        }}
                        size="xs"
                    >
                        {label("save_template")}
                    </Button>
                    <div className="flex-1" />
                    <Button
                        type="button"
                        variant="secondary"
                        disabled={saving}
                        onClick={onClose}
                        size="xs"
                    >
                        {t("common.cancel")}
                    </Button>
                    <Button
                        type="button"
                        disabled={saving || templateName !== null}
                        onClick={() => void apply()}
                        size="xs"
                    >
                        {label("apply")}
                    </Button>
                </div>
            </ModalFooter>
            <input
                ref={fileInput}
                type="file"
                accept=".json,application/json"
                hidden
                data-screenplay-template-file
                onChange={async (event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";

                    if (!file) {
                        return;
                    }

                    try {
                        if (file.size > 100_000) {
                            throw new Error(label("too_large"));
                        }

                        const loaded = parseScreenplayTemplate(
                            JSON.parse(await file.text()),
                            t,
                        );
                        setDraft({
                            ...loaded,
                            originalElements: structuredClone(loaded.elements),
                        });
                    } catch (error) {
                        reportError(
                            error instanceof Error
                                ? error.message
                                : label("invalid"),
                        );
                    }
                }}
            />
        </Modal>
    );
}

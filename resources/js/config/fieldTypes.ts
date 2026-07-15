/**
 * Field type display configuration — icons, labels, and colors for each EAV field type.
 */
export const FIELD_TYPES: Record<
    string,
    { icon: string; label: string; color: string }
> = {
    text: { icon: "fa-solid fa-font", label: "Text", color: "text-slate-500" },
    textarea: {
        icon: "fa-solid fa-align-left",
        label: "Text Area",
        color: "text-slate-500",
    },
    text_multiple: {
        icon: "fa-solid fa-list",
        label: "Text List",
        color: "text-slate-500",
    },
    integer: {
        icon: "fa-solid fa-hashtag",
        label: "Number",
        color: "text-blue-500",
    },
    boolean: {
        icon: "fa-solid fa-toggle-on",
        label: "Toggle",
        color: "text-emerald-500",
    },
    date: {
        icon: "fa-solid fa-calendar",
        label: "Date",
        color: "text-amber-500",
    },
    datetime: {
        icon: "fa-solid fa-clock",
        label: "Date & Time",
        color: "text-amber-500",
    },
    entry_reference: {
        icon: "fa-solid fa-arrow-up-right-from-square",
        label: "Reference",
        color: "text-violet-500",
    },
    relationship_manager: {
        icon: "fa-solid fa-diagram-project",
        label: "Relationships",
        color: "text-rose-500",
    },
    temporal: {
        icon: "fa-solid fa-timeline",
        label: "Temporal",
        color: "text-teal-500",
    },
    stardate: {
        icon: "fa-solid fa-star",
        label: "Stardate",
        color: "text-yellow-500",
    },
};

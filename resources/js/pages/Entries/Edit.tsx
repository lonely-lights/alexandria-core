import { usePage } from "@inertiajs/react";
import type { CSSProperties } from "react";
import useT from "@alexandria/hooks/useT";
import AppLayout from "@alexandria/layouts/AppLayout";
import IconTile from "@alexandria/components/ui/IconTile";
import PageHeader from "@alexandria/components/layout/PageHeader";
import EntryForm from "./Sections/EntryForm";
import { getEntryShowSlots } from "./entryShowSlots";

interface EditProps {
    project: { id: number; name: string; slug: string };
    blueprint: {
        id: number;
        name: string;
        slug: string;
        icon: string;
        classification: string;
        fields: Array<{
            id: number;
            name: string;
            label: string;
            type: string;
            description: string | null;
            is_required: boolean;
            validation_rules: Record<string, unknown>;
            sort_order: number;
        }>;
    };
    entry: {
        id: number;
        name: string;
        slug: string;
        summary: string | null;
        content: string | null;
        is_stub: boolean;
        parent_id: number | null;
        can: {
            update: boolean;
        };
    };
    fieldValues: Record<string, unknown>;
    parentEntries: Array<{ id: number; name: string; slug: string }>;
    [key: string]: unknown;
}

const subtitleStyle: CSSProperties = {
    color: "color-mix(in srgb, var(--theme-base-content) 50%, transparent)",
};

const stubBadgeStyle: CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    padding: "0.0625rem 0.375rem",
    fontSize: "0.6875rem",
    fontWeight: 600,
    borderRadius: "var(--theme-radius-badge)",
    background:
        "color-mix(in srgb, var(--theme-base-content) 10%, transparent)",
    color: "color-mix(in srgb, var(--theme-base-content) 70%, transparent)",
    marginRight: "0.5rem",
};

export default function EntryEdit() {
    const t = useT();
    const props = usePage<EditProps>().props;
    const { project, blueprint, entry, fieldValues, parentEntries } = props;
    const { editPageImageManager: EditPageImageManager } = getEntryShowSlots();
    const iconClass = blueprint.icon.includes(" ")
        ? blueprint.icon
        : `fa-solid ${blueprint.icon}`;
    const editTitle = t("entries.form.edit.title").replace(
        ":entry",
        entry.name,
    );

    return (
        <AppLayout title={`${editTitle} - ${project.name}`} immersive>
            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: `/p/${project.slug}` },
                    {
                        label: blueprint.name,
                        href: `/p/${project.slug}/${blueprint.slug}`,
                        icon: blueprint.icon,
                    },
                    {
                        label: entry.name,
                        href: entry.is_stub
                            ? undefined
                            : `/p/${project.slug}/${blueprint.slug}/${entry.slug}`,
                    },
                    { label: t("entries.form.edit.breadcrumb") },
                ]}
            >
                <div className="flex items-center gap-4">
                    <IconTile icon={iconClass} />
                    <div>
                        <h1 className="text-2xl font-bold">{editTitle}</h1>
                        <p className="mt-1 text-sm" style={subtitleStyle}>
                            {entry.is_stub && (
                                <span style={stubBadgeStyle}>
                                    {t("entries.stub.badge")}
                                </span>
                            )}
                            {blueprint.name}
                        </p>
                    </div>
                </div>
            </PageHeader>

            <div className="container mx-auto max-w-7xl px-4 py-8">
                <EntryForm
                    mode="edit"
                    projectSlug={project.slug}
                    blueprintSlug={blueprint.slug}
                    blueprintName={blueprint.name}
                    blueprintIcon={blueprint.icon}
                    fields={blueprint.fields}
                    parentEntries={parentEntries}
                    entrySlug={entry.slug}
                    entryId={entry.id}
                    isStub={entry.is_stub}
                    initialValues={{
                        name: entry.name,
                        slug: entry.slug,
                        summary: entry.summary,
                        content: entry.content,
                        parent_id: entry.parent_id,
                    }}
                    initialFieldValues={fieldValues}
                    pageImageSlot={
                        EditPageImageManager ? (
                            <EditPageImageManager
                                project={project}
                                blueprint={blueprint}
                                entry={entry}
                                pageProps={props}
                            />
                        ) : undefined
                    }
                />
            </div>
        </AppLayout>
    );
}

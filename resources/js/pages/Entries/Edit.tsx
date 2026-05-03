import { usePage } from '@inertiajs/react';
import AppLayout from '@alexandria/layouts/AppLayout';
import IconTile from '@alexandria/components/ui/IconTile';
import PageHeader from '@alexandria/components/layout/PageHeader';
import EntryForm from './Sections/EntryForm';

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
    };
    fieldValues: Record<string, unknown>;
    parentEntries: Array<{ id: number; name: string; slug: string }>;
}

export default function EntryEdit() {
    const { project, blueprint, entry, fieldValues, parentEntries } = usePage().props as unknown as EditProps;
    const iconClass = blueprint.icon.includes(' ') ? blueprint.icon : `fa-solid ${blueprint.icon}`;

    return (
        <AppLayout title={`Edit ${entry.name} - ${project.name}`} immersive>
            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: `/p/${project.slug}` },
                    { label: blueprint.name, href: `/p/${project.slug}/${blueprint.slug}`, icon: blueprint.icon },
                    { label: entry.name, href: entry.is_stub ? undefined : `/p/${project.slug}/${blueprint.slug}/${entry.slug}` },
                    { label: 'Edit' },
                ]}
            >
                <div className="flex items-center gap-4">
                    <IconTile icon={iconClass} />
                    <div>
                        <h1 className="text-2xl font-bold">Edit {entry.name}</h1>
                        <p className="mt-1 text-sm text-base-content/50">
                            {entry.is_stub && <span className="badge badge-ghost badge-sm mr-2">Stub</span>}
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
                    initialValues={{
                        name: entry.name,
                        summary: entry.summary,
                        content: entry.content,
                        parent_id: entry.parent_id,
                    }}
                    initialFieldValues={fieldValues}
                />
            </div>
        </AppLayout>
    );
}

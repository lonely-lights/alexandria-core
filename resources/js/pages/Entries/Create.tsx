import { usePage } from '@inertiajs/react';
import AppLayout from '@alexandria/layouts/AppLayout';
import IconTile from '@alexandria/components/ui/IconTile';
import PageHeader from '@alexandria/components/layout/PageHeader';
import EntryForm from './Sections/EntryForm';

interface CreateProps {
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
    parentEntries: Array<{ id: number; name: string; slug: string }>;
}

export default function EntryCreate() {
    const { project, blueprint, parentEntries } = usePage().props as unknown as CreateProps;
    const iconClass = blueprint.icon.includes(' ') ? blueprint.icon : `fa-solid ${blueprint.icon}`;

    return (
        <AppLayout title={`New ${blueprint.name} - ${project.name}`} immersive>
            <PageHeader
                breadcrumbs={[
                    { label: project.name, href: `/p/${project.slug}` },
                    { label: blueprint.name, href: `/p/${project.slug}/${blueprint.slug}`, icon: blueprint.icon },
                    { label: `New ${blueprint.name}` },
                ]}
            >
                <div className="flex items-center gap-4">
                    <IconTile icon={iconClass} />
                    <div>
                        <h1 className="text-2xl font-bold">New {blueprint.name}</h1>
                        <p className="mt-1 text-sm text-base-content/50">Create a new entry</p>
                    </div>
                </div>
            </PageHeader>

            <div className="container mx-auto max-w-7xl px-4 py-8">
                <EntryForm
                    mode="create"
                    projectSlug={project.slug}
                    blueprintSlug={blueprint.slug}
                    blueprintName={blueprint.name}
                    blueprintIcon={blueprint.icon}
                    fields={blueprint.fields}
                    parentEntries={parentEntries}
                />
            </div>
        </AppLayout>
    );
}

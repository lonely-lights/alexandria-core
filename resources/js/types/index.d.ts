import { User, ProjectSummary } from './models';

export interface FlashMessage {
    message: string | null;
    type: 'success' | 'info' | 'warning' | 'danger' | 'default';
    description: string | null;
}

export interface SharedProps {
    auth: {
        user: User;
        // Coarse UI-gating flag; server-side gates remain authoritative.
        is_admin: boolean;
        // Entitlement map shared by the host app; only truthy values are
        // meaningful — use the useEntitlements() hook to get a string[].
        entitlements?: Record<string, unknown>;
    } | null;
    flash: FlashMessage;
    projects: ProjectSummary[];
    currentProject: ProjectSummary | null;
    [key: string]: unknown;
}

declare module '@inertiajs/react' {
    interface PageProps extends SharedProps {}
}

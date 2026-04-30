import { User, ProjectSummary } from './models';

export interface FlashMessage {
    message: string | null;
    type: 'success' | 'info' | 'warning' | 'danger' | 'default';
    description: string | null;
}

export interface SharedProps {
    auth: {
        user: User;
    } | null;
    flash: FlashMessage;
    projects: ProjectSummary[];
    currentProject: ProjectSummary | null;
    [key: string]: unknown;
}

declare module '@inertiajs/react' {
    interface PageProps extends SharedProps {}
}

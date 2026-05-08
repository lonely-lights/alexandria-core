import { type ReactNode } from 'react';
import SectionHeader from './SectionHeader';

/**
 * Section card — wraps a `<SectionHeader>` and a body slot in a
 * rounded-3xl, base-200-filled container. Most non-profile sections
 * (Privacy, AI, Preferences, etc.) compose through this; ProfileSection
 * renders directly because it has its own banner/avatar treatment.
 */
export default function SectionCard({
    children,
    icon,
    title,
    subtitle,
    label,
}: {
    children: ReactNode;
    icon: string;
    title: string;
    subtitle: string;
    label?: string;
}) {
    return (
        <div className="overflow-hidden rounded-3xl border border-base-content/10 bg-base-200 shadow-xl">
            <SectionHeader icon={icon} title={title} subtitle={subtitle} label={label} />
            <div className="space-y-6 p-8">
                {children}
            </div>
        </div>
    );
}

import { type ReactNode } from 'react';
import SectionHeader from './SectionHeader';

/**
 * Section card — wraps a `<SectionHeader>` and a body slot in a
 * rounded-3xl theme-token-filled container. Most non-profile sections
 * (Privacy, AI, Preferences, etc.) compose through this; ProfileSection
 * renders directly because it has its own banner/avatar treatment.
 *
 * Surface and border colours come from the `--theme-*` token system so
 * preset swaps (default → cyberpunk → etc.) repaint the card alongside
 * the rest of the chrome.
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
        <div
            className="overflow-hidden rounded-3xl border shadow-xl"
            style={{
                background: 'var(--theme-base-surface)',
                borderColor: 'color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
            }}
        >
            <SectionHeader icon={icon} title={title} subtitle={subtitle} label={label} />
            <div className="space-y-6 p-8">
                {children}
            </div>
        </div>
    );
}

import type { ReactNode } from 'react';

/**
 * Shared workspace-editor frame.
 *
 * The document identity strip moved into the workspace title bar, so
 * this wrapper only preserves the full-height flex contract shared by
 * prose and screenplay editors.
 */

interface SectionChromeProps {
    className?: string;
    children: ReactNode;
}

export default function SectionChrome({ className, children }: SectionChromeProps) {
    return <div className={`flex h-full min-h-0 flex-col ${className ?? ''}`}>{children}</div>;
}

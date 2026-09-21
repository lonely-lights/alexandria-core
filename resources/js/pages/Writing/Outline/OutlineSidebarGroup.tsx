import type { ComponentPropsWithoutRef, ReactNode } from 'react';

type Props = Omit<
    ComponentPropsWithoutRef<'details'>,
    'title' | 'children' | 'open'
> & {
    title: ReactNode;
    children: ReactNode;
};

/** Independent, closed-by-default groups for the outline sidebar's tools. */
export default function OutlineSidebarGroup({
    title,
    children,
    ...props
}: Props) {
    return (
        <details
            {...props}
            className="group mb-2 px-2 py-2.5"
            style={{
                background:
                    'var(--alex-writing-section-pane-bg, var(--theme-base-surface))',
                border: '1px solid color-mix(in srgb, var(--theme-base-content) 10%, transparent)',
                borderRadius: 'var(--theme-radius-card)',
                boxShadow: '0 10px 28px rgb(0 0 0 / 0.16)',
            }}
        >
            <summary className="flex cursor-pointer list-none items-center gap-2 [&::-webkit-details-marker]:hidden">
                <i
                    className="fa-solid fa-chevron-right text-[10px] group-open:rotate-90"
                    aria-hidden="true"
                    style={{
                        color: 'var(--alex-writing-section-muted, color-mix(in srgb, var(--theme-base-content) 45%, transparent))',
                    }}
                />
                <h3
                    className="text-xs font-semibold"
                    style={{ color: 'var(--theme-base-content)' }}
                >
                    {title}
                </h3>
            </summary>
            <div className="mt-2">{children}</div>
        </details>
    );
}

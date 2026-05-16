import type { CSSProperties } from 'react';

import useT from '@alexandria/hooks/useT';
import type { CascadeScope } from '@alexandria/lib/themePreview';

/**
 * Small badge that reports which cascade scope a token value comes from.
 * Stage 8b M1.C.1 — rendered on every token-leaf row in the
 * `<TokenOverrideEditor>` so the user knows whether a value is inherited
 * from the preset, set on the user, set on the project, etc.
 *
 * Color cues match the scope's narrowness — system/user are neutral,
 * project is primary, blueprint/entry escalate via status colors so
 * deeper overrides stand out.
 */

const BADGE_BASE: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '0.25rem',
    padding: '0.0625rem 0.375rem',
    fontSize: '0.625rem',
    fontWeight: 600,
    borderRadius: 'var(--theme-radius-badge)',
    whiteSpace: 'nowrap',
};

const SCOPE_STYLES: Record<CascadeScope, CSSProperties> = {
    system: {
        ...BADGE_BASE,
        background:
            'color-mix(in srgb, var(--theme-base-content) 8%, transparent)',
        color: 'color-mix(in srgb, var(--theme-base-content) 60%, transparent)',
    },
    user: {
        ...BADGE_BASE,
        background:
            'color-mix(in srgb, var(--theme-base-content) 12%, transparent)',
        color: 'color-mix(in srgb, var(--theme-base-content) 75%, transparent)',
    },
    project: {
        ...BADGE_BASE,
        background:
            'color-mix(in srgb, var(--theme-brand-primary-500) 15%, transparent)',
        color: 'var(--theme-brand-primary-500)',
    },
    blueprint: {
        ...BADGE_BASE,
        background:
            'color-mix(in srgb, var(--theme-status-info-fill) 35%, transparent)',
        color: 'var(--theme-status-info-stroke)',
    },
    entry: {
        ...BADGE_BASE,
        background:
            'color-mix(in srgb, var(--theme-status-warning-fill) 35%, transparent)',
        color: 'var(--theme-status-warning-stroke)',
    },
};

const SCOPE_ICONS: Record<CascadeScope, string> = {
    system: 'fa-solid fa-circle-dot',
    user: 'fa-solid fa-user',
    project: 'fa-solid fa-folder',
    blueprint: 'fa-solid fa-layer-group',
    entry: 'fa-solid fa-file-lines',
};

export default function ProvenanceBadge({ scope }: { scope: CascadeScope }) {
    const t = useT();

    return (
        <span style={SCOPE_STYLES[scope]} aria-label={t(`theming.provenance.${scope}.aria`)}>
            <i
                className={`${SCOPE_ICONS[scope]} text-[8px]`}
                aria-hidden="true"
            />
            {t(`theming.provenance.${scope}.label`)}
        </span>
    );
}

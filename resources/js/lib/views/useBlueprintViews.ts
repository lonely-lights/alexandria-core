import { useMemo } from 'react';
import type { BlueprintViewDefinition, BlueprintViewEntry, ViewAccess } from './types';
import { BLUEPRINT_VIEWS, getViewDefinition } from './registry';

/**
 * Client-side access check. Mirrors the three-mode shape of the backend
 * FeatureService.canUseView() — the server remains the authority; this
 * only hides UI the server would already block.
 *
 * Deliberate stub while the tier + store systems are in flight:
 *   - free: always granted
 *   - tier: granted until the subscription system lands
 *   - purchase: denied until the one-time-purchase store ships
 */
function checkAccess(access: ViewAccess): boolean {
    switch (access.type) {
        case 'free':
            return true;
        case 'tier':
            // TODO: consume the user's tier once the subscription system lands.
            return true;
        case 'purchase':
            // TODO: query user_entitlements once the store ships.
            return false;
    }
}

export interface ResolvedView {
    /** The static registry entry. */
    definition: BlueprintViewDefinition;
    /** The per-blueprint config + enabled state, if any. */
    entry: BlueprintViewEntry | null;
    /** Is this view turned on for this blueprint? */
    enabledForBlueprint: boolean;
    /** Does the classification allow this view? */
    applicableForBlueprint: boolean;
    /** Does the current user have access (free/tier/purchase check)? */
    accessibleForUser: boolean;
}

/**
 * Input shape the hook needs from the caller — kept minimal so
 * hosts can pass a subset of their Blueprint object.
 */
export interface BlueprintViewInput {
    classification: string;
    views: BlueprintViewEntry[];
}

/**
 * Merges the static registry with a blueprint's stored views JSON
 * and returns an array of resolved views, in the order the registry
 * defines them. Classification + access checks are baked in.
 *
 * Access checks use a client-side provisional check; the backend
 * FeatureService is still the authority — this hook only hides UI
 * that the server would block anyway.
 */
export function useBlueprintViews(blueprint: BlueprintViewInput): ResolvedView[] {
    return useMemo(() => {
        return BLUEPRINT_VIEWS.map((definition) => {
            const entry = blueprint.views.find((v) => v.type === definition.type) ?? null;

            const applicableForBlueprint =
                !definition.supportedClassifications
                || definition.supportedClassifications.includes(blueprint.classification);

            return {
                definition,
                entry,
                enabledForBlueprint: entry?.enabled ?? false,
                applicableForBlueprint,
                accessibleForUser: checkAccess(definition.access),
            };
        });
    }, [blueprint.classification, blueprint.views]);
}

/**
 * Convenience: the currently active view based on a type string
 * (usually from URL hash). Falls back to the first enabled view.
 */
export function resolveActiveView(
    blueprint: BlueprintViewInput,
    requestedType: string | null,
): ResolvedView | null {
    const resolved = BLUEPRINT_VIEWS.map((definition) => ({
        definition,
        entry: blueprint.views.find((v) => v.type === definition.type) ?? null,
    }));

    if (requestedType) {
        const match = resolved.find((r) => r.definition.type === requestedType && r.entry?.enabled);
        if (match) {
            return {
                definition: match.definition,
                entry: match.entry,
                enabledForBlueprint: true,
                applicableForBlueprint: true,
                accessibleForUser: true,
            };
        }
    }

    const firstEnabled = blueprint.views.find((v) => v.enabled);
    if (!firstEnabled) return null;
    const def = getViewDefinition(firstEnabled.type);
    if (!def) return null;

    return {
        definition: def,
        entry: firstEnabled,
        enabledForBlueprint: true,
        applicableForBlueprint: true,
        accessibleForUser: true,
    };
}

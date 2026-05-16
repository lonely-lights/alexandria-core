/**
 * Sparse-override JSON utilities for the theme cascade.
 *
 * Stage 8b M1.C.1 — used by `<TokenOverrideEditor>` to maintain a
 * `ThemeOverride` (DeepPartial<ThemeTokens>) as the user edits + resets
 * individual tokens. The cascade resolver in `@/theming` consumes the
 * same shape: only paths the user has explicitly overridden appear, all
 * other paths are absent so the resolver's deep-merge picks up the
 * inherited scope's value.
 *
 * All functions are pure: input override + path → new override. Never
 * mutate the input. The editor's "dirty" detection uses reference
 * equality on the returned override, so callers can wrap `setPath`
 * /`unsetPath` in `useState`'s setter directly.
 *
 * Paths are dot-notation strings: `"brand.primary.anchor"`,
 * `"radius.card"`, `"status.error.anchor"`. Matches the path shape used
 * by the resolver's `provenance` map so callers can look up
 * `provenance[path]` to get the scope a value comes from.
 */

// ----------------------------------------------------------------------------
// Types
// ----------------------------------------------------------------------------

/** Plain-object value at any depth of an override. */
type OverrideNode = Record<string, unknown>;

/** Top-level override shape — sparse DeepPartial<ThemeTokens>. */
export type ThemeOverridePatch = OverrideNode;

// ----------------------------------------------------------------------------
// Path parsing
// ----------------------------------------------------------------------------

/**
 * Split a dot-notation path into segments. Empty path → empty array.
 * Doesn't handle escaped dots — token keys don't contain them.
 */
function splitPath(path: string): string[] {
    if (path === '') {
        return [];
    }
    return path.split('.');
}

// ----------------------------------------------------------------------------
// Public API
// ----------------------------------------------------------------------------

/**
 * Set a value at a dot-notation path. Returns a new override with the
 * path populated; intermediate objects are created as needed. Other
 * paths are preserved unchanged (structural sharing where possible).
 *
 * `null` is a legitimate value at some leaves (e.g. `shadow.tint`); it
 * gets stored verbatim. Use `unsetPath` to remove a path entirely.
 */
export function setPath(
    override: ThemeOverridePatch | null,
    path: string,
    value: unknown,
): ThemeOverridePatch {
    const segments = splitPath(path);

    if (segments.length === 0) {
        throw new Error('setPath: empty path is not allowed');
    }

    const next: OverrideNode = override ? { ...override } : {};
    let cursor: OverrideNode = next;

    for (let i = 0; i < segments.length - 1; i++) {
        const key = segments[i];
        const existing = cursor[key];
        const branch: OverrideNode = isPlainObject(existing) ? { ...existing } : {};
        cursor[key] = branch;
        cursor = branch;
    }

    cursor[segments[segments.length - 1]] = value;

    return next;
}

/**
 * Remove a value at a dot-notation path. Returns a new override with
 * the path absent. Branches that become empty after removal are
 * pruned so the override stays minimally sparse — an editor that sets
 * then immediately unsets a leaf returns the same shape it started
 * with (often `null` if everything cleared out).
 *
 * Returns `null` if the resulting override is fully empty — caller
 * can treat this as "no overrides" and pass it through to the server
 * as such.
 */
export function unsetPath(
    override: ThemeOverridePatch | null,
    path: string,
): ThemeOverridePatch | null {
    if (!override) {
        return null;
    }

    const segments = splitPath(path);

    if (segments.length === 0) {
        throw new Error('unsetPath: empty path is not allowed');
    }

    const next: OverrideNode = { ...override };
    const trail: OverrideNode[] = [next];
    let cursor: OverrideNode = next;

    for (let i = 0; i < segments.length - 1; i++) {
        const key = segments[i];
        const existing = cursor[key];

        // Path doesn't exist — nothing to remove, return input as-is.
        if (!isPlainObject(existing)) {
            return override;
        }

        const branch: OverrideNode = { ...existing };
        cursor[key] = branch;
        trail.push(branch);
        cursor = branch;
    }

    const leafKey = segments[segments.length - 1];

    if (!(leafKey in cursor)) {
        return override;
    }

    delete cursor[leafKey];

    // Walk back up, pruning empty branches as we go.
    for (let i = trail.length - 1; i > 0; i--) {
        const branch = trail[i];
        if (Object.keys(branch).length === 0) {
            const parent = trail[i - 1];
            const segmentKey = segments[i - 1];
            delete parent[segmentKey];
        } else {
            break;
        }
    }

    return Object.keys(next).length === 0 ? null : next;
}

/**
 * Read a value at a dot-notation path. Returns `undefined` if any
 * segment along the path is absent. Useful for reading the current
 * WIP value out of an override to populate an editor input's display.
 */
export function getPath(
    override: ThemeOverridePatch | null | undefined,
    path: string,
): unknown {
    if (!override) {
        return undefined;
    }

    const segments = splitPath(path);
    let cursor: unknown = override;

    for (const key of segments) {
        if (!isPlainObject(cursor)) {
            return undefined;
        }
        cursor = (cursor as OverrideNode)[key];
    }

    return cursor;
}

/**
 * Has the user set a value at this path in the override? Distinct
 * from `getPath() !== undefined` because the editor needs to know
 * whether a leaf is overridden (so the reset affordance + provenance
 * badge can render appropriately) regardless of the actual value.
 */
export function hasPath(
    override: ThemeOverridePatch | null | undefined,
    path: string,
): boolean {
    if (!override) {
        return false;
    }

    const segments = splitPath(path);
    let cursor: unknown = override;

    for (let i = 0; i < segments.length - 1; i++) {
        if (!isPlainObject(cursor)) {
            return false;
        }
        cursor = (cursor as OverrideNode)[segments[i]];
    }

    if (!isPlainObject(cursor)) {
        return false;
    }

    return segments[segments.length - 1] in (cursor as OverrideNode);
}

// ----------------------------------------------------------------------------
// Internals
// ----------------------------------------------------------------------------

function isPlainObject(value: unknown): value is OverrideNode {
    if (value === null || typeof value !== 'object') {
        return false;
    }
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
}

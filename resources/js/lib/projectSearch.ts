import type { PaletteSearchResults } from '../types/navigation';
import { projectSearchUrl } from './urls';

/**
 * Returns a CommandPalette `onSearch` callback bound to a project's
 * /p/{slug}/search endpoint. Kept as a tiny helper so every project-
 * scoped surface (Project::Show, Blueprint::Show, future Entry::Show,
 * etc.) wires search the same way without each page restating the
 * fetch shape.
 *
 * The endpoint contract: GET /p/{slug}/search?q=... → JSON matching
 * PaletteSearchResults. The route ships from the consumer app (see
 * VL-B.2 / VL-D.2 controllers).
 */
export function projectSearch(
    projectSlug: string,
): (query: string) => Promise<PaletteSearchResults> {
    return async (query) => {
        const response = await fetch(
            `${projectSearchUrl(projectSlug)}?q=${encodeURIComponent(query)}`,
            {
                headers: {
                    Accept: 'application/json',
                    'X-Requested-With': 'XMLHttpRequest',
                },
                credentials: 'same-origin',
            },
        );

        if (!response.ok) {
            return { query, total: 0, groups: [] };
        }

        return response.json() as Promise<PaletteSearchResults>;
    };
}

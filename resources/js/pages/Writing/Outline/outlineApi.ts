/**
 * Shared fetch plumbing for the outline/board surfaces — extracted
 * 2026-08-28 (owner code review: the csrf/header helpers and the beat
 * PATCH lived as three copies across OutlineView, KanbanView, and
 * useOutlineSync).
 */

import { worksBase } from '@alexandria/lib/urls';

import type { OutlineBeat } from './outlineTypes';

function csrfToken(): string {
    return document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
}

export function outlineApiHeaders(withBody = false): HeadersInit {
    const headers: Record<string, string> = {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrfToken(),
    };

    if (withBody) {
        headers['Content-Type'] = 'application/json';
    }

    return headers;
}

/**
 * Toggle one beat's done flag via the beats PATCH. Resolves to the
 * server's fresh beats array, or `null` on any failure — callers keep
 * the outline/board's silent-retry semantics (the checkbox simply
 * doesn't flip; the next click retries).
 */
export async function patchBeatDone(
    projectSlug: string,
    workSlug: string,
    sectionId: number,
    beatId: string,
    done: boolean,
): Promise<OutlineBeat[] | null> {
    try {
        const response = await fetch(
            `${worksBase(projectSlug, workSlug)}/sections/${sectionId}/beats/${beatId}`,
            {
                method: 'PATCH',
                credentials: 'same-origin',
                headers: outlineApiHeaders(true),
                body: JSON.stringify({ done }),
            },
        );

        if (!response.ok) {
            return null;
        }

        const body = (await response.json()) as { beats: OutlineBeat[] };

        return body.beats;
    } catch {
        return null;
    }
}

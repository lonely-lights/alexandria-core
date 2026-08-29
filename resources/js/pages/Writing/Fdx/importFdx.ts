import { router } from '@inertiajs/react';

import { projectUrl } from '@alexandria/lib/urls';

/**
 * Import-from-Final-Draft helper — FDX Gateway Task 5. Not a component:
 * the ribbon's File-menu action calls this directly, so it owns the
 * whole flow itself — a hidden `<input type=file accept=".fdx">`
 * picker, a multipart POST, then a router visit to the new Work.
 *
 * `works-import/fdx` is a literal sibling segment of the `works` prefix
 * group, not nested under it (see routes/web.php in alexandria-app) —
 * there's no `{work}` to bind against yet, since importing a file is
 * how the Work gets created. It's fixed like `recycleBinUrl`/
 * `projectSearchUrl` in `@alexandria/lib/urls`, so this builds off
 * `projectUrl()` directly rather than `worksBase()`.
 *
 * CRITICAL — multipart doctrine (repo lesson, see the notes ImportModal
 * for the same pattern): headers must NOT set 'Content-Type'. The
 * browser generates the multipart boundary itself for a FormData body;
 * setting Content-Type manually strips that boundary and the server
 * receives a malformed request. `csrfHeaders()` hardcodes
 * 'Content-Type: application/json' so it can't be reused here — headers
 * are built inline with only Accept/X-Requested-With/X-CSRF-TOKEN.
 *
 * `onError` receives the server's validation message when the response
 * body carries one, or `null` for anything else (network failure,
 * non-JSON body, no message field). This module has no React tree to
 * pull `useT` from, so translation of a fallback message is left to the
 * caller, which does.
 */
function importHeaders(): HeadersInit {
    return {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '',
    };
}

export function importFdx(projectSlug: string, onError: (message: string | null) => void): void {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.fdx';
    input.style.display = 'none';

    input.addEventListener('change', () => {
        const file = input.files?.[0];
        input.remove();

        if (!file) {
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        fetch(`${projectUrl(projectSlug)}/works-import/fdx`, {
            method: 'POST',
            credentials: 'same-origin',
            headers: importHeaders(),
            body: formData,
        })
            .then(async (response) => {
                if (response.ok) {
                    const data = (await response.json()) as { workUrl: string };
                    router.visit(data.workUrl);
                    return;
                }

                const data = (await response.json().catch(() => null)) as { message?: string } | null;
                onError(data?.message ?? null);
            })
            .catch(() => onError(null));
    });

    document.body.appendChild(input);
    input.click();
}

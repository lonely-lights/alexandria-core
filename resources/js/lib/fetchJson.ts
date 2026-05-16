/**
 * fetchJson + useJsonFetch — the standard way to make JSON HTTP calls
 * from React-side Alexandria code.
 *
 * Replaces ~23 effect-driven fetches (Phase 4.4 sweep) that each
 * reimplemented the same shape:
 *
 *     fetch(url, {
 *         headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
 *         credentials: 'same-origin',
 *     })
 *         .then((r) => r.ok ? r.json() : ...)
 *         .then(setData)
 *         .catch(...)
 *
 * The function form (`fetchJson`) is for mutation handlers and
 * one-shot calls; the hook form (`useJsonFetch`) is for the
 * effect-driven "fetch when URL changes" pattern with AbortController
 * + loading state + refetch trigger.
 *
 * Reference pattern: `MembersSection.tsx` L467-510 — the gold-standard
 * implementation Phase 2.E flagged as the pattern card model.
 */

import { useEffect, useRef, useState } from 'react';

/**
 * Headers attached to every JSON request issued through this helper.
 * `credentials: 'same-origin'` is applied via the request init, not here.
 */
const DEFAULT_HEADERS = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
};

/**
 * Thrown when fetchJson receives a non-OK HTTP response. Status + the
 * raw Response are exposed so callers can branch on specific codes
 * (401, 403, 422) or read the body for an error payload.
 */
export class FetchJsonError extends Error {
    constructor(
        message: string,
        public readonly status: number,
        public readonly response: Response,
    ) {
        super(message);
        this.name = 'FetchJsonError';
    }
}

/**
 * Minimal fetch wrapper for JSON endpoints. Adds Accept +
 * X-Requested-With headers + same-origin credentials, throws on
 * non-OK responses, parses the body as JSON.
 *
 * Pass `signal` via the second arg when you need cancellation
 * (the `useJsonFetch` hook handles this for you internally).
 *
 *     const data = await fetchJson<NotesListResponse>(
 *         `/api/v1/projects/${projectId}/notes/dashboard-list?${params}`,
 *     );
 *
 * For mutations, use `csrfHeaders()` from `lib/csrfHeaders.ts`
 * and pass the result here:
 *
 *     await fetchJson<{ id: number }>(`/api/v1/notes/${id}/pin`, {
 *         method: 'PUT',
 *         headers: csrfHeaders(),
 *         body: JSON.stringify({ pinned: true }),
 *     });
 */
export async function fetchJson<T = unknown>(
    url: string,
    init?: RequestInit,
): Promise<T> {
    const response = await fetch(url, {
        credentials: 'same-origin',
        ...init,
        headers: {
            ...DEFAULT_HEADERS,
            ...(init?.headers ?? {}),
        },
    });

    if (!response.ok) {
        throw new FetchJsonError(
            `Request failed with status ${response.status}`,
            response.status,
            response,
        );
    }

    return (await response.json()) as T;
}

/**
 * State returned by `useJsonFetch`. `data` is `null` until the first
 * successful response. `loading` is true during the in-flight request
 * (and false during the no-op idle state when `url` is `null`).
 * `error` carries the most recent failure (cleared on each new request).
 * `refetch` re-runs the request with the same URL.
 */
export interface UseJsonFetchState<T> {
    data: T | null;
    loading: boolean;
    error: Error | null;
    refetch: () => void;
}

/**
 * Hook form for the "fetch JSON when this URL changes" pattern.
 *
 * Pass `null` to skip the fetch (useful for conditional loading —
 * e.g. don't fetch until a parent ID is known). The effect re-fires
 * whenever the URL string changes, so the call site typically
 * computes the URL via `useMemo` from the inputs that should trigger
 * a refetch:
 *
 *     const url = useMemo(
 *         () => `/api/v1/projects/${projectId}/notes?page=${page}&q=${query}`,
 *         [projectId, page, query],
 *     );
 *     const { data, loading, error, refetch } = useJsonFetch<NotesListResponse>(url);
 *
 * Internals: AbortController is stored in a ref and aborted on
 * URL change + on unmount. AbortError is distinguished from real
 * failures (silent on intentional cancellation). `refetch` bumps an
 * internal nonce so the same URL re-runs without changing the URL itself.
 */
export function useJsonFetch<T = unknown>(
    url: string | null,
): UseJsonFetchState<T> {
    const [data, setData] = useState<T | null>(null);
    const [loading, setLoading] = useState<boolean>(url !== null);
    const [error, setError] = useState<Error | null>(null);
    const [nonce, setNonce] = useState(0);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (url === null) {
            // `null` means "don't fetch" — also reset data so callers
            // that conditionally skip the fetch don't see stale results
            // from the previous URL. Aborts any in-flight request.
            abortRef.current?.abort();
            setData(null);
            setLoading(false);
            setError(null);
            return;
        }

        // Abort any in-flight request before starting a new one.
        abortRef.current?.abort();
        const controller = new AbortController();
        abortRef.current = controller;

        setLoading(true);
        setError(null);

        fetchJson<T>(url, { signal: controller.signal })
            .then((body) => {
                if (!controller.signal.aborted) {
                    setData(body);
                    setLoading(false);
                }
            })
            .catch((err: unknown) => {
                // AbortError is the deliberate-cancellation case — the
                // caller (re-render with new URL, unmount, or refetch
                // burst) replaced this request; don't surface it as an
                // error to the consumer.
                if (
                    err instanceof DOMException &&
                    err.name === 'AbortError'
                ) {
                    return;
                }
                setError(err instanceof Error ? err : new Error(String(err)));
                setLoading(false);
            });

        return () => {
            controller.abort();
        };
    }, [url, nonce]);

    return {
        data,
        loading,
        error,
        refetch: () => setNonce((n) => n + 1),
    };
}

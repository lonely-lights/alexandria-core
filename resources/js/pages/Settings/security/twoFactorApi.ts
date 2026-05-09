/**
 * Fortify two-factor endpoint shims — one function per action, each
 * returning a flat verdict the wizard step machines can switch on
 * without re-decoding response codes.
 *
 * `Accept: application/json` (via `csrfHeaders`) tells Fortify to
 * answer with JSON rather than redirect, so we get clean status codes.
 */
import { csrfHeaders } from '../../../lib/csrfHeaders';

export type ApiVerdict = 'ok' | 'invalid_password' | 'invalid_code' | 'error';

export async function confirmPassword(password: string): Promise<ApiVerdict> {
    const r = await fetch('/user/confirm-password', {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({ password }),
    }).catch(() => null);
    if (!r) return 'error';
    if (r.ok) return 'ok';
    if (r.status === 422) return 'invalid_password';
    return 'error';
}

export async function enableTwoFactor(): Promise<ApiVerdict> {
    const r = await fetch('/user/two-factor-authentication', {
        method: 'POST',
        headers: csrfHeaders(),
    }).catch(() => null);
    if (!r) return 'error';
    if (r.ok) return 'ok';
    return 'error';
}

export async function confirmTwoFactor(code: string): Promise<ApiVerdict> {
    const r = await fetch('/user/confirmed-two-factor-authentication', {
        method: 'POST',
        headers: csrfHeaders(),
        body: JSON.stringify({ code }),
    }).catch(() => null);
    if (!r) return 'error';
    if (r.ok) return 'ok';
    if (r.status === 422) return 'invalid_code';
    return 'error';
}

export async function regenerateRecoveryCodes(): Promise<ApiVerdict> {
    const r = await fetch('/user/two-factor-recovery-codes', {
        method: 'POST',
        headers: csrfHeaders(),
    }).catch(() => null);
    if (!r) return 'error';
    if (r.ok) return 'ok';
    return 'error';
}

export async function disableTwoFactor(): Promise<ApiVerdict> {
    const r = await fetch('/user/two-factor-authentication', {
        method: 'DELETE',
        headers: csrfHeaders(),
    }).catch(() => null);
    if (!r) return 'error';
    if (r.ok) return 'ok';
    return 'error';
}

/**
 * Fetch the current recovery codes — used by the enable + regenerate
 * wizards immediately after the codes are minted (or rotated). Returns
 * null on any failure; callers fall back to a generic error toast.
 */
export async function fetchRecoveryCodes(): Promise<string[] | null> {
    const r = await fetch('/user/two-factor-recovery-codes', {
        headers: {
            Accept: 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
        },
    }).catch(() => null);
    if (!r || !r.ok) return null;

    const data = await r.json().catch(() => null);
    return Array.isArray(data) ? data : null;
}

import { useEffect, useState } from 'react';
import type { PromiseGroup } from './threadApi';
import { fetchPromises } from './threadApi';

/**
 * Shared loader behind both open-promise surfaces (the dashboard rail
 * card and the library panel's grouped archive): fetch the project's
 * open-promise groups once per slug, with an unmount guard and a failed
 * flag for the quiet error state.
 */
export default function usePromiseGroups(projectSlug: string): {
    groups: PromiseGroup[] | null;
    failed: boolean;
} {
    const [groups, setGroups] = useState<PromiseGroup[] | null>(null);
    const [failed, setFailed] = useState(false);

    useEffect(() => {
        let cancelled = false;

        fetchPromises(projectSlug).then((result) => {
            if (cancelled) {
                return;
            }

            if (result === null) {
                setFailed(true);
                return;
            }

            setFailed(false);
            setGroups(result);
        });

        return () => {
            cancelled = true;
        };
    }, [projectSlug]);

    return { groups, failed };
}

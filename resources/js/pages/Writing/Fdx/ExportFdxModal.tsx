import { useState } from 'react';

import useT from '@alexandria/hooks/useT';
import Button from '@alexandria/components/ui/Button';
import Modal, { ModalHeader, ModalFooter } from '@alexandria/components/ui/Modal';
import CheckboxField from '@alexandria/components/form/CheckboxField';
import { worksBase } from '@alexandria/lib/urls';

/**
 * Export-to-Final-Draft options modal — FDX Gateway Task 5. Local
 * `useState` toggles rather than `useForm`, mirroring MoveSectionModal:
 * there is no server round trip to validate against, just three flags
 * folded into the export GET's query string.
 *
 * The export itself is a browser download (the route streams
 * `application/xml` with a `Content-Disposition: attachment` header),
 * so submit navigates the browser to the URL via `window.location.assign`
 * instead of an Inertia visit or fetch — a `router.visit`/fetch would
 * either try to swap the page with XML or never trigger the file-save
 * prompt at all.
 */
export default function ExportFdxModal({
    projectSlug,
    workSlug,
    onClose,
}: {
    projectSlug: string;
    workSlug: string;
    onClose: () => void;
}) {
    const t = useT();

    // Spec defaults: synopses/beats OFF, act & chapter markers ON.
    const [synopses, setSynopses] = useState(false);
    const [beats, setBeats] = useState(false);
    const [markers, setMarkers] = useState(true);

    function submit() {
        const params = new URLSearchParams({
            synopses: synopses ? '1' : '0',
            beats: beats ? '1' : '0',
            markers: markers ? '1' : '0',
        });

        window.location.assign(`${worksBase(projectSlug, workSlug)}/export/fdx?${params.toString()}`);
        onClose();
    }

    return (
        <Modal open onClose={onClose} maxWidth="max-w-md">
            <ModalHeader title={t('writing.fdx.export_title')} onClose={onClose} />
            <form
                noValidate
                onSubmit={(e) => {
                    e.preventDefault();
                    submit();
                }}
            >
                <div className="flex flex-col gap-3 px-6 py-5">
                    <CheckboxField
                        label={t('writing.fdx.include_synopses')}
                        name="synopses"
                        checked={synopses}
                        onChange={(e) => setSynopses(e.target.checked)}
                    />
                    <CheckboxField
                        label={t('writing.fdx.include_beats')}
                        name="beats"
                        checked={beats}
                        onChange={(e) => setBeats(e.target.checked)}
                    />
                    <CheckboxField
                        label={t('writing.fdx.include_markers')}
                        name="markers"
                        checked={markers}
                        onChange={(e) => setMarkers(e.target.checked)}
                    />
                </div>
                <ModalFooter>
                    <Button variant="ghost" onClick={onClose}>
                        {t('writing.form.cancel')}
                    </Button>
                    <Button type="submit">{t('writing.fdx.export_action')}</Button>
                </ModalFooter>
            </form>
        </Modal>
    );
}

import { useState, useEffect, useRef } from 'react';
import Modal from '@alexandria/components/ui/Modal';

interface ImportModalProps {
    open: boolean;
    onClose: () => void;
    projectId: number;
    contextType: string;
    contextId: number;
    onComplete: () => void;
}

export default function ImportModal({ open, onClose, projectId, contextType, contextId, onComplete }: ImportModalProps) {
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);
    const [result, setResult] = useState<string | null>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (open) {
            setFiles([]);
            setResult(null);
            setUploading(false);
        }
    }, [open]);

    function handleFileChange(e: { target: HTMLInputElement }) {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
            setResult(null);
        }
    }

    async function upload() {
        if (files.length === 0 || uploading) return;
        setUploading(true);
        setResult(null);

        const CHUNK_SIZE = 20; // PHP max_file_uploads default
        const csrfToken = document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')?.content ?? '';
        let totalQueued = 0;

        try {
            for (let i = 0; i < files.length; i += CHUNK_SIZE) {
                const chunk = files.slice(i, i + CHUNK_SIZE);
                const formData = new FormData();
                chunk.forEach((f) => formData.append('files[]', f));
                formData.append('context_type', contextType);
                formData.append('context_id', String(contextId));

                const res = await fetch(`/api/v1/projects/${projectId}/notes/import`, {
                    method: 'POST',
                    headers: {
                        'Accept': 'application/json',
                        'X-Requested-With': 'XMLHttpRequest',
                        'X-CSRF-TOKEN': csrfToken,
                    },
                    credentials: 'same-origin',
                    body: formData,
                });

                if (res.ok) {
                    const text = await res.text();
                    try {
                        const data = JSON.parse(text);
                        totalQueued += parseInt(data.message) || chunk.length;
                    } catch {
                        totalQueued += chunk.length;
                    }
                    setResult(`${totalQueued} of ${files.length} file(s) queued...`);
                } else {
                    const errData = await res.json().catch(() => ({}));
                    const msg = errData.message ?? `HTTP ${res.status}`;
                    console.error('[ImportModal] chunk error', res.status, errData);
                    setResult(`Import failed on batch ${Math.floor(i / CHUNK_SIZE) + 1}: ${msg}`);
                    return;
                }
            }

            setResult(`${files.length} file(s) queued for import`);
            setFiles([]);
            setTimeout(onComplete, 1500);
        } catch (err) {
            console.error('[ImportModal] error', err);
            setResult('An error occurred during import.');
        } finally {
            setUploading(false);
        }
    }

    return (
        <Modal open={open} onClose={onClose} maxWidth="max-w-md">
            <div className="p-6">
                <div className="mb-4 flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 640" className="h-5 w-5 fill-current text-primary/70">
                            <path d="M192 96L320 96L320 192C320 227.3 348.7 256 384 256L480 256L480 512C480 529.7 465.7 544 448 544L192 544C174.3 544 160 529.7 160 512L160 464L128 464L128 512C128 547.3 156.7 576 192 576L448 576C483.3 576 512 547.3 512 512L512 250.5C512 233.5 505.3 217.2 493.3 205.2L370.7 82.7C358.7 70.7 342.5 64 325.5 64L192 64C156.7 64 128 92.7 128 128L128 336L160 336L160 128C160 110.3 174.3 96 192 96zM352 109.3L466.7 224L384 224C366.3 224 352 209.7 352 192L352 109.3zM64 400C64 408.8 71.2 416 80 416L329.4 416L284.7 460.7C278.5 466.9 278.5 477.1 284.7 483.3C290.9 489.5 301.1 489.5 307.3 483.3L379.3 411.3C385.5 405.1 385.5 394.9 379.3 388.7L307.3 316.7C301.1 310.5 290.9 310.5 284.7 316.7C278.5 322.9 278.5 333.1 284.7 339.3L329.4 384L80 384C71.2 384 64 391.2 64 400z" />
                        </svg>
                    </div>
                    <div>
                        <h2 className="text-base font-bold">Import Notes</h2>
                        <p className="text-xs text-base-content/40">Upload JSON files from Google Keep or other sources</p>
                    </div>
                </div>

                {/* Drop zone */}
                <div
                    onClick={() => fileRef.current?.click()}
                    className="cursor-pointer rounded-xl border-2 border-dashed border-base-300 py-8 text-center transition-colors hover:border-primary/30 hover:bg-base-200/20"
                >
                    <i className="fa-solid fa-cloud-arrow-up mb-2 text-2xl text-base-content/15" />
                    <p className="text-sm text-base-content/40">
                        {files.length > 0
                            ? `${files.length} file${files.length > 1 ? 's' : ''} selected`
                            : 'Click to select JSON files'
                        }
                    </p>
                    {files.length > 0 && (
                        <div className="mx-auto mt-3 max-h-32 max-w-xs overflow-y-auto text-left">
                            {files.map((f, i) => (
                                <div key={i} className="flex items-center gap-2 py-0.5 text-xs text-base-content/50">
                                    <i className="fa-solid fa-file-code text-[10px] text-base-content/20" />
                                    <span className="truncate">{f.name}</span>
                                </div>
                            ))}
                        </div>
                    )}
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".json"
                        multiple
                        onChange={handleFileChange}
                        className="hidden"
                    />
                </div>

                {/* Result message */}
                {result && (
                    <div className={`mt-3 rounded-lg px-3 py-2 text-xs ${result.includes('failed') || result.includes('error') ? 'bg-error/10 text-error' : 'bg-success/10 text-success'}`}>
                        {result}
                    </div>
                )}

                {/* Actions */}
                <div className="mt-4 flex justify-end gap-2">
                    <button onClick={onClose} className="btn btn-ghost btn-sm text-xs">Cancel</button>
                    <button
                        onClick={() => void upload()}
                        disabled={files.length === 0 || uploading}
                        className="btn btn-primary btn-sm text-xs"
                    >
                        {uploading ? <span className="loading loading-spinner loading-xs" /> : 'Import'}
                    </button>
                </div>
            </div>
        </Modal>
    );
}

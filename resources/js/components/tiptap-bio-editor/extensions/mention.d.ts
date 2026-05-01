import type { Extension } from '@tiptap/core';

interface MentionOptions {
    searchEndpoint?: string;
    onSelect?: (item: unknown) => void;
}

export default function createMentionExtension(options?: MentionOptions): Extension;

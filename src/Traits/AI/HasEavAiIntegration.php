<?php

declare(strict_types=1);

namespace Alexandria\Core\Traits\AI;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\Note;
use Alexandria\Core\Services\AI\EavAiService;
use Illuminate\Contracts\Auth\Authenticatable;

/**
 * Project-level convenience facade for the EAV AI integration. Delegates
 * to EavAiService (resolved from the container) so host apps can swap the
 * service implementation. The Note categorization + entry-suggestion paths
 * route through the orchestrator (which lands in CT5d); autoComplete is
 * a plain name-prefix query and works without AI.
 *
 * The using class must:
 * - be an Eloquent model with `entries()` HasMany pointing at the Entry
 *   model (the Project model already provides this).
 *
 * @mixin Project
 */
trait HasEavAiIntegration
{
    /**
     * Start AI categorization for a note within this project.
     *
     * @throws \RuntimeException until the orchestrator (CT5d) is integrated
     */
    public function categorizeNoteWithAi(Note $note, Authenticatable $user): void
    {
        app(EavAiService::class)->categorizeNote($note, $user, $this);
    }

    /**
     * Generate entry suggestions based on text content.
     *
     * @return array<int, array<string, mixed>>
     *
     * @throws \RuntimeException until the orchestrator (CT5d) is integrated
     */
    public function suggestEntriesFromText(string $text, Authenticatable $user): array
    {
        return app(EavAiService::class)->suggestEntries($text, $this, $user);
    }

    /**
     * Auto-complete entry names by prefix. Optional blueprint slug filter.
     *
     * No AI involvement — this is a simple LIKE query against the project's
     * entries.
     *
     * @return array<int, array{id: int, name: string, slug: string}>
     */
    public function autoCompleteEntries(string $partial, ?string $blueprintSlug = null): array
    {
        return app(EavAiService::class)->autoCompleteEntries($partial, $this, $blueprintSlug);
    }

    /**
     * Get AI-powered entry relationship suggestions. Stub — returns empty
     * until CT5d lands the orchestrator.
     *
     * @return array<int, array<string, mixed>>
     */
    public function suggestEntryRelationships(int $entryId): array
    {
        // Validates the entry belongs to this project; the orchestrator side
        // of this lands in a later sub-slice.
        $this->entries()->findOrFail($entryId);

        return [];
    }

    /**
     * Whether AI features are enabled for this project. Default: true.
     * Override in a subclass or via a project setting.
     */
    public function hasAiIntegrationEnabled(): bool
    {
        return true;
    }
}

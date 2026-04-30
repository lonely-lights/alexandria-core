<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Notable\Note;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Support\Facades\Log;
use RuntimeException;

/**
 * EAV AI integration entry point. Most methods delegate to the
 * EavAiCategorizationOrchestrator (lands in CT5d). Until then, the
 * AI-dependent methods throw a clear RuntimeException so callers get a
 * direct error rather than silent no-ops. autoCompleteEntries works
 * standalone — no AI involved.
 *
 * The constructor accepts the orchestrator as an optional dependency
 * that's null today; CT5d will swap it in via the container binding.
 */
class EavAiService
{
    /**
     * Classify a note within an EAV project. Routes to the orchestrator.
     *
     * @throws RuntimeException until the orchestrator is integrated (CT5d)
     */
    public function categorizeNote(Note $note, Authenticatable $user, Project $project): void
    {
        throw new RuntimeException(sprintf(
            'EavAiService::categorizeNote requires EavAiCategorizationOrchestrator, '
            .'which lands in CT5d. The trait method is in place so callers can compile, '
            .'but the AI call surface is not yet wired. (note=%d, user=%s, project=%d)',
            $note->id,
            (string) $user->getAuthIdentifier(),
            $project->id,
        ));
    }

    /**
     * Generate entry suggestions from arbitrary text. Stubbed until CT5d.
     *
     * @return array<int, array<string, mixed>>
     */
    public function suggestEntries(string $text, Project $project, Authenticatable $user): array
    {
        // Legacy returned [] without an AI call — stub behavior preserved.
        // Log the invocation so operators can confirm the stub fired (and so
        // the params are consumed at the type-system level).
        Log::debug('EavAiService::suggestEntries stub invoked (CT5d not yet wired)', [
            'project_id' => $project->id,
            'user_id' => $user->getAuthIdentifier(),
            'text_length' => strlen($text),
        ]);

        return [];
    }

    /**
     * Auto-complete entry names by prefix within a project. Optional
     * blueprint-slug filter narrows to a single entry type.
     *
     * @return array<int, array{id: int, name: string, slug: string}>
     */
    public function autoCompleteEntries(string $partial, Project $project, ?string $blueprintSlug = null): array
    {
        // Escape SQL LIKE specials so a user-supplied prefix containing % or _
        // doesn't unintentionally turn into a wildcard expansion. Backslash
        // first so subsequent escapes aren't double-escaped.
        $escaped = str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $partial);
        $query = $project->entries()->where('name', 'LIKE', $escaped.'%');

        if ($blueprintSlug !== null) {
            $query->whereHas('type', function ($q) use ($blueprintSlug) {
                $q->where('slug', $blueprintSlug);
            });
        }

        return $query->limit(10)->get(['id', 'name', 'slug'])->toArray();
    }
}

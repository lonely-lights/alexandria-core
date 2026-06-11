<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\Writing;

use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Alexandria\Core\Models\Writing\WorkSectionEntryMention;
use Illuminate\Support\Facades\DB;

/**
 * Persists section content and keeps every derived value true —
 * Stage 8g.1. Word counts and mention rows are rebuilt from the
 * text on each save (never incremental), and the work's cached
 * word_count rollup follows. Recomputable from documents alone via
 * the alexandria:writing:rebuild command.
 */
readonly class WorkSectionContentService
{
    public function __construct(private SectionContentAnalyzer $analyzer) {}

    public function persist(WorkSection $section, ?string $content): WorkSection
    {
        $analysis = $this->analyzer->analyze($content, $section->effectiveFormat());

        DB::transaction(function () use ($section, $content, $analysis): void {
            $section->forceFill([
                'content' => $content,
                'word_count' => $analysis->wordCount,
            ])->save();

            $this->syncMentionRows($section, $analysis->mentionNames);
            $this->refreshWorkRollup($section->work_id);
        });

        return $section;
    }

    /**
     * Re-derives the pov/setting mention rows from the section's
     * reference fields. Called after craft-field saves (Plan 2).
     */
    public function syncReferenceMentions(WorkSection $section): void
    {
        DB::transaction(function () use ($section): void {
            foreach ([
                WorkSectionEntryMention::SOURCE_POV => $section->pov_entry_id,
                WorkSectionEntryMention::SOURCE_SETTING => $section->setting_entry_id,
            ] as $source => $entryId) {
                $section->entryMentions()->where('source', $source)->delete();

                if ($entryId !== null) {
                    $section->entryMentions()->create([
                        'entry_id' => $entryId,
                        'source' => $source,
                        'mention_count' => 1,
                    ]);
                }
            }
        });
    }

    /**
     * @param  array<string, int>  $mentionNames
     */
    private function syncMentionRows(WorkSection $section, array $mentionNames): void
    {
        $projectId = $section->work->project_id;

        $resolved = [];

        if ($mentionNames !== []) {
            $lowered = array_map(fn (string $name): string => mb_strtolower($name), array_keys($mentionNames));

            $entries = Entry::query()
                ->where('project_id', $projectId)
                ->whereIn(DB::raw('lower(name)'), $lowered)
                ->get(['id', 'name']);

            foreach ($mentionNames as $name => $count) {
                $entry = $entries->first(fn (Entry $candidate): bool => mb_strtolower($candidate->name) === mb_strtolower($name));

                if ($entry !== null) {
                    $resolved[$entry->id] = ($resolved[$entry->id] ?? 0) + $count;
                }
            }
        }

        $section->entryMentions()
            ->where('source', WorkSectionEntryMention::SOURCE_MENTION)
            ->whereNotIn('entry_id', array_keys($resolved))
            ->delete();

        foreach ($resolved as $entryId => $count) {
            $section->entryMentions()->updateOrCreate(
                ['entry_id' => $entryId, 'source' => WorkSectionEntryMention::SOURCE_MENTION],
                ['mention_count' => $count],
            );
        }
    }

    private function refreshWorkRollup(int $workId): void
    {
        Work::query()->whereKey($workId)->update([
            'word_count' => WorkSection::query()->where('work_id', $workId)->sum('word_count'),
        ]);
    }
}

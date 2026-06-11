<?php

declare(strict_types=1);

namespace Alexandria\Core\Console;

use Alexandria\Core\Models\Writing\WorkSection;
use Alexandria\Core\Services\Writing\WorkSectionContentService;
use Illuminate\Console\Command;
use Illuminate\Database\Eloquent\Collection;
use Throwable;

/**
 * Rebuilds every derived writing value (section word counts, mention
 * rows, work rollups) from raw content — Stage 8g.1. Safe to run any
 * time: derived data is a pure function of the documents.
 */
class RebuildWritingDataCommand extends Command
{
    protected $signature = 'alexandria:writing:rebuild {--work= : Restrict the rebuild to one work id}';

    protected $description = 'Rebuild derived writing data (word counts, mentions, rollups) from section content';

    /**
     * @throws Throwable a failed per-section transaction aborts the run
     */
    public function handle(WorkSectionContentService $contentService): int
    {
        /** @var Collection<int, WorkSection> $sections */
        $sections = WorkSection::query()
            ->when($this->option('work') !== null, fn ($query) => $query->where('work_id', (int) $this->option('work')))
            ->orderBy('id')
            ->get();

        foreach ($sections as $section) {
            $contentService->persist($section, $section->content);
            $contentService->syncReferenceMentions($section);
        }

        $this->info("Rebuilt derived data for {$sections->count()} sections.");

        return self::SUCCESS;
    }
}

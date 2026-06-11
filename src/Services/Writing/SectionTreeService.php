<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\Writing;

use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;

/**
 * Tree mutations for a work's sections — Stage 8g.1. Moves validate
 * same-work parentage and cycle safety (a section can never become
 * its own descendant); both touched sibling groups resequence to
 * dense 0-based positions. Slugs are work-scoped so moves never
 * change a section's URL.
 */
class SectionTreeService
{
    public function move(WorkSection $section, ?int $newParentId, int $position): void
    {
        if ($newParentId !== null) {
            $parent = WorkSection::query()->findOrFail($newParentId);

            if ($parent->work_id !== $section->work_id) {
                throw new InvalidArgumentException('Target parent belongs to another work.');
            }

            if ($parent->id === $section->id || $this->isDescendantOf($parent, $section)) {
                throw new InvalidArgumentException('A section cannot become its own descendant.');
            }
        }

        DB::transaction(function () use ($section, $newParentId, $position): void {
            $oldParentId = $section->parent_id;

            $section->forceFill(['parent_id' => $newParentId, 'position' => $position])->save();

            $this->resequence($section->work_id, $newParentId, $section->id, $position);

            if ($oldParentId !== $newParentId) {
                $this->resequence($section->work_id, $oldParentId);
            }
        });
    }

    /**
     * @param  array<int, int>  $orderedIds
     */
    public function reorder(Work $work, ?int $parentId, array $orderedIds): void
    {
        DB::transaction(function () use ($work, $parentId, $orderedIds): void {
            foreach (array_values($orderedIds) as $index => $id) {
                WorkSection::query()
                    ->where('work_id', $work->id)
                    ->where('parent_id', $parentId)
                    ->whereKey($id)
                    ->update(['position' => $index]);
            }
        });
    }

    private function isDescendantOf(WorkSection $candidate, WorkSection $ancestor): bool
    {
        $current = $candidate;

        while ($current->parent_id !== null) {
            if ($current->parent_id === $ancestor->id) {
                return true;
            }

            // A soft-deleted ancestor breaks the visible chain — the
            // candidate cannot be a (live) descendant past that point.
            $current = $current->parent;

            if ($current === null) {
                return false;
            }
        }

        return false;
    }

    /**
     * Rewrite a sibling group to dense 0-based positions. When a moved
     * section is supplied it is held at its requested slot and the
     * remaining siblings fill around it.
     */
    private function resequence(int $workId, ?int $parentId, ?int $movedId = null, ?int $movedPosition = null): void
    {
        $siblings = WorkSection::query()
            ->where('work_id', $workId)
            ->where('parent_id', $parentId)
            ->when($movedId !== null, fn ($query) => $query->whereKeyNot($movedId))
            ->orderBy('position')
            ->orderBy('id')
            ->get();

        $slot = 0;

        foreach ($siblings as $sibling) {
            if ($movedPosition !== null && $slot === $movedPosition) {
                $slot++; // the moved section occupies this slot
            }

            if ($sibling->position !== $slot) {
                $sibling->forceFill(['position' => $slot])->save();
            }

            $slot++;
        }
    }
}

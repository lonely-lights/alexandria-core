<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\Writing;

use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * Creates a work with its type's starter structure and length-plan
 * preset — Stage 8g.1. Templates and presets live in
 * config('alexandria.writing'); consumers override config, not code.
 */
class WorkScaffolder
{
    /**
     * @param  array{title: string, type: string, logline?: string|null, genre?: string|null}  $attributes
     *
     * @throws Throwable
     */
    public function create(Project $project, int $userId, array $attributes): Work
    {
        $type = $attributes['type'];
        $template = config("alexandria.writing.templates.$type")
            ?? config('alexandria.writing.templates.other');

        $planKey = $template['length_plan'] ?? null;
        $plan = $planKey !== null ? config("alexandria.writing.length_plans.$planKey") : null;

        return DB::transaction(function () use ($project, $userId, $attributes, $template, $plan): Work {
            /** @var Work $work */
            $work = Work::create([
                ...$attributes,
                'project_id' => $project->id,
                'user_id' => $userId,
                'format' => $template['format'],
                'length_plan' => $plan,
                'target_words' => $plan['target_words'] ?? null,
            ]);

            foreach ($template['sections'] ?? [] as $node) {
                $this->createSection($work, $node, null, $plan['per_section_words'] ?? null);
            }

            return $work;
        });
    }

    /**
     * @param  array{label: string, title: string, children?: array<int, mixed>}  $node
     */
    private function createSection(Work $work, array $node, ?int $parentId, ?int $perSectionWords): void
    {
        /** @var WorkSection $section */
        $section = $work->sections()->create([
            'parent_id' => $parentId,
            'title' => $node['title'],
            'label' => $node['label'],
            'target_words' => $perSectionWords,
        ]);

        foreach ($node['children'] ?? [] as $child) {
            $this->createSection($work, $child, $section->id, $perSectionWords);
        }
    }
}

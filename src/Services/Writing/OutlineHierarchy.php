<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\Writing;

use Alexandria\Core\Models\Writing\Work;
use Illuminate\Support\Collection;

final class OutlineHierarchy
{
    /** @return list<array{label: string, isStructural: bool}> */
    public function resolve(Work $work, Collection $sections): array
    {
        $tiers = config("alexandria.writing.outline_hierarchies.$work->type", []);
        if ($tiers === []) {
            $template = config("alexandria.writing.templates.$work->type")
                ?? config('alexandria.writing.templates.other', []);
            $walkTemplate = function (array $nodes, int $depth) use (&$walkTemplate, &$tiers): void {
                foreach ($nodes as $node) {
                    $children = $node['children'] ?? [];
                    $tiers[$depth] ??= ['label' => $node['label'], 'isStructural' => $children !== []];
                    $walkTemplate($children, $depth + 1);
                }
            };
            $walkTemplate($template['sections'] ?? [], 0);
        }
        $byParent = $sections->sortBy('position')->groupBy(fn ($section) => $section->parent_id ?? 0);
        $seenDepths = [];
        $visited = [];
        $walk = function (?int $parentId, int $depth) use (&$walk, &$tiers, &$seenDepths, &$visited, $byParent): void {
            foreach ($byParent->get($parentId ?? 0, collect()) as $section) {
                if (isset($visited[$section->id])) {
                    continue;
                }
                $visited[$section->id] = true;
                if (! isset($seenDepths[$depth]) && filled($section->label)) {
                    $tiers[$depth] = [
                        'label' => $section->label,
                        'isStructural' => $section->is_structural || $byParent->has($section->id)
                            || ($tiers[$depth]['isStructural'] ?? false),
                    ];
                    $seenDepths[$depth] = true;
                }
                $walk($section->id, $depth + 1);
            }
        };
        $walk(null, 0);
        ksort($tiers);

        return array_values($tiers) ?: [['label' => 'Section', 'isStructural' => false]];
    }
}

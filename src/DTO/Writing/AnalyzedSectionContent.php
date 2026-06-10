<?php

declare(strict_types=1);

namespace Alexandria\Core\DTO\Writing;

/**
 * Result of one SectionContentAnalyzer pass — Stage 8g.1.
 *
 * mentionNames maps the raw [[wiki-link]] target name to its
 * occurrence count; resolution to Entry ids happens later in
 * WorkSectionContentService (name → entry within the project).
 */
final readonly class AnalyzedSectionContent
{
    /**
     * @param  array<string, int>  $mentionNames
     */
    public function __construct(
        public int $wordCount,
        public ?int $pageEstimate,
        public array $mentionNames,
    ) {}
}

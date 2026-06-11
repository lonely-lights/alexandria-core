<?php

declare(strict_types=1);

namespace Alexandria\Core\DTO\Writing;

/**
 * Result of one SectionContentAnalyzer pass — Stage 8g.1.
 *
 * lineCount is the number of non-empty trimmed lines of the visible
 * text (after wiki-link replacement) for every format; pageEstimate
 * derives from it for screenplay only. mentionNames maps the raw
 * [[wiki-link]] target name to its occurrence count; resolution to
 * Entry ids happens later in WorkSectionContentService (name → entry
 * within the project).
 */
final readonly class AnalyzedSectionContent
{
    /**
     * @param  array<string, int>  $mentionNames
     */
    public function __construct(
        public int $wordCount,
        public ?int $pageEstimate,
        public int $lineCount,
        public array $mentionNames,
    ) {}
}

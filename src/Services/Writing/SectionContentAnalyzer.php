<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\Writing;

use Alexandria\Core\DTO\Writing\AnalyzedSectionContent;

/**
 * One pass over a section's text content — Stage 8g.1. Produces the
 * canonical word count (the editor's live count is cosmetic), the
 * screenplay page estimate, and the raw mention names, all from the
 * same walk. Pure function of (content, format) + config metrics;
 * 8g.2 craft analyzers are siblings of this walker.
 */
class SectionContentAnalyzer
{
    private const string WIKI_LINK_PATTERN = '/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/u';

    public function analyze(?string $content, string $format): AnalyzedSectionContent
    {
        $content ??= '';

        $mentionNames = [];

        $visibleText = (string) preg_replace_callback(
            self::WIKI_LINK_PATTERN,
            function (array $match) use (&$mentionNames): string {
                $name = trim($match[1]);
                $mentionNames[$name] = ($mentionNames[$name] ?? 0) + 1;

                return trim($match[2] ?? '') !== '' ? trim($match[2]) : $name;
            },
            $content,
        );

        $words = preg_split('/[\s\x{00A0}]+/u', trim($visibleText), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $wordCount = count(array_filter($words, fn (string $word): bool => preg_match('/[\p{L}\p{N}]/u', $word) === 1));

        $lines = array_filter(array_map('trim', explode("\n", $visibleText)), fn (string $line): bool => $line !== '');
        $lineCount = count($lines);

        $pageEstimate = null;

        if ($format === 'screenplay') {
            $linesPerPage = max(1, (int) config('alexandria.writing.formats.screenplay.lines_per_page', 55));
            $pageEstimate = (int) ceil($lineCount / $linesPerPage);
        }

        return new AnalyzedSectionContent($wordCount, $pageEstimate, $lineCount, $mentionNames);
    }
}

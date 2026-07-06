<?php

declare(strict_types=1);

use Alexandria\Core\Services\Writing\SectionContentAnalyzer;

it('counts prose words treating wiki links as their display text', function () {
    $result = app(SectionContentAnalyzer::class)
        ->analyze('[[Mira Vance|Mira]] crossed the bridge to [[Haven Spire]].', 'prose');

    // Visible text: "Mira crossed the bridge to Haven Spire." = 7 words
    // 7 words at 250 words/page => ceil(7/250) = 1
    expect($result->wordCount)->toBe(7)
        ->and($result->pageEstimate)->toBe(1)
        ->and($result->mentionNames)->toBe(['Mira Vance' => 1, 'Haven Spire' => 1]);
});

it('counts repeat mentions of the same entry', function () {
    $result = app(SectionContentAnalyzer::class)
        ->analyze('[[Mira Vance]] waited. [[Mira Vance]] left.', 'prose');

    expect($result->mentionNames)->toBe(['Mira Vance' => 2]);
});

it('handles empty and null-ish content', function () {
    $result = app(SectionContentAnalyzer::class)->analyze('', 'prose');

    expect($result->wordCount)->toBe(0)
        ->and($result->lineCount)->toBe(0)
        ->and($result->mentionNames)->toBe([]);
});

it('estimates screenplay pages from non-empty lines via config metric', function () {
    config()->set('alexandria.writing.formats.screenplay.lines_per_page', 10);

    $lines = implode("\n", array_fill(0, 25, 'INT. LIBRARY - NIGHT'));

    $result = app(SectionContentAnalyzer::class)->analyze($lines, 'screenplay');

    expect($result->pageEstimate)->toBe(3) // ceil(25 / 10)
        ->and($result->lineCount)->toBe(25) // same lines that feed the page estimate
        ->and($result->wordCount)->toBe(75); // 3 counted words per line (bare "-" has no letter/digit) x 25
});

it('counts non-empty trimmed lines for prose content', function () {
    $content = "First stanza line one\nFirst stanza line two\n\n   \nSecond stanza line one\n\n";

    $result = app(SectionContentAnalyzer::class)->analyze($content, 'prose');

    // 12 words across 3 lines; ceil(12/250) = 1
    expect($result->lineCount)->toBe(3) // blank/whitespace-only lines don't count
        ->and($result->pageEstimate)->toBe(1);
});

it('counts lines of the visible text after wiki-link replacement', function () {
    $result = app(SectionContentAnalyzer::class)
        ->analyze("[[Mira Vance|Mira]] waits\n\n[[Haven Spire]]", 'prose');

    expect($result->lineCount)->toBe(2)
        ->and($result->mentionNames)->toBe(['Mira Vance' => 1, 'Haven Spire' => 1]);
});

it('extracts mentions from screenplay action lines too', function () {
    $result = app(SectionContentAnalyzer::class)
        ->analyze("INT. SPIRE - DAY\n\n[[Mira Vance]] enters.", 'screenplay');

    expect($result->mentionNames)->toBe(['Mira Vance' => 1]);
});

it('estimates prose pages from the words-per-page metric', function () {
    $analyzer = app(SectionContentAnalyzer::class);

    // 500 words at 250 words/page => 2 pages.
    $content = implode(' ', array_fill(0, 500, 'word'));

    $result = $analyzer->analyze($content, 'prose');

    expect($result->pageEstimate)->toBe(2);
});

it('keeps a one-page floor for short prose', function () {
    $analyzer = app(SectionContentAnalyzer::class);

    expect($analyzer->analyze('just a few words', 'prose')->pageEstimate)->toBe(1)
        ->and($analyzer->analyze('', 'prose')->pageEstimate)->toBe(0);
});

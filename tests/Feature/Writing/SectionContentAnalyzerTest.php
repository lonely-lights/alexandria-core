<?php

declare(strict_types=1);

use Alexandria\Core\Services\Writing\SectionContentAnalyzer;

it('counts prose words treating wiki links as their display text', function () {
    $result = app(SectionContentAnalyzer::class)
        ->analyze('[[Mira Vance|Mira]] crossed the bridge to [[Haven Spire]].', 'prose');

    // Visible text: "Mira crossed the bridge to Haven Spire." = 7 words
    expect($result->wordCount)->toBe(7)
        ->and($result->pageEstimate)->toBeNull()
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
        ->and($result->mentionNames)->toBe([]);
});

it('estimates screenplay pages from non-empty lines via config metric', function () {
    config()->set('alexandria.writing.formats.screenplay.lines_per_page', 10);

    $lines = implode("\n", array_fill(0, 25, 'INT. LIBRARY - NIGHT'));

    $result = app(SectionContentAnalyzer::class)->analyze($lines, 'screenplay');

    expect($result->pageEstimate)->toBe(3) // ceil(25 / 10)
        ->and($result->wordCount)->toBe(75); // 3 counted words per line (bare "-" has no letter/digit) x 25
});

it('extracts mentions from screenplay action lines too', function () {
    $result = app(SectionContentAnalyzer::class)
        ->analyze("INT. SPIRE - DAY\n\n[[Mira Vance]] enters.", 'screenplay');

    expect($result->mentionNames)->toBe(['Mira Vance' => 1]);
});

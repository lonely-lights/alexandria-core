<?php

declare(strict_types=1);
use Alexandria\Core\Models\Writing\Work;
use Alexandria\Core\Models\Writing\WorkSection;
use Alexandria\Core\Services\Writing\SectionTreeService;
use Illuminate\Foundation\Testing\RefreshDatabase;

uses(RefreshDatabase::class);
it('casts nullable durations and retains them through duplicate and move', function () {
    foreach ([null, 0, 150] as $time) {
        $work = Work::factory()->create(['target_runtime_seconds' => $time]);
        $section = WorkSection::factory()->create(['work_id' => $work->id, 'duration_seconds' => $time]);
        expect($work->fresh()->target_runtime_seconds)->toBe($time);
        expect($section->fresh()->duration_seconds)->toBe($time);
        $copy = app(SectionTreeService::class)->duplicateSubtree($section, 'Copy');
        expect($copy->duration_seconds)->toBe($time);
        app(SectionTreeService::class)->move($copy, $section->id, 0);
        expect($copy->fresh()->duration_seconds)->toBe($time);
    }
});

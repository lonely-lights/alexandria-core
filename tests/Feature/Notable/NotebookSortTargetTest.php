<?php

declare(strict_types=1);

use Alexandria\Core\Models\Notable\Notebook;

it('generates a slug from the title on create when none is given', function () {
    $notebook = Notebook::factory()->create(['title' => 'Beat Timings', 'slug' => null]);

    expect($notebook->slug)->toBe('beat-timings');
});

it('keeps an explicit slug when one is provided', function () {
    $notebook = Notebook::factory()->create(['title' => 'Quotes', 'slug' => 'custom-quotes']);

    expect($notebook->slug)->toBe('custom-quotes');
});

it('casts allow_ai_sort and is_catch_all to booleans', function () {
    $notebook = Notebook::factory()->create(['allow_ai_sort' => 1, 'is_catch_all' => 0]);

    expect($notebook->allow_ai_sort)->toBeTrue()
        ->and($notebook->is_catch_all)->toBeFalse();
});

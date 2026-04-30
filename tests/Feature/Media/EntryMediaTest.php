<?php

declare(strict_types=1);

/**
 * Entry media-library tests. Same trait-method-via-Collection|Model
 * issue as ProjectMediaTest -- see that file's docblock for context.
 *
 * @noinspection PhpUndefinedMethodInspection
 * @noinspection PhpUndefinedFieldInspection
 */

use Alexandria\Core\Models\System\Entry;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\MediaLibrary\HasMedia;

uses(RefreshDatabase::class);

it('implements the HasMedia interface', function () {
    expect(Entry::factory()->create())->toBeInstanceOf(HasMedia::class);
});

it('registers the three media collections', function () {
    $entry = Entry::factory()->create();
    $collections = $entry->getRegisteredMediaCollections();

    expect($collections->pluck('name')->all())->toContain('page_image', 'banner', 'gallery');
});

it('returns empty strings for media url accessors before any uploads', function () {
    $entry = Entry::factory()->create();

    expect($entry->page_image_url)->toBe('')
        ->and($entry->banner_desktop_url)->toBe('');
});

it('hasPageImage and hasBanner return false when no media attached', function () {
    $entry = Entry::factory()->create();

    expect($entry->hasPageImage())->toBeFalse()
        ->and($entry->hasBanner())->toBeFalse();
});

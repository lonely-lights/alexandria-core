<?php

declare(strict_types=1);

use Alexandria\Core\Models\System\Blueprint;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\MediaLibrary\HasMedia;

uses(RefreshDatabase::class);

it('implements the HasMedia interface', function () {
    expect(Blueprint::factory()->create())->toBeInstanceOf(HasMedia::class);
});

it('registers the three media collections with correct singleFile flags', function () {
    $blueprint = Blueprint::factory()->create();
    $collections = $blueprint->getRegisteredMediaCollections();

    expect($collections->pluck('name')->all())->toContain('page_image', 'banner', 'gallery');

    $pageImage = $collections->firstWhere('name', 'page_image');
    $banner = $collections->firstWhere('name', 'banner');
    $gallery = $collections->firstWhere('name', 'gallery');

    expect($pageImage->singleFile)->toBeTrue()
        ->and($banner->singleFile)->toBeTrue()
        ->and($gallery->singleFile)->toBeFalse();
});

it('returns empty strings for media url accessors before any uploads', function () {
    $blueprint = Blueprint::factory()->create();

    expect($blueprint->page_image_url)->toBe('')
        ->and($blueprint->banner_desktop_url)->toBe('');
});

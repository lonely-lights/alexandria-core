<?php

declare(strict_types=1);

use Alexandria\Core\Models\Framework\Project;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\MediaLibrary\HasMedia;

uses(RefreshDatabase::class);

it('implements the HasMedia interface', function () {
    $project = Project::factory()->create();
    expect($project)->toBeInstanceOf(HasMedia::class);
});

it('registers the page_image, banner, and gallery media collections', function () {
    $project = Project::factory()->create();

    // Trigger registerMediaCollections() by calling getRegisteredMediaCollections().
    $collections = $project->getRegisteredMediaCollections();

    expect($collections->pluck('name')->all())
        ->toContain('page_image', 'banner', 'gallery');
});

it('marks page_image and banner as singleFile', function () {
    $project = Project::factory()->create();

    $collections = $project->getRegisteredMediaCollections();
    $pageImage = $collections->firstWhere('name', 'page_image');
    $banner = $collections->firstWhere('name', 'banner');
    $gallery = $collections->firstWhere('name', 'gallery');

    expect($pageImage->singleFile)->toBeTrue()
        ->and($banner->singleFile)->toBeTrue()
        ->and($gallery->singleFile)->toBeFalse();
});

it('returns empty strings for media url accessors when no media is attached', function () {
    $project = Project::factory()->create();

    expect($project->page_image_url)->toBe('')
        ->and($project->page_image_thumb_url)->toBe('')
        ->and($project->banner_desktop_url)->toBe('')
        ->and($project->banner_mobile_url)->toBe('')
        ->and($project->banner_preview_url)->toBe('');
});

it('hasPageImage and hasBanner return false when no media attached', function () {
    $project = Project::factory()->create();

    expect($project->hasPageImage())->toBeFalse()
        ->and($project->hasBanner())->toBeFalse();
});

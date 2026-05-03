<?php

declare(strict_types=1);

use Alexandria\Core\Support\ConfigDeepMerge;

/**
 * Tests the deep-merge contract that powers the consumer config-publish
 * extension point. Loads core's actual config/alexandria.php as the
 * defaults so any future addition to the file is exercised by the same
 * partial-override scenario.
 *
 * The provider-side wiring (AlexandriaServiceProvider's
 * mergeConfigDeepFrom calling this helper during register()) is
 * implicitly verified by ConfigPublishingTest still passing — those
 * model-binding assertions only resolve when the package config has
 * actually been merged into the runtime config.
 */
function loadCorePackageDefaults(): array
{
    return require __DIR__.'/../../config/alexandria.php';
}

function applyOverride(array $override): array
{
    return ConfigDeepMerge::merge(loadCorePackageDefaults(), $override);
}

it('preserves consumer-overridden leaf values', function () {
    $merged = applyOverride([
        'media' => [
            'page_image' => [
                'square' => ['width' => 9999],
            ],
        ],
    ]);

    expect($merged['media']['page_image']['square']['width'])->toBe(9999);
});

it('preserves sibling keys at the same nesting level (page_image.square.height)', function () {
    $defaults = loadCorePackageDefaults();
    $merged = applyOverride([
        'media' => [
            'page_image' => [
                'square' => ['width' => 9999],
            ],
        ],
    ]);

    expect($merged['media']['page_image']['square']['height'])
        ->toBe($defaults['media']['page_image']['square']['height']);
});

it('preserves sibling sub-trees the consumer did not touch (page_image.thumb)', function () {
    $defaults = loadCorePackageDefaults();
    $merged = applyOverride([
        'media' => [
            'page_image' => [
                'square' => ['width' => 9999],
            ],
        ],
    ]);

    expect($merged['media']['page_image']['thumb'])
        ->toBe($defaults['media']['page_image']['thumb']);
});

it('preserves un-overridden top-level sub-trees (banner)', function () {
    $defaults = loadCorePackageDefaults();
    $merged = applyOverride([
        'media' => [
            'page_image' => [
                'square' => ['width' => 9999],
            ],
        ],
    ]);

    expect($merged['media']['banner'])->toBe($defaults['media']['banner']);
});

it('preserves un-overridden top-level keys (models)', function () {
    $defaults = loadCorePackageDefaults();
    $merged = applyOverride([
        'media' => [
            'page_image' => [
                'square' => ['width' => 9999],
            ],
        ],
    ]);

    expect($merged['models'])->toBe($defaults['models']);
});

it('replaces list-shaped config wholesale rather than appending (media.accepted_mimes)', function () {
    $merged = applyOverride([
        'media' => [
            'accepted_mimes' => ['image/avif'],
        ],
    ]);

    // List override = full replacement. Important contract: consumers
    // who narrow the accepted-mimes list don't get the broader core
    // list silently re-merged at sibling indexes.
    expect($merged['media']['accepted_mimes'])->toBe(['image/avif']);
});

it('replaces nested list-shaped config wholesale (media.crop_ratios)', function () {
    $merged = applyOverride([
        'media' => [
            'crop_ratios' => ['16:9'],
        ],
    ]);

    expect($merged['media']['crop_ratios'])->toBe(['16:9']);
});

it('treats overriding a scalar as wholesale replacement', function () {
    $merged = applyOverride([
        'media' => [
            'page_image' => [
                'max_upload_size' => 1024,
            ],
        ],
    ]);

    expect($merged['media']['page_image']['max_upload_size'])->toBe(1024);
});

it('returns defaults unchanged when the override is empty', function () {
    $defaults = loadCorePackageDefaults();
    $merged = applyOverride([]);

    expect($merged)->toBe($defaults);
});

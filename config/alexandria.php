<?php

declare(strict_types=1);
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\BlueprintField;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\EntryRelationship;
use Alexandria\Core\Models\System\FieldValue;
use Alexandria\Core\Models\System\RelationshipBlueprint;
use Illuminate\Foundation\Auth\User;

return [
    /*
    |--------------------------------------------------------------------------
    | Media Library
    |--------------------------------------------------------------------------
    |
    | Image conversion dimensions for HasAlexandriaMedia. Each registered
    | collection (page_image, banner, gallery) declares its sizes here.
    | Override per-app by publishing config/alexandria.php and editing.
    |
    */
    'media' => [
        'page_image' => [
            'square' => ['width' => 512, 'height' => 512],
            'thumb' => ['width' => 128, 'height' => 128],
            'small' => ['width' => 64, 'height' => 64],
            'max_upload_size' => 5120,
        ],
        'banner' => [
            'desktop' => ['width' => 1920, 'height' => 400],
            'mobile' => ['width' => 800, 'height' => 600],
            'preview' => ['width' => 600, 'height' => 150],
            'max_upload_size' => 10240,
        ],
        'gallery' => [
            'display' => ['width' => 1200],
            'thumb' => ['width' => 256, 'height' => 256],
            'max_upload_size' => 10240,
        ],
        'accepted_mimes' => ['image/jpeg', 'image/png', 'image/webp'],
        'crop_ratios' => [
            '3:2' => 1.5,
            '2:3' => 0.667,
            '16:9' => 1.778,
            '1:1' => 1.0,
        ],
    ],

    /*
    |--------------------------------------------------------------------------
    | Model Bindings
    |--------------------------------------------------------------------------
    |
    | Override any Alexandria model with your own subclass. The framework
    | resolves model classes through these config values, never via direct
    | class references. To swap a model, extend the default class and
    | replace the binding here.
    |
    */
    'models' => [
        'blueprint' => Blueprint::class,
        'blueprint_field' => BlueprintField::class,
        'entry' => Entry::class,
        'entry_relationship' => EntryRelationship::class,
        'field_value' => FieldValue::class,
        'project' => Project::class,
        'relationship_blueprint' => RelationshipBlueprint::class,
        'user' => User::class,
    ],
];

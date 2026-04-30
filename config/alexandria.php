<?php

declare(strict_types=1);
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\Blueprint;
use Alexandria\Core\Models\System\BlueprintField;
use Alexandria\Core\Models\System\Entry;
use Alexandria\Core\Models\System\FieldValue;
use Illuminate\Foundation\Auth\User;

return [
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
        'user' => User::class,
        'project' => Project::class,
        'blueprint' => Blueprint::class,
        'blueprint_field' => BlueprintField::class,
        'entry' => Entry::class,
        'field_value' => FieldValue::class,
    ],
];

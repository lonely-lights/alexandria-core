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

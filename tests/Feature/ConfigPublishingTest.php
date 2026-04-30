<?php

declare(strict_types=1);
use Alexandria\Core\Models\Framework\Project;
use Alexandria\Core\Models\System\EntryRelationship;
use Alexandria\Core\Models\System\RelationshipBlueprint;
use Illuminate\Foundation\Auth\User;

it('exposes the User binding via config', function () {
    expect(config('alexandria.models.user'))
        ->toBe(User::class);
});

it('exposes the Project binding via config', function () {
    expect(config('alexandria.models.project'))
        ->toBe(Project::class);
});

it('exposes the EntryRelationship binding via config', function () {
    expect(config('alexandria.models.entry_relationship'))
        ->toBe(EntryRelationship::class);
});

it('exposes the RelationshipBlueprint binding via config', function () {
    expect(config('alexandria.models.relationship_blueprint'))
        ->toBe(RelationshipBlueprint::class);
});

it('publishes the alexandria config when vendor:publish is run', function () {
    $stub = realpath(__DIR__.'/../../config/alexandria.php');
    expect($stub)->toBeFile();
});

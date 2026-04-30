<?php

declare(strict_types=1);
use Illuminate\Foundation\Auth\User;

it('exposes the alexandria config with default model bindings', function () {
    // Re-enabled in Task 4 once Project model exists.
    // expect(config('alexandria.models.project'))
    //     ->toBe(\Alexandria\Core\Models\Framework\Project::class);

    expect(config('alexandria.models.user'))
        ->toBe(User::class);
})->todo('re-enable after Task 4 lifts Project');

it('publishes the alexandria config when vendor:publish is run', function () {
    $stub = realpath(__DIR__.'/../../config/alexandria.php');
    expect($stub)->toBeFile();
});

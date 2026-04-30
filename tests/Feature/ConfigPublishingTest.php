<?php

declare(strict_types=1);
use Alexandria\Core\Models\Framework\Project;
use Illuminate\Foundation\Auth\User;

it('exposes the User binding via config', function () {
    expect(config('alexandria.models.user'))
        ->toBe(User::class);
});

it('exposes the Project binding via config', function () {
    expect(config('alexandria.models.project'))
        ->toBe(Project::class);
});

it('publishes the alexandria config when vendor:publish is run', function () {
    $stub = realpath(__DIR__.'/../../config/alexandria.php');
    expect($stub)->toBeFile();
});

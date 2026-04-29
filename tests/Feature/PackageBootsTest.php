<?php

declare(strict_types=1);

use Alexandria\Core\AlexandriaServiceProvider;

it('registers the Alexandria service provider', function () {
    expect(app()->getProvider(AlexandriaServiceProvider::class))
        ->not->toBeNull();
});

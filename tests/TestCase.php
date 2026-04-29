<?php

declare(strict_types=1);

namespace Alexandria\Core\Tests;

use Alexandria\Core\AlexandriaServiceProvider;
use Orchestra\Testbench\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * @return array<int, class-string>
     */
    protected function getPackageProviders($app): array
    {
        return [
            AlexandriaServiceProvider::class,
        ];
    }
}

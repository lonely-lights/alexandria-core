<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI\Prompts\Exceptions;

use RuntimeException;

/**
 * Thrown when the provided context type doesn't match what the template expects.
 *
 * Extends RuntimeException so PHPStorm's PhpUnhandledExceptionInspection
 * treats it as unchecked, matching the convention of every other narrowing
 * exception in core (BatchExecutionException, NoApiKeyAvailableException, etc).
 */
class ContextMismatchException extends RuntimeException {}

<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI\Prompts\Exceptions;

use RuntimeException;

/**
 * Thrown when a prompt template cannot be found.
 *
 * Extends RuntimeException so PHPStorm's PhpUnhandledExceptionInspection
 * treats it as unchecked, matching the convention of every other narrowing
 * exception in core.
 */
class PromptNotFoundException extends RuntimeException {}

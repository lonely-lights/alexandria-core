<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI\Prompts\Exceptions;

use RuntimeException;
use Throwable;

/**
 * Thrown when context data fails validation against its schema.
 *
 * Extends RuntimeException so PHPStorm's PhpUnhandledExceptionInspection
 * treats it as unchecked, matching the convention of every other narrowing
 * exception in core.
 */
class ContextValidationException extends RuntimeException
{
    /**
     * @param  array<string>  $errors  Validation errors
     */
    public function __construct(
        string $message,
        public readonly array $errors = [],
        int $code = 0,
        ?Throwable $previous = null,
    ) {
        parent::__construct($message, $code, $previous);
    }

    /**
     * Get the validation errors.
     *
     * @return array<string>
     */
    public function getErrors(): array
    {
        return $this->errors;
    }
}

<?php

declare(strict_types=1);

namespace Alexandria\Core\Exceptions;

use RuntimeException;

/**
 * Thrown when AiCommandExecutor::executeBatch() fails to commit the surrounding
 * transaction. Wraps the underlying Throwable as $previous so diagnostics are
 * preserved, and narrows the public throws-contract from Throwable down to a
 * specific runtime exception.
 */
class BatchExecutionException extends RuntimeException {}

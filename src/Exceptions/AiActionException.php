<?php

declare(strict_types=1);

namespace Alexandria\Core\Exceptions;

use RuntimeException;

/**
 * Thrown by EntryActionService and NoteActionService when an AI command
 * payload references missing relations, missing models, missing required
 * fields, or otherwise fails an operational check at execution time.
 *
 * Extends RuntimeException so PHPStorm's PhpUnhandledExceptionInspection
 * treats it as unchecked at call sites — these failures bubble up to
 * AiCommandExecutor::executeBatch(), which catches everything inside its
 * transaction and rewraps as BatchExecutionException.
 */
class AiActionException extends RuntimeException {}

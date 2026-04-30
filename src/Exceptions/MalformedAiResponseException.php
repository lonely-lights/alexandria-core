<?php

declare(strict_types=1);

namespace Alexandria\Core\Exceptions;

use RuntimeException;

/**
 * Thrown by AiCommandFactory when the AI response payload is missing the
 * expected commands array, or when an individual command's processing fails
 * for non-validation reasons (e.g. action services throwing a generic
 * Exception). Original failures are preserved as $previous.
 */
class MalformedAiResponseException extends RuntimeException {}

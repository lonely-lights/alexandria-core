<?php

declare(strict_types=1);

namespace Alexandria\Core\Traits;

/**
 * Trait InjectsCommandContext
 *
 * Models using this trait can declare which properties from an AiReviewCommand
 * should be automatically injected as attributes during creation.
 */
trait InjectsCommandContext
{
    /**
     * Defines a mapping of model attributes to AiReviewCommand properties.
     *
     * The key is the attribute name on the model (e.g., 'creator_id').
     * The value is the property name on the AiReviewCommand model (e.g., 'user_id').
     *
     * @return array<string, string>
     */
    public static function getRequiredContextKeys(): array
    {
        return [];
    }
}

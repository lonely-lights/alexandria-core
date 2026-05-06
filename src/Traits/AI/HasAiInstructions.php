<?php

declare(strict_types=1);

namespace Alexandria\Core\Traits\AI;

use Alexandria\Core\Models\System\Blueprint;
use Illuminate\Database\Eloquent\Model;

/**
 * Trait for models that can have AI-specific prompt instructions.
 *
 * Wraps $this->ai_prompt_instructions access with classification-based
 * defaults. On Blueprint, ai_prompt_instructions is shadowed by the
 * HasAiConfiguration accessor, so reads/writes route through the
 * polymorphic ai_configurations table.
 *
 * Note: this trait defines getAiInstructions() with no parameters.
 * On Blueprint, HasAiConfiguration also defines getAiInstructions(string $type).
 * Resolve via PHP trait conflict resolution in the consuming class:
 *   HasAiConfiguration::getAiInstructions insteadof HasAiInstructions;
 *   HasAiInstructions::getAiInstructions as getPromptInstructions;
 *
 * @mixin Model
 */
trait HasAiInstructions
{
    /**
     * Get AI prompt instructions for this entry type.
     */
    public function getAiInstructions(): ?string
    {
        return $this->ai_prompt_instructions;
    }

    /**
     * Set AI prompt instructions for this entry type.
     */
    public function setAiInstructions(?string $instructions): void
    {
        $this->ai_prompt_instructions = $instructions;
    }

    /**
     * Check if this entry type has AI instructions.
     */
    public function hasAiInstructions(): bool
    {
        return ! empty($this->ai_prompt_instructions);
    }

    /**
     * Get default AI instructions based on the entry type classification.
     */
    public function getDefaultAiInstructions(): string
    {
        return match ($this->classification) {
            Blueprint::CLASSIFICATION_STANDARD => 'This is a standard entry type. Focus on creating well-structured entries with clear relationships.',
            Blueprint::CLASSIFICATION_LIST => 'This is a list entry type. Focus on creating items that can be organized and categorized.',
            Blueprint::CLASSIFICATION_RELATIONSHIP => 'This is a relationship entry type. Focus on connecting other entries through meaningful relationships.',
            default => 'Create entries that fit the purpose and structure of this entry type.',
        };
    }

    /**
     * Get effective AI instructions (custom or default).
     *
     * Accesses $this->ai_prompt_instructions directly to avoid collisions with
     * HasAiConfiguration::getAiInstructions(string $type) when both traits are used.
     */
    public function getEffectiveAiInstructions(): string
    {
        return $this->ai_prompt_instructions ?? $this->getDefaultAiInstructions();
    }
}

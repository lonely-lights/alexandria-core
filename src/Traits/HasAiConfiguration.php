<?php

declare(strict_types=1);

namespace Alexandria\Core\Traits;

use Alexandria\Core\Models\AiConfiguration;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\MorphMany;

/**
 * Trait HasAiConfiguration
 *
 * Provides AI configuration functionality to models.
 * This allows any model to have AI instructions and metadata stored separately.
 *
 * Features: Type-based configuration, priority support, backward compatibility accessors
 * Configuration Types: TYPE_BLUEPRINT_INSTRUCTIONS, TYPE_FIELD_INSTRUCTIONS
 *
 * @mixin Model
 */
trait HasAiConfiguration
{
    /**
     * Get all AI configurations for this model.
     */
    public function aiConfigurations(): MorphMany
    {
        return $this->morphMany(AiConfiguration::class, 'configurable');
    }

    /**
     * Get AI configuration by type.
     *
     * @noinspection PhpUndefinedMethodInspection — scopes resolve through MorphMany at runtime
     */
    public function getAiConfiguration(string $type): ?AiConfiguration
    {
        return $this->aiConfigurations()
            ->ofType($type)
            ->active()
            ->byPriority()
            ->first();
    }

    /**
     * Get AI instructions for a specific type.
     */
    public function getAiInstructions(string $type): ?string
    {
        $config = $this->getAiConfiguration($type);

        return $config?->instructions;
    }

    /**
     * Get AI metadata for a specific type.
     */
    public function getAiMetadata(string $type): ?array
    {
        $config = $this->getAiConfiguration($type);

        return $config?->metadata;
    }

    /**
     * Set AI configuration for a specific type.
     */
    public function setAiConfiguration(
        string $type,
        ?string $instructions = null,
        ?array $metadata = null,
        int $priority = 0,
        bool $isActive = true
    ): AiConfiguration {
        // Find existing config or create new one
        $config = $this->getAiConfiguration($type);

        if (! $config) {
            $config = $this->aiConfigurations()->create([
                'type' => $type,
                'instructions' => $instructions,
                'metadata' => $metadata,
                'priority' => $priority,
                'is_active' => $isActive,
            ]);
        } else {
            $config->update([
                'instructions' => $instructions,
                'metadata' => $metadata,
                'priority' => $priority,
                'is_active' => $isActive,
            ]);
        }

        return $config;
    }

    /**
     * Backward compatibility: Get AI prompt instructions (Blueprint legacy method).
     */
    public function getAiPromptInstructionsAttribute(): ?string
    {
        return $this->getAiInstructions(AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS);
    }

    /**
     * Backward compatibility: Set AI prompt instructions (Blueprint legacy method).
     */
    public function setAiPromptInstructionsAttribute(?string $value): void
    {
        $this->setAiConfiguration(
            AiConfiguration::TYPE_BLUEPRINT_INSTRUCTIONS,
            $value
        );
    }

    /**
     * Backward compatibility: Get AI instruction (BlueprintField legacy method).
     */
    public function getAiInstructionAttribute(): ?array
    {
        return $this->getAiMetadata(AiConfiguration::TYPE_FIELD_INSTRUCTIONS);
    }

    /**
     * Backward compatibility: Set AI instruction (BlueprintField legacy method).
     */
    public function setAiInstructionAttribute(?array $value): void
    {
        $this->setAiConfiguration(
            AiConfiguration::TYPE_FIELD_INSTRUCTIONS,
            null,
            $value
        );
    }
}

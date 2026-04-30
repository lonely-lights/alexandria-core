<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI;

use Alexandria\Core\DTO\AiResponseDTO;
use Laravel\Ai\Responses\AgentResponse;
use Laravel\Ai\Responses\StructuredAgentResponse;

/**
 * Bridges Laravel AI SDK's AgentResponse to Alexandria's AiResponseDTO.
 *
 * This adapter allows the existing command pipeline (ProcessAiCommandsJob,
 * AiTransaction logging, etc.) to work with SDK responses without modifying
 * the downstream consumers.
 */
class AgentResponseAdapter
{
    /**
     * Convert an AgentResponse from the Laravel AI SDK into our AiResponseDTO.
     *
     * Cost is calculated from the AiModel pricing table when a matching model
     * is found. Falls back to 0 if no pricing data is available. The model
     * class is resolved through the alexandria.models.ai_model config binding
     * so host apps that swap the model in for a subclass keep the override.
     */
    public static function toDto(AgentResponse $response, string $modelName = 'unknown'): AiResponseDTO
    {
        $usage = $response->usage;
        $inputTokens = $usage->promptTokens;
        $outputTokens = $usage->completionTokens;

        $cacheReadTokens = $usage->cacheReadInputTokens;
        $cacheWriteTokens = $usage->cacheWriteInputTokens;

        // Look up pricing from the configured AiModel binding.
        $cost = 0.0;
        $aiModelClass = config('alexandria.models.ai_model');
        $aiModel = $aiModelClass::where('model_id', $modelName)->first();
        if ($aiModel) {
            $cost = $aiModel->calculateCost($inputTokens, $outputTokens, $cacheWriteTokens, $cacheReadTokens);
        }

        return new AiResponseDTO(
            content: $response->text,
            totalTokens: $inputTokens + $outputTokens,
            cost: $cost,
            modelName: $modelName,
            inputTokens: $inputTokens,
            outputTokens: $outputTokens,
            thinkingTokens: $usage->reasoningTokens,
            cacheReadTokens: $usage->cacheReadInputTokens,
            cacheWriteTokens: $usage->cacheWriteInputTokens,
        );
    }

    /**
     * Extract a structured array from an AgentResponse.
     *
     * Prefers StructuredAgentResponse's parsed data, falls back to parsing
     * the raw text (handling markdown fences and both keyed/bare arrays).
     *
     * @param  string  $key  The top-level key to extract (e.g., 'commands', 'blueprints')
     * @return array<int|string, mixed> The extracted array, or empty if parsing fails
     */
    public static function extractStructuredArray(AgentResponse $response, string $key): array
    {
        // Prefer SDK's parsed structured data
        if ($response instanceof StructuredAgentResponse) {
            $data = $response[$key] ?? [];
            if (is_array($data) && ! empty($data)) {
                return $data;
            }
        }

        // Fall back to parsing raw text
        $rawContent = trim($response->text);

        if (preg_match('/```(?:json)?\s*\n?(.*?)\n?\s*```/s', $rawContent, $matches)) {
            $rawContent = trim($matches[1]);
        }

        $parsed = json_decode($rawContent, true);

        if (is_array($parsed)) {
            return $parsed[$key] ?? $parsed;
        }

        return [];
    }
}

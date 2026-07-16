<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\AI;

use Alexandria\Core\DTO\AiResponseDTO;
use Laravel\Ai\Responses\AgentResponse;
use Laravel\Ai\Responses\StructuredAgentResponse;

/**
 * Bridges laravel/ai's AgentResponse to Alexandria's AiResponseDTO so the command pipeline stays SDK-agnostic.
 */
class AgentResponseAdapter
{
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
            totalTokens: $inputTokens + $outputTokens + $usage->reasoningTokens,
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
            $data = self::coerceArray($response[$key] ?? []);
            if ($data !== []) {
                return $data;
            }
        }

        // Fall back to parsing raw text
        $rawContent = trim($response->text);

        if (preg_match('/```(?:json)?\s*\n?(.*?)\n?\s*```/is', $rawContent, $matches)) {
            $rawContent = trim($matches[1]);
        }

        $parsed = json_decode($rawContent, true);

        if (is_array($parsed)) {
            return self::coerceArray($parsed[$key] ?? $parsed);
        }

        return [];
    }

    /**
     * Coerce a structured-output value to an array. Under long-response
     * pressure the model sometimes DOUBLE-ENCODES the payload — the top-level
     * JSON parses fine but the key's value arrives as a JSON string instead
     * of an array. Decode that inner string; anything else non-array is a
     * parse failure and returns empty (callers decide whether empty is an
     * error — see the level-2 orchestrator's unparseable-response guard).
     */
    private static function coerceArray(mixed $value): array
    {
        if (is_array($value)) {
            return $value;
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                return $decoded;
            }
        }

        return [];
    }
}

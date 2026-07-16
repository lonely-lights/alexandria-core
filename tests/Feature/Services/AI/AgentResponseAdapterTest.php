<?php

declare(strict_types=1);

use Alexandria\Core\DTO\AiResponseDTO;
use Alexandria\Core\Models\AiModel;
use Alexandria\Core\Models\AiProvider;
use Alexandria\Core\Services\AI\AgentResponseAdapter;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Ai\Responses\AgentResponse;
use Laravel\Ai\Responses\Data\Meta;
use Laravel\Ai\Responses\Data\Usage;
use Laravel\Ai\Responses\StructuredAgentResponse;

uses(RefreshDatabase::class);

/**
 * Build a minimal AgentResponse for testing. The SDK constructor takes
 * invocationId, text, Usage, and Meta — all plain promoted properties,
 * so building real instances is cheaper and clearer than mocking.
 */
function makeAgentResponse(
    string $text = 'response text',
    int $promptTokens = 0,
    int $completionTokens = 0,
    int $cacheReadInputTokens = 0,
    int $cacheWriteInputTokens = 0,
    int $reasoningTokens = 0,
    ?string $modelName = null,
): AgentResponse {
    return new AgentResponse(
        invocationId: 'test-invocation-id',
        text: $text,
        usage: new Usage(
            promptTokens: $promptTokens,
            completionTokens: $completionTokens,
            cacheWriteInputTokens: $cacheWriteInputTokens,
            cacheReadInputTokens: $cacheReadInputTokens,
            reasoningTokens: $reasoningTokens,
        ),
        meta: new Meta(model: $modelName),
    );
}

function makeStructuredAgentResponse(array $structured, string $text = ''): StructuredAgentResponse
{
    return new StructuredAgentResponse(
        invocationId: 'test-invocation-id',
        structured: $structured,
        text: $text === '' ? json_encode($structured) : $text,
        usage: new Usage,
        meta: new Meta,
    );
}

// ---------------------------------------------------------------------------
// toDto — token counts + cost
// ---------------------------------------------------------------------------

it('toDto populates content and token counts from the SDK response', function () {
    $response = makeAgentResponse(
        text: 'Hello from the model',
        promptTokens: 100,
        completionTokens: 50,
    );

    $dto = AgentResponseAdapter::toDto($response, 'unknown-model');

    expect($dto)->toBeInstanceOf(AiResponseDTO::class)
        ->and($dto->content)->toBe('Hello from the model')
        ->and($dto->inputTokens)->toBe(100)
        ->and($dto->outputTokens)->toBe(50)
        ->and($dto->totalTokens)->toBe(150)
        ->and($dto->modelName)->toBe('unknown-model');
});

it('toDto returns 0 cost when no AiModel row matches the model name', function () {
    $response = makeAgentResponse(promptTokens: 1000, completionTokens: 500);

    $dto = AgentResponseAdapter::toDto($response, 'no-such-model');

    expect($dto->cost)->toBe(0.0);
});

it('toDto calculates cost from the matching AiModel row', function () {
    $provider = AiProvider::factory()->create();
    $aiModel = AiModel::factory()->forProvider($provider)->create([
        'model_id' => 'gpt-test-1',
        'input_price_per_million' => 3.0,
        'output_price_per_million' => 15.0,
    ]);

    $response = makeAgentResponse(
        promptTokens: 1_000_000,
        completionTokens: 500_000,
    );

    $dto = AgentResponseAdapter::toDto($response, 'gpt-test-1');

    $expectedCost = $aiModel->calculateCost(1_000_000, 500_000);
    expect($dto->cost)->toBe($expectedCost)
        ->and($dto->cost)->toBeGreaterThan(0.0);
});

it('toDto includes reasoning tokens for Gemini-style responses', function () {
    $response = makeAgentResponse(
        promptTokens: 100,
        completionTokens: 50,
        reasoningTokens: 200,
    );

    $dto = AgentResponseAdapter::toDto($response, 'gemini-2.5');

    expect($dto->thinkingTokens)->toBe(200)
        // totalTokens must include reasoning tokens — Gemini bills for them.
        ->and($dto->totalTokens)->toBe(100 + 50 + 200);
});

it('toDto includes cache tokens for Anthropic prompt caching', function () {
    $response = makeAgentResponse(
        promptTokens: 50,
        completionTokens: 25,
        cacheReadInputTokens: 200,
        cacheWriteInputTokens: 100,
    );

    $dto = AgentResponseAdapter::toDto($response, 'claude-test');

    expect($dto->cacheReadTokens)->toBe(200)
        ->and($dto->cacheWriteTokens)->toBe(100);
});

it('calculateCost charges genuine cache writes at write pricing on small prompts', function () {
    // Regression: a 50-token prompt with 30 cache_write tokens (small ratio,
    // 30 < 50) is a legitimate first-write — should bill at 1.25x, NOT
    // misfire the cache-misreport heuristic.
    $provider = AiProvider::factory()->create();
    $aiModel = AiModel::factory()->forProvider($provider)->create([
        'input_price_per_million' => 1_000_000.0, // $1 per token for clean math
        'output_price_per_million' => 0.0,
    ]);

    $cost = $aiModel->calculateCost(
        inputTokens: 50,
        outputTokens: 0,
        cacheWriteTokens: 30,
    );

    // Expected: input(50) + cache_write(30 * 1.25) = 50 + 37.5 = 87.5
    // If the heuristic mis-fires (charges at 0.1x): 50 + 30 * 0.1 = 53.0
    expect($cost)->toBe(87.5);
});

it('calculateCost downgrades to read pricing when cache_write vastly exceeds input tokens', function () {
    // The misreport case: 5 input tokens but 1000 cache_write reported is
    // physically a cache READ that the SDK miscategorized.
    $provider = AiProvider::factory()->create();
    $aiModel = AiModel::factory()->forProvider($provider)->create([
        'input_price_per_million' => 1_000_000.0,
        'output_price_per_million' => 0.0,
    ]);

    $cost = $aiModel->calculateCost(
        inputTokens: 5,
        outputTokens: 0,
        cacheWriteTokens: 1000,
    );

    // 5 < 1000 * 0.1 → misreport branch fires → cache_write priced at 0.1x.
    // Expected: input(5) + cache_write(1000 * 0.1) = 5 + 100 = 105.
    expect($cost)->toBe(105.0);
});

// ---------------------------------------------------------------------------
// extractStructuredArray — preferred + fallback paths
// ---------------------------------------------------------------------------

it('extractStructuredArray prefers StructuredAgentResponse parsed data', function () {
    $response = makeStructuredAgentResponse([
        'blueprints' => ['character', 'event'],
    ]);

    $result = AgentResponseAdapter::extractStructuredArray($response, 'blueprints');

    expect($result)->toBe(['character', 'event']);
});

it('extractStructuredArray falls back to parsing the response text as JSON', function () {
    $response = makeAgentResponse(
        text: '{"commands": [{"action": "x"}]}',
    );

    $result = AgentResponseAdapter::extractStructuredArray($response, 'commands');

    expect($result)->toBe([['action' => 'x']]);
});

it('extractStructuredArray strips markdown code fences from the response text', function () {
    $response = makeAgentResponse(
        text: "```json\n{\"items\": [1, 2, 3]}\n```",
    );

    $result = AgentResponseAdapter::extractStructuredArray($response, 'items');

    expect($result)->toBe([1, 2, 3]);
});

it('extractStructuredArray returns the top-level array when the key is absent', function () {
    $response = makeAgentResponse(text: '[1, 2, 3]');

    $result = AgentResponseAdapter::extractStructuredArray($response, 'whatever');

    expect($result)->toBe([1, 2, 3]);
});

it('extractStructuredArray strips uppercase JSON code fences (case-insensitive)', function () {
    $response = makeAgentResponse(text: "```JSON\n{\"items\": [7, 8, 9]}\n```");

    $result = AgentResponseAdapter::extractStructuredArray($response, 'items');

    expect($result)->toBe([7, 8, 9]);
});

it('extractStructuredArray returns an empty array when the JSON is malformed', function () {
    $response = makeAgentResponse(text: 'not json at all');

    $result = AgentResponseAdapter::extractStructuredArray($response, 'commands');

    expect($result)->toBe([]);
});

it('extractStructuredArray decodes a double-encoded key value in the text fallback', function () {
    // Under long-response pressure the model sometimes JSON-encodes the
    // key's value as a STRING inside otherwise-valid JSON. This previously
    // escaped as a string return → TypeError at the declared array type.
    $inner = json_encode([['note_id' => 1, 'commands' => []]]);
    $response = makeAgentResponse(text: json_encode(['notes' => $inner]));

    $result = AgentResponseAdapter::extractStructuredArray($response, 'notes');

    expect($result)->toBe([['note_id' => 1, 'commands' => []]]);
});

it('extractStructuredArray decodes a double-encoded key value in structured data', function () {
    $inner = json_encode([['note_id' => 2, 'commands' => []]]);
    $response = makeStructuredAgentResponse(['notes' => $inner]);

    $result = AgentResponseAdapter::extractStructuredArray($response, 'notes');

    expect($result)->toBe([['note_id' => 2, 'commands' => []]]);
});

it('extractStructuredArray repairs invalid escapes in a double-encoded key value', function () {
    // Real-world failure shape (Innovation batch 5): the model emitted
    // {"notes": "[ ... \"model_class\": \"Alexandria\\Core\\...\" ... ]"} —
    // after the outer decode the inner string holds single backslashes,
    // which are invalid JSON escapes and killed the inner decode.
    $inner = '[{"note_id": 643, "commands": [{"action_type": "create_entry", "payload": {"model_class": "Alexandria\\Core\\Models\\System\\Entry"}}]}]';
    $response = makeAgentResponse(text: json_encode(['notes' => $inner]));

    $result = AgentResponseAdapter::extractStructuredArray($response, 'notes');

    expect($result)->toHaveCount(1)
        ->and($result[0]['note_id'])->toBe(643)
        ->and($result[0]['commands'][0]['payload']['model_class'])
        ->toBe('Alexandria\Core\Models\System\Entry');
});

it('extractStructuredArray returns empty for an undecodable string key value', function () {
    $response = makeAgentResponse(text: json_encode(['notes' => 'truncated garbage...']));

    $result = AgentResponseAdapter::extractStructuredArray($response, 'notes');

    expect($result)->toBe([]);
});

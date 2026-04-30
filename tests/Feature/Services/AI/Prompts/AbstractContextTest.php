<?php

declare(strict_types=1);

use Alexandria\Core\Services\AI\Prompts\Contexts\AbstractContext;
use Illuminate\Support\Carbon;

/**
 * Concrete subclass that exposes the protected utility helpers so the test
 * suite can exercise them directly without needing a worldbuilding-shaped
 * concrete context. Extracted as a named class (rather than an anonymous
 * class returned from a helper) so PHPStorm narrows the type once instead
 * of flagging every method call as a potentially polymorphic dispatch.
 */
class AbstractContextDouble extends AbstractContext
{
    /**
     * @param  array<string, mixed>  $payload
     */
    public function __construct(private array $payload) {}

    public function getType(): string
    {
        return 'AbstractContextDouble';
    }

    public function getVersion(): string
    {
        return '1.0';
    }

    /**
     * @return array<string, mixed>
     */
    public function toArray(): array
    {
        return $this->payload;
    }

    public function exposeSanitize(?string $value): ?string
    {
        return $this->sanitize($value);
    }

    public function exposeTruncate(?string $value, int $maxLength = 1000): ?string
    {
        return $this->truncate($value, $maxLength);
    }

    public function exposeFormatDate(?Carbon $date): ?string
    {
        return $this->formatDate($date);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    public function replacePayload(array $payload): void
    {
        $this->payload = $payload;
    }
}

function makeAbstractContextDouble(array $payload = ['greeting' => 'hi']): AbstractContextDouble
{
    return new AbstractContextDouble($payload);
}

it('getDescription returns the default value when not overridden', function () {
    expect(makeAbstractContextDouble()->getDescription())
        ->toBe('Context data for AI prompt processing');
});

it('toJson includes the JSON payload keys', function () {
    $json = makeAbstractContextDouble(['name' => 'Andrew', 'age' => 42])->toJson();

    expect($json)->toContain('"name"')
        ->and($json)->toContain('"Andrew"')
        ->and($json)->toContain('"age"')
        ->and($json)->toContain('42');
});

it('jsonSerialize returns the toArray payload', function () {
    $ctx = makeAbstractContextDouble(['k' => 'v']);

    expect($ctx->jsonSerialize())->toBe(['k' => 'v'])
        ->and(json_encode($ctx))->toContain('"k":"v"');
});

it('getMetadata reports type + version + description + an ISO-8601 generated_at', function () {
    $meta = makeAbstractContextDouble()->getMetadata();

    expect($meta['type'])->toBe('AbstractContextDouble')
        ->and($meta['version'])->toBe('1.0')
        ->and($meta['description'])->toBe('Context data for AI prompt processing')
        ->and($meta['generated_at'])->toMatch('/^\d{4}-\d{2}-\d{2}T/');
});

it('getCachedArray memoizes the toArray() result; clearCache forces recomputation', function () {
    $ctx = makeAbstractContextDouble(['initial' => 1]);

    expect($ctx->getCachedArray())->toBe(['initial' => 1]);

    // Mutate underlying payload — cached value should still come back the first time.
    $ctx->replacePayload(['mutated' => 2]);
    expect($ctx->getCachedArray())->toBe(['initial' => 1]);

    // After clearing, the recomputed value reflects the mutation.
    $ctx->clearCache();
    expect($ctx->getCachedArray())->toBe(['mutated' => 2]);
});

it('sanitize strips control characters but preserves null input', function () {
    $ctx = makeAbstractContextDouble();

    expect($ctx->exposeSanitize(null))->toBeNull()
        ->and($ctx->exposeSanitize("hello\x00world\x07!"))->toBe('helloworld!')
        ->and($ctx->exposeSanitize("keep\nnewlines\tand\ttabs"))->toBe("keep\nnewlines\tand\ttabs");
});

it('truncate returns the original below the limit and ellipsis-cuts above it', function () {
    $ctx = makeAbstractContextDouble();

    expect($ctx->exposeTruncate(null))->toBeNull()
        ->and($ctx->exposeTruncate('short', 100))->toBe('short')
        ->and($ctx->exposeTruncate('abcdefghij', 7))->toBe('abcd...'); // 7 - 3 = 4 chars + ellipsis
});

it('formatDate returns an ISO8601 string for Carbon, null for null', function () {
    $ctx = makeAbstractContextDouble();

    $now = Carbon::parse('2025-04-30T12:00:00+00:00');
    expect($ctx->exposeFormatDate(null))->toBeNull()
        ->and($ctx->exposeFormatDate($now))->toBe('2025-04-30T12:00:00+00:00');
});

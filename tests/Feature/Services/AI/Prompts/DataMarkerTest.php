<?php

declare(strict_types=1);

use Alexandria\Core\Services\AI\Prompts\Builders\DataMarker;
use Alexandria\Core\Services\AI\Prompts\Contexts\AbstractContext;

/**
 * Tiny test double — concrete subclass of AbstractContext used to exercise
 * DataMarker without dragging in any host-app concrete contexts.
 */
function makeTestContext(string $type = 'UnitTestContext', string $version = '1.0', array $payload = ['hello' => 'world', 'count' => 3]): AbstractContext
{
    return new class($type, $version, $payload) extends AbstractContext
    {
        public function __construct(
            private readonly string $type,
            private readonly string $version,
            private readonly array $payload,
        ) {}

        public function getType(): string
        {
            return $this->type;
        }

        public function getVersion(): string
        {
            return $this->version;
        }

        public function toArray(): array
        {
            return $this->payload;
        }
    };
}

it('wrap produces a string with BEGIN/END DATA CONTEXT markers and metadata', function () {
    $context = makeTestContext('SampleContext', '2.5', ['k' => 'v']);

    $wrapped = (new DataMarker)->wrap($context);

    expect($wrapped)->toContain('=== BEGIN DATA CONTEXT')
        ->and($wrapped)->toContain('=== END DATA CONTEXT')
        ->and($wrapped)->toContain('Type: SampleContext')
        ->and($wrapped)->toContain('Schema Version: 2.5')
        ->and($wrapped)->toContain('"k": "v"');
});

it('unwrap round-trips the JSON payload from a wrapped block', function () {
    $payload = ['name' => 'Andrew', 'age' => 42, 'tags' => ['a', 'b']];
    $marker = new DataMarker;
    $wrapped = $marker->wrap(makeTestContext('Ctx', '1.0', $payload));

    expect($marker->unwrap($wrapped))->toBe($payload);
});

it('unwrap returns null when the input does not contain a recognizable data block', function () {
    expect((new DataMarker)->unwrap('totally unrelated text'))->toBeNull();
});

it('extractMetadata pulls Type / Schema Version / Generated lines', function () {
    $marker = new DataMarker;
    $wrapped = $marker->wrap(makeTestContext('MetaCtx', '3.1', ['x' => 1]));

    $meta = $marker->extractMetadata($wrapped);

    expect($meta['type'])->toBe('MetaCtx')
        ->and($meta['version'])->toBe('3.1')
        ->and($meta['generated'])->not->toBeNull();
});

it('validate returns valid=true on a freshly-wrapped block', function () {
    $marker = new DataMarker;
    $wrapped = $marker->wrap(makeTestContext());

    $result = $marker->validate($wrapped);

    expect($result['valid'])->toBeTrue()
        ->and($result['errors'])->toBe([]);
});

it('validate flags missing markers, missing metadata, and unparseable JSON', function () {
    $marker = new DataMarker;
    $bad = 'no markers here, no Type:, no Schema Version:';

    $result = $marker->validate($bad);

    expect($result['valid'])->toBeFalse()
        ->and($result['errors'])->not->toBe([]);
});

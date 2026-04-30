<?php

declare(strict_types=1);

use Alexandria\Core\Support\RelationshipKey;
use Alexandria\Core\Support\RelationshipKeyParser;

beforeEach(function () {
    $this->parser = new RelationshipKeyParser;
});

it('parses an outgoing key into a RelationshipKey', function () {
    $key = $this->parser->parse('characters');

    expect($key)->toBeInstanceOf(RelationshipKey::class)
        ->and($key->direction)->toBe('outgoing')
        ->and($key->slug)->toBe('characters')
        ->and($key->filters)->toBe([]);
});

it('parses an incoming key (parent prefix) and strips the prefix from the slug', function () {
    $key = $this->parser->parse('parentScenes');

    expect($key->direction)->toBe('incoming')
        ->and($key->slug)->toBe('scenes');
});

it('snake-cases CamelCase base names', function () {
    $key = $this->parser->parse('parentContainsScene');

    expect($key->direction)->toBe('incoming')
        ->and($key->slug)->toBe('contains_scene');
});

it('parses limit, order, and dir filters from the tail', function () {
    $key = $this->parser->parse('characters;limit=10;order=name;dir=desc');

    expect($key->filters)->toBe([
        'limit' => 10,
        'order' => 'name',
        'dir' => 'desc',
    ]);
});

it('coerces the limit filter to a positive int', function () {
    $key = $this->parser->parse('characters;limit=5');
    expect($key->filters['limit'])->toBe(5)->and($key->filters['limit'])->toBeInt();
});

it('throws when the key is empty', function () {
    $this->parser->parse('');
})->throws(InvalidArgumentException::class);

it('throws when the parent prefix has no base name', function () {
    $this->parser->parse('parent');
})->throws(InvalidArgumentException::class);

it('throws when the limit filter is non-positive', function () {
    $this->parser->parse('characters;limit=0');
})->throws(InvalidArgumentException::class, 'must be a positive integer');

it('throws when the order filter is unsupported', function () {
    $this->parser->parse('characters;order=created_at');
})->throws(InvalidArgumentException::class, 'must be one of [name, priority]');

it('throws when the dir filter is invalid', function () {
    $this->parser->parse('characters;dir=sideways');
})->throws(InvalidArgumentException::class, 'must be asc|desc');

it('builds a stable canonical form including filters', function () {
    $key = $this->parser->parse('parentScenes;order=name;dir=desc;limit=5');

    expect($key->canonical)->toBe('incoming|scenes|order=name&dir=desc&limit=5');
});

it('canonical form has no filters segment when none are supplied', function () {
    $key = $this->parser->parse('characters');
    expect($key->canonical)->toBe('outgoing|characters');
});

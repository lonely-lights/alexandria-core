<?php

declare(strict_types=1);

/*
 * Contract tests for the AgentRegistry — Stage 8g.5 P1 deliverable.
 *
 * The registry is a singleton in-memory catalog that maps dot-namespaced
 * keys to AgentDefinitions. Existing 5 host-app agents (Classifier,
 * Command, Dedup, Integration, NoteTitle) register themselves via
 * service-provider boot(); future packages (alexandria-craft,
 * alexandria-calendar) register their own.
 *
 * This file pins the registry's contract — lookup semantics, immutability
 * of definitions, namespace handling — so we can extend the registry in
 * later phases (P2 onward) without accidentally breaking the basic
 * register/has/get/all surface.
 */

use Alexandria\Core\AI\Registry\AgentDefinition;
use Alexandria\Core\AI\Registry\AgentRegistry;
use Laravel\Ai\Contracts\Agent;

beforeEach(function () {
    // Fresh registry per test so registrations don't bleed across cases.
    $this->registry = new AgentRegistry;
});

function makeAgentDefinition(string $key = 'test.minimal', array $overrides = []): AgentDefinition
{
    return new AgentDefinition(
        key: $key,
        agentClass: $overrides['agentClass'] ?? Agent::class,
        modelTier: $overrides['modelTier'] ?? AgentDefinition::MODEL_TIER_SORTING,
        invocationMode: $overrides['invocationMode'] ?? AgentDefinition::INVOCATION_BACKGROUND,
        suggestsCommands: $overrides['suggestsCommands'] ?? false,
        contextResolverClass: $overrides['contextResolverClass'] ?? null,
        escalationTargetKey: $overrides['escalationTargetKey'] ?? null,
        escalationThreshold: $overrides['escalationThreshold'] ?? null,
        cacheable: $overrides['cacheable'] ?? false,
        description: $overrides['description'] ?? null,
    );
}

it('registers and retrieves an agent by key', function () {
    $definition = makeAgentDefinition('sort.classify.minimal');

    $this->registry->register($definition);

    expect($this->registry->has('sort.classify.minimal'))->toBeTrue()
        ->and($this->registry->get('sort.classify.minimal'))->toBe($definition);
});

it('returns null for an unregistered key via get()', function () {
    expect($this->registry->has('nonexistent.key'))->toBeFalse()
        ->and($this->registry->get('nonexistent.key'))->toBeNull();
});

it('throws an InvalidArgumentException for an unregistered key via getOrFail()', function () {
    $this->registry->getOrFail('nonexistent.key');
})->throws(InvalidArgumentException::class, 'AI agent not registered: nonexistent.key');

it('re-registering the same key overwrites the previous definition', function () {
    $original = makeAgentDefinition('sort.classify', ['description' => 'original']);
    $replacement = makeAgentDefinition('sort.classify', ['description' => 'replacement']);

    $this->registry->register($original);
    $this->registry->register($replacement);

    expect($this->registry->get('sort.classify')->description)->toBe('replacement');
});

it('all() returns every registered definition keyed by their slug', function () {
    $this->registry->register(makeAgentDefinition('sort.classify.minimal'));
    $this->registry->register(makeAgentDefinition('sort.entry.minimal'));
    $this->registry->register(makeAgentDefinition('craft.adverb_review'));

    $all = $this->registry->all();

    expect($all)->toHaveCount(3)
        ->and(array_keys($all))->toEqualCanonicalizing([
            'sort.classify.minimal',
            'sort.entry.minimal',
            'craft.adverb_review',
        ]);
});

it('byTier() filters registered agents by their model tier', function () {
    $this->registry->register(makeAgentDefinition('sort.classify', ['modelTier' => AgentDefinition::MODEL_TIER_SORTING]));
    $this->registry->register(makeAgentDefinition('sort.entry', ['modelTier' => AgentDefinition::MODEL_TIER_SORTING]));
    $this->registry->register(makeAgentDefinition('craft.adverb_review', ['modelTier' => AgentDefinition::MODEL_TIER_WRITING]));
    $this->registry->register(makeAgentDefinition('dedup.entries', ['modelTier' => AgentDefinition::MODEL_TIER_REASONING]));

    expect($this->registry->byTier(AgentDefinition::MODEL_TIER_SORTING))->toHaveCount(2)
        ->and($this->registry->byTier(AgentDefinition::MODEL_TIER_WRITING))->toHaveCount(1)
        ->and($this->registry->byTier(AgentDefinition::MODEL_TIER_REASONING))->toHaveCount(1);
});

it('AgentDefinition.isBackground() reflects the invocation mode', function () {
    $background = makeAgentDefinition('test.bg', ['invocationMode' => AgentDefinition::INVOCATION_BACKGROUND]);
    $inline = makeAgentDefinition('test.inline', ['invocationMode' => AgentDefinition::INVOCATION_INLINE]);

    expect($background->isBackground())->toBeTrue()
        ->and($inline->isBackground())->toBeFalse();
});

it('AgentDefinition.hasEscalation() is true only when both target + threshold are set', function () {
    $noEscalation = makeAgentDefinition('test.noesc');
    $targetOnly = makeAgentDefinition('test.targetonly', ['escalationTargetKey' => 'test.expanded']);
    $thresholdOnly = makeAgentDefinition('test.threshonly', ['escalationThreshold' => 0.7]);
    $fullEscalation = makeAgentDefinition('test.full', [
        'escalationTargetKey' => 'test.expanded',
        'escalationThreshold' => 0.7,
    ]);

    expect($noEscalation->hasEscalation())->toBeFalse()
        ->and($targetOnly->hasEscalation())->toBeFalse()
        ->and($thresholdOnly->hasEscalation())->toBeFalse()
        ->and($fullEscalation->hasEscalation())->toBeTrue();
});

it('is bound as a singleton via AlexandriaServiceProvider', function () {
    $first = app(AgentRegistry::class);
    $second = app(AgentRegistry::class);

    expect($first)->toBe($second);
});

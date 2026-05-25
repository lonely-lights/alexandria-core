<?php

declare(strict_types=1);

namespace Alexandria\Core\AI\Registry;

use InvalidArgumentException;

/**
 * In-memory catalog of AI agents discoverable by key. Bound as a
 * singleton via AlexandriaServiceProvider so packages (core,
 * alexandria-app, future alexandria-craft, alexandria-calendar,
 * etc.) can register their own agents from their service-provider
 * boot() methods.
 *
 * Keys are dot-separated and namespaced per domain to avoid
 * collisions:
 *
 *     sort.classify.minimal     (alexandria-app — Stage 8g.5)
 *     sort.classify.expanded    (alexandria-app — Stage 8g.5 escalation)
 *     sort.entry.minimal        (alexandria-app — Stage 8g.5)
 *     craft.adverb_review       (alexandria-craft — Stage 8g)
 *     calendar.suggest_units    (alexandria-calendar — Stage 8h)
 *
 * Stage 8g.5 P1 ships this registry + the existing 5 agents
 * registered against it. No invocation through the registry yet —
 * P2 onward wires AiInvoker to use it. P1 is purely additive.
 *
 * Mirrors the BrandedMailRegistry pattern shipped in Stage 8e.
 */
class AgentRegistry
{
    /** @var array<string, AgentDefinition> */
    private array $agents = [];

    /**
     * Register an agent definition. Re-registering the same key
     * overwrites — packages should namespace their keys carefully.
     */
    public function register(AgentDefinition $definition): void
    {
        $this->agents[$definition->key] = $definition;
    }

    public function has(string $key): bool
    {
        return isset($this->agents[$key]);
    }

    public function get(string $key): ?AgentDefinition
    {
        return $this->agents[$key] ?? null;
    }

    /**
     * Strict lookup. Throws when the key is not registered — used
     * by the AiInvoker where a missing key is a programmer error.
     */
    public function getOrFail(string $key): AgentDefinition
    {
        if (! isset($this->agents[$key])) {
            throw new InvalidArgumentException(
                "AI agent not registered: $key. Did you forget to call AgentRegistry::register() in a service provider?"
            );
        }

        return $this->agents[$key];
    }

    /** @return array<string, AgentDefinition> */
    public function all(): array
    {
        return $this->agents;
    }

    /**
     * Filter the catalog by model tier. Useful for admin tooling
     * that lists "all sorting agents" / "all writing-craft agents"
     * grouped by their tier.
     *
     * @return array<string, AgentDefinition>
     */
    public function byTier(string $modelTier): array
    {
        return array_filter(
            $this->agents,
            fn (AgentDefinition $def) => $def->modelTier === $modelTier,
        );
    }
}

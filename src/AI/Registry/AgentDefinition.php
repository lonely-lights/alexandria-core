<?php

declare(strict_types=1);

namespace Alexandria\Core\AI\Registry;

use Laravel\Ai\Contracts\Agent;

/**
 * Declarative metadata describing one AI agent registered with
 * AgentRegistry. The registry is the seam between "the host app's
 * pipeline knows how to call this agent" and "a registered agent
 * can be invoked from anywhere by its key" — Stage 8g.5's
 * sort-optimization spec, P1 deliverable.
 *
 * Each agent that should be invokable by key supplies an
 * AgentDefinition via AgentRegistry::register(). The definition
 * carries: the FQN of the Agent implementation, what model tier
 * the agent expects (sorting / reasoning / writing — feeds into
 * the user's UserAiSetting), how it's invoked (inline vs.
 * background job), whether its output lands in ai_review_commands
 * (suggestsCommands = true) or returns inline (false), and the
 * optional escalation contract (a sibling agent to call when
 * this one's confidence is below threshold).
 *
 * contextResolverClass + escalation fields are nullable in P1 —
 * existing agents register with the minimum (key + class + tier +
 * mode + suggestsCommands). P2 onward backfills resolvers as
 * agents start being invoked through the registry. Stage 8g.5
 * P1 is behavior-preserving; nothing actually CALLS the registry
 * to invoke an agent yet, so the resolver isn't load-bearing.
 *
 * Schema reference: alexandria-app/docs/ai/sort-optimization-spec.md
 */
readonly class AgentDefinition
{
    public const string MODEL_TIER_SORTING = 'sorting';

    public const string MODEL_TIER_REASONING = 'reasoning';

    public const string MODEL_TIER_WRITING = 'writing';

    public const string INVOCATION_INLINE = 'inline';

    public const string INVOCATION_BACKGROUND = 'background';

    /**
     * @param  string  $key  Registry key. Namespace by domain to avoid collisions across packages, e.g. "sort.classify.minimal", "craft.adverb_review", "calendar.suggest_units".
     * @param  class-string<Agent>  $agentClass  FQN of the Agent implementation.
     * @param  string  $modelTier  One of MODEL_TIER_*. Selects which provider/model the user's UserAiSetting maps to for this agent.
     * @param  string  $invocationMode  One of INVOCATION_*. Inline = synchronous request/response; background = dispatched as a queued job.
     * @param  bool  $suggestsCommands  true = output lands in ai_review_commands awaiting user approval; false = output returns inline to the caller.
     * @param  class-string<AgentContextResolver>|null  $contextResolverClass  FQN of the resolver that turns a frontend payload into agent constructor args. Nullable in P1; populated as agents migrate.
     * @param  string|null  $escalationTargetKey  When confidence is below threshold, the AiInvoker dispatches this sibling agent.
     * @param  float|null  $escalationThreshold  Confidence floor (0.0-1.0) below which escalation fires. Null = no escalation.
     * @param  bool  $cacheable  Whether the agent's system prompt is stable enough for Anthropic prompt caching. Wired in a future phase.
     * @param  string|null  $description  Short human-readable description for docs / admin tooling.
     */
    public function __construct(
        public string $key,
        public string $agentClass,
        public string $modelTier,
        public string $invocationMode,
        public bool $suggestsCommands,
        public ?string $contextResolverClass = null,
        public ?string $escalationTargetKey = null,
        public ?float $escalationThreshold = null,
        public bool $cacheable = false,
        public ?string $description = null,
    ) {}

    public function isBackground(): bool
    {
        return $this->invocationMode === self::INVOCATION_BACKGROUND;
    }

    public function hasEscalation(): bool
    {
        return $this->escalationTargetKey !== null && $this->escalationThreshold !== null;
    }
}

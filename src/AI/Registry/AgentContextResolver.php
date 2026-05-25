<?php

declare(strict_types=1);

namespace Alexandria\Core\AI\Registry;

use Illuminate\Foundation\Auth\User;

/**
 * Contract for classes that turn a frontend invocation payload into
 * the constructor args an Agent expects. Lives in the registry so
 * the future AiInvoker can call any registered agent without knowing
 * the agent's specific constructor signature.
 *
 * Implementations are typically thin: read IDs from the payload,
 * load the corresponding Eloquent models with authorization checks,
 * return the args array. The AiInvoker uses `...$args` to spread
 * the result into the agent's constructor.
 *
 * Stage 8g.5 P1 defines this interface but doesn't yet enforce it —
 * existing agents register with `contextResolverClass = null`.
 * P2 backfills resolvers as new minimal-tier agents are introduced.
 *
 * Example implementation:
 *
 *     class ClassifierContextResolver implements AgentContextResolver {
 *         public function resolve(array $payload, User $user): array {
 *             $project = Project::findOrFail($payload['project_id']);
 *             $notes = Note::whereIn('id', $payload['note_ids'])->get();
 *             return [$project, $notes];
 *         }
 *     }
 */
interface AgentContextResolver
{
    /**
     * Resolve a frontend payload into the positional constructor
     * args for the target Agent class.
     *
     * @param  array<string, mixed>  $payload  Raw payload from the invocation request.
     * @param  User  $user  The authenticated user driving the invocation.
     * @return array<int, mixed> Positional args to spread into the agent's constructor.
     */
    public function resolve(array $payload, User $user): array;
}

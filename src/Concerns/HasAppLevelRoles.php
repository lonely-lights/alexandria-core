<?php

declare(strict_types=1);

namespace Alexandria\Core\Concerns;

use Illuminate\Database\Eloquent\Collection;
use Spatie\Permission\PermissionRegistrar;

/**
 * Helper methods for assigning + checking application-level roles
 * (Spatie's `team_id IS NULL` rows) without making callers manage the
 * team context flag manually.
 *
 * Project-scoped role calls (`assignRole($role, $project)` etc.) keep
 * working unchanged — Spatie's existing API. This trait only covers
 * the app-level scope.
 *
 * Use alongside Spatie's `HasRoles` on the User model:
 *
 *     use HasRoles, HasAppLevelRoles;
 *
 * Then:
 *
 *     $user->assignAppRole('member');
 *     $user->hasAppRole('owner');
 *     $user->getAppRoleNames();           // collection of slugs
 *     $user->syncAppRoles(['member']);
 *     $user->removeAppRole('unverified');
 */
trait HasAppLevelRoles
{
    /**
     * Assign an application-level role (NULL team_id).
     *
     * @param  string|array<int, string>  $roles  One slug or many.
     */
    public function assignAppRole(string|array $roles): static
    {
        return $this->withAppRoleScope(function () use ($roles): static {
            /** @phpstan-ignore-next-line uses Spatie's HasRoles trait, present on the host model */
            return $this->assignRole($roles);
        });
    }

    /**
     * Replace the user's app-level roles with the given set.
     *
     * @param  array<int, string>  $roles
     */
    public function syncAppRoles(array $roles): static
    {
        return $this->withAppRoleScope(function () use ($roles): static {
            /** @phpstan-ignore-next-line */
            return $this->syncRoles($roles);
        });
    }

    /**
     * Remove an application-level role.
     */
    public function removeAppRole(string $role): static
    {
        return $this->withAppRoleScope(function () use ($role): static {
            /** @phpstan-ignore-next-line */
            return $this->removeRole($role);
        });
    }

    /**
     * Check whether the user holds an application-level role.
     */
    public function hasAppRole(string $role): bool
    {
        return $this->withAppRoleScope(function () use ($role): bool {
            /** @phpstan-ignore-next-line */
            return $this->hasRole($role);
        });
    }

    /**
     * Whether the user holds at least one of the given app-level roles.
     *
     * @param  array<int, string>  $roles
     */
    public function hasAnyAppRole(array $roles): bool
    {
        return $this->withAppRoleScope(function () use ($roles): bool {
            /** @phpstan-ignore-next-line */
            return $this->hasAnyRole($roles);
        });
    }

    /**
     * Slugs of every app-level role the user holds.
     *
     * @return Collection<int, string>
     */
    public function getAppRoleNames(): Collection
    {
        return $this->withAppRoleScope(function (): Collection {
            /** @phpstan-ignore-next-line */
            return $this->getRoleNames();
        });
    }

    /**
     * Run a callback inside the app-level (NULL team) Spatie scope,
     * restoring the previous team context afterward so we don't leak
     * scope to whatever code runs next.
     *
     * @template TResult
     *
     * @param  callable(): TResult  $callback
     * @return TResult
     */
    private function withAppRoleScope(callable $callback): mixed
    {
        $registrar = app(PermissionRegistrar::class);
        $previousTeamId = $registrar->getPermissionsTeamId();

        $registrar->setPermissionsTeamId(null);

        try {
            return $callback();
        } finally {
            $registrar->setPermissionsTeamId($previousTeamId);
        }
    }
}

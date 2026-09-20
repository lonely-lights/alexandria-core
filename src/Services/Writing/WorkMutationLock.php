<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\Writing;

use Alexandria\Core\Models\Writing\Work;
use Closure;
use Illuminate\Support\Facades\DB;

final class WorkMutationLock
{
    /** @param list<int> $workIds */
    public function run(array $workIds, Closure $callback): mixed
    {
        return DB::transaction(function () use ($workIds, $callback): mixed {
            Work::withTrashed()->whereIn('id', array_unique($workIds))->orderBy('id')->lockForUpdate()->get();

            return $callback();
        });
    }
}

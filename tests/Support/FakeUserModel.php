<?php

declare(strict_types=1);

namespace Alexandria\Core\Tests\Support;

use Illuminate\Database\Eloquent\Model;

/**
 * Sentinel Eloquent model used in tests to verify config-driven user
 * resolution per ADR-006. Swap config('alexandria.models.user') to this
 * class and assert the relationship's related-model class reflects the
 * change -- proves models don't hardcode a specific user class.
 *
 * @property int $id
 */
class FakeUserModel extends Model
{
    protected $table = 'users';
}

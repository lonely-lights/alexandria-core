<?php

declare(strict_types=1);

namespace Alexandria\Core\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Singleton instance-wide configuration — Stage 8c.E.1.
 *
 * Always exactly one row (id=1, seeded by the create migration).
 * The static `instance()` method is the only intended access path;
 * controllers + services call `InstanceSettings::instance()` and
 * mutate via `update()`.
 *
 * Adding new instance-wide toggles: extend the migration with the
 * column, add it to $casts + $fillable + the PHPDoc, update the
 * admin Registration page.
 *
 * @property int $id
 * @property bool $open_registration
 * @property bool $users_can_invite
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 */
class InstanceSettings extends Model
{
    protected $table = 'instance_settings';

    protected $fillable = [
        'open_registration',
        'users_can_invite',
    ];

    protected $casts = [
        'open_registration' => 'boolean',
        'users_can_invite' => 'boolean',
    ];

    /**
     * The canonical singleton row. Always id=1 (seeded by the
     * create migration so this never has to firstOrCreate).
     */
    public static function instance(): self
    {
        return self::query()->findOrFail(1);
    }
}

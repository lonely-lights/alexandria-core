<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Writing;

use Alexandria\Core\Database\Factories\Writing\WorkSectionCommentFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Foundation\Auth\User;
use Illuminate\Support\Carbon;

/**
 * One comment anchored to a work section — Stage 11.5.
 *
 * parent_id is reserved for threaded replies but intentionally unused
 * in v1; the relation is wired so the schema is stable for later.
 *
 * @property int $id
 * @property int $work_section_id
 * @property int $user_id
 * @property int|null $parent_id
 * @property string $body
 * @property Carbon|null $resolved_at
 * @property int|null $resolved_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property Carbon|null $deleted_at
 * @property-read WorkSection $section
 * @property-read User $author
 * @property-read User|null $resolver
 * @property-read WorkSectionComment|null $parent
 *
 * @method static WorkSectionCommentFactory factory($count = null, $state = [])
 *
 * @mixin \Eloquent
 */
class WorkSectionComment extends Model
{
    use HasFactory;
    use SoftDeletes;

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'resolved_at' => 'datetime',
        ];
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(WorkSection::class, 'work_section_id');
    }

    public function author(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'user_id');
    }

    public function resolver(): BelongsTo
    {
        return $this->belongsTo(config('alexandria.models.user'), 'resolved_by');
    }

    public function parent(): BelongsTo
    {
        return $this->belongsTo(self::class, 'parent_id');
    }

    protected static function newFactory(): WorkSectionCommentFactory
    {
        return WorkSectionCommentFactory::new();
    }
}

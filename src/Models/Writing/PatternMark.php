<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Writing;

use Alexandria\Core\Database\Factories\Writing\PatternMarkFactory;
use Eloquent;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Support\Carbon;

/**
 * One pinned moment of a pattern thread — Task 1.
 *
 * Marks are always anchored to a WorkSection (backbone), with optional
 * prose-span refinement via anchor_text and anchor_offset_hint. The
 * role (setup / develop / payoff) determines how the mark functions in
 * the thread's lifecycle.
 *
 * @property int $id
 * @property int $pattern_thread_id
 * @property string $role
 * @property int $work_section_id
 * @property string|null $anchor_text
 * @property int|null $anchor_offset_hint
 * @property string|null $note
 * @property int $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read PatternThread $thread
 * @property-read WorkSection $section
 * @property-read Authenticatable $creator
 *
 * @mixin Eloquent
 */
class PatternMark extends Model
{
    use HasFactory;

    protected $guarded = ['id'];

    protected static function newFactory(): PatternMarkFactory
    {
        return PatternMarkFactory::new();
    }

    public function thread(): BelongsTo
    {
        return $this->belongsTo(PatternThread::class, 'pattern_thread_id');
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(WorkSection::class, 'work_section_id');
    }

    public function creator(): BelongsTo
    {
        return $this->belongsTo(
            config('auth.providers.users.model', Authenticatable::class),
            'created_by',
        );
    }
}

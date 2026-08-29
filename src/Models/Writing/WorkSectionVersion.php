<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Writing;

use Eloquent;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * One snapshot of a work section's creative state — Stage 9.
 *
 * A version captures the ENTIRE creative state payload (title, content, synopsis,
 * beats, beat_type, goal, conflict, stakes, mood, tone) at a moment in time.
 * Versions are either linked to a deliberate revision (revision_id set) or part
 * of the safety buffer (revision_id null, auto-pruned beyond 5 per section).
 *
 * @property int $id
 * @property int $work_section_id
 * @property int|null $work_revision_id
 * @property array $payload
 * @property int $word_count
 * @property Carbon|null $created_at
 * @property-read WorkSection $section
 * @property-read WorkRevision|null $revision
 *
 * @mixin Eloquent
 */
class WorkSectionVersion extends Model
{
    const null UPDATED_AT = null;

    protected $guarded = ['id'];

    /** @return array<string, string> */
    protected function casts(): array
    {
        return [
            'payload' => 'array',
        ];
    }

    public function section(): BelongsTo
    {
        return $this->belongsTo(WorkSection::class, 'work_section_id');
    }

    public function revision(): BelongsTo
    {
        return $this->belongsTo(WorkRevision::class, 'work_revision_id');
    }
}

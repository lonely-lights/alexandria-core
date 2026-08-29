<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Writing;

use Illuminate\Database\Eloquent\Collection;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Carbon;

/**
 * One deliberate revision snapshot of a work or section — Stage 9.
 *
 * A revision captures the complete creative state of one or more leaf sections
 * at the moment of marking. The scope_section_id determines the capture breadth:
 * null = entire work, a leaf = just that section, a container = all descendants.
 * number is a per-scope counter scoped to (work_id, scope_section_id).
 *
 * @property int $id
 * @property int $work_id
 * @property int|null $scope_section_id
 * @property int $number
 * @property string|null $label
 * @property string $cause
 * @property int $created_by
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read Work $work
 * @property-read WorkSection|null $scopeSection
 * @property-read Collection<int, WorkSectionVersion> $versions
 *
 * @mixin \Eloquent
 */
class WorkRevision extends Model
{
    protected $guarded = ['id'];

    public function work(): BelongsTo
    {
        return $this->belongsTo(Work::class);
    }

    public function scopeSection(): BelongsTo
    {
        return $this->belongsTo(WorkSection::class, 'scope_section_id');
    }

    public function versions(): HasMany
    {
        return $this->hasMany(WorkSectionVersion::class);
    }
}

<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Writing;

use Alexandria\Core\Models\System\Entry;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Section appearance tracking. Mention, POV, and setting rows are
 * derived from content and reference fields; linked rows are explicit
 * associations and survive content rebuilds.
 *
 * @property int $id
 * @property int $work_section_id
 * @property int $entry_id
 * @property string $source
 * @property int $mention_count
 * @property Carbon|null $created_at
 * @property Carbon|null $updated_at
 * @property-read WorkSection $section
 * @property-read Entry $entry
 */
class WorkSectionEntryMention extends Model
{
    public const string SOURCE_MENTION = 'mention';

    public const string SOURCE_POV = 'pov';

    public const string SOURCE_SETTING = 'setting';

    public const string SOURCE_LINKED = 'linked';

    protected $guarded = ['id'];

    public function section(): BelongsTo
    {
        return $this->belongsTo(WorkSection::class, 'work_section_id');
    }

    public function entry(): BelongsTo
    {
        return $this->belongsTo(Entry::class);
    }
}

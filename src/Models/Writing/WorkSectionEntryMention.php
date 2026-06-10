<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Writing;

use Alexandria\Core\Models\System\Entry;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * Derived appearance-tracking row — Stage 8g.1. Rebuilt from section
 * content + reference fields on every save (never incremental), so
 * it can never drift from the prose. Sources: mention | pov | setting.
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

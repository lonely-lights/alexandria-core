<?php

declare(strict_types=1);

namespace Alexandria\Core\Models\Notable;

use Illuminate\Database\Eloquent\Relations\MorphPivot;
use Illuminate\Support\Carbon;

/**
 * Custom pivot for the polymorphic `notables` table joining notes to their
 * subjects (Project, Blueprint, Entry, etc.). Declares pivot column types so
 * IDE static analysis can resolve `$note->pivot->processing_status` and
 * `$note->pivot->processed_at` without falling back to magic-property access.
 *
 * @property int $note_id
 * @property string $notable_type
 * @property int|null $notable_id
 * @property string $processing_status
 * @property Carbon|null $processed_at
 */
class NotablePivot extends MorphPivot
{
    protected $casts = [
        'processed_at' => 'datetime',
    ];
}

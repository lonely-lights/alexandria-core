<?php

declare(strict_types=1);

namespace Alexandria\Core\Models;

use Alexandria\Core\Database\Factories\EmailOverrideFactory;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Carbon;

/**
 * Admin-edited override of a branded Mailable's lang string.
 *
 * Keyed by (mail_slug, lang_key, locale). The mail_slug matches the
 * key registered with BrandedMailRegistry (verify, reset, etc.); the
 * lang_key is one of the editableLangKeys declared in that mail's
 * BrandedMailDefinition.
 *
 * Looked up by BrandedTextResolver during email rendering — DB row
 * present → use override; absent → fall back to the file lang via
 * __('alexandria::emails.{mail_slug}.{lang_key}').
 *
 * @property int $id
 * @property string $mail_slug
 * @property string $lang_key
 * @property string $locale
 * @property string $content
 * @property int|null $updated_by users.id (no FK per ADR-006)
 * @property Carbon $created_at
 * @property Carbon $updated_at
 *
 * @method static Builder<static> forMail(string $slug, ?string $locale = null)
 */
class EmailOverride extends Model
{
    /** @use HasFactory<EmailOverrideFactory> */
    use HasFactory;

    protected $fillable = [
        'mail_slug',
        'lang_key',
        'locale',
        'content',
        'updated_by',
    ];

    protected $attributes = [
        'locale' => 'en',
    ];

    protected static function newFactory(): EmailOverrideFactory
    {
        return EmailOverrideFactory::new();
    }

    public function scopeForMail(Builder $query, string $slug, ?string $locale = null): Builder
    {
        $query->where('mail_slug', $slug);

        if ($locale !== null) {
            $query->where('locale', $locale);
        }

        return $query;
    }
}

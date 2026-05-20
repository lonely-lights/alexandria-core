<?php

declare(strict_types=1);

namespace Alexandria\Core\Mail;

use Alexandria\Core\Models\EmailOverride;
use Illuminate\Support\Facades\App;

/**
 * Resolves a branded-mail lang string with DB overrides taking
 * precedence over file lang.
 *
 * Lookup order:
 *   1. email_overrides table — matching (mail_slug, lang_key, locale)
 *   2. file lang — __('alexandria::emails.{mail_slug}.{lang_key}', $args, $locale)
 *
 * Used by:
 *   - Mailable envelope() methods to resolve subject lines
 *   - @brandedString Blade directive inside the email views
 *   - The admin email panel preview endpoint (to show resolved content)
 */
class BrandedTextResolver
{
    /**
     * Resolve from a compound "slug.key" — the form used by the
     *
     * @brandedString Blade directive. Splits on the first dot only,
     * so a langKey containing dots still works.
     *
     * @param  array<string, mixed>  $replace
     */
    public function getFromCompound(string $compoundKey, array $replace = [], ?string $locale = null): string
    {
        [$slug, $key] = explode('.', $compoundKey, 2);

        return $this->get($slug, $key, $replace, $locale);
    }

    /**
     * @param  array<string, mixed>  $replace  Interpolation args, e.g. ['name' => 'Jane', 'minutes' => 60]
     */
    public function get(string $slug, string $key, array $replace = [], ?string $locale = null): string
    {
        $locale ??= App::getLocale();

        $override = EmailOverride::query()
            ->where('mail_slug', $slug)
            ->where('lang_key', $key)
            ->where('locale', $locale)
            ->value('content');

        if ($override !== null) {
            return $this->interpolate($override, $replace);
        }

        $fileLangKey = "alexandria::emails.$slug.$key";

        return __($fileLangKey, $replace, $locale);
    }

    /**
     * Replace :placeholder tokens in the override content. Matches
     * Laravel's lang interpolation conventions (case-sensitive by default;
     * :Name → "Jane", :NAME → "JANE" — Laravel handles those automatically
     * for file-backed lang, but DB overrides need to do it themselves).
     *
     * @param  array<string, mixed>  $replace
     */
    private function interpolate(string $content, array $replace): string
    {
        foreach ($replace as $key => $value) {
            $value = (string) $value;
            $content = str_replace(":$key", $value, $content);
            $content = str_replace(':'.ucfirst($key), ucfirst($value), $content);
            $content = str_replace(':'.strtoupper($key), strtoupper($value), $content);
        }

        return $content;
    }
}

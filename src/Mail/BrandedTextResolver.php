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
 *   1. Per-request DRAFT overlay (admin preview endpoint sets this
 *      via setDrafts() so unsaved edits render in the iframe)
 *   2. email_overrides table — matching (mail_slug, lang_key, locale)
 *   3. file lang — __('alexandria::emails.{mail_slug}.{lang_key}', $args, $locale)
 *
 * Used by:
 *   - Mailable envelope() methods to resolve subject lines
 *   - @brandedString Blade directive inside the email views
 *   - The admin email panel preview endpoint (to show resolved content)
 *
 * Bound as a per-request singleton so setDrafts() state lives for
 * exactly one request — clean for the preview-render flow + isolated
 * between tests (each test boots a fresh app instance).
 */
class BrandedTextResolver
{
    /**
     * Working-draft overlay scoped to a single mail slug. Set by the
     * admin preview endpoint before render; resolves before the DB
     * override and file lang. Null = no overlay active.
     */
    private ?string $draftSlug = null;

    /** @var array<string, string>|null */
    private ?array $drafts = null;

    /**
     * Apply an unsaved-draft overlay for the given mail slug. Pass
     * null/empty to clear. Called by AdminEmailController::preview().
     *
     * @param  array<string, string>  $drafts  Map of lang_key → content
     */
    public function setDrafts(string $slug, array $drafts): void
    {
        $this->draftSlug = $slug;
        $this->drafts = $drafts;
    }

    public function clearDrafts(): void
    {
        $this->draftSlug = null;
        $this->drafts = null;
    }

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

        if ($this->draftSlug === $slug && $this->drafts !== null && isset($this->drafts[$key])) {
            return $this->interpolate($this->drafts[$key], $replace);
        }

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

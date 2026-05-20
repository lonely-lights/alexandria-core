<?php

declare(strict_types=1);

namespace Alexandria\Core\Mail;

use Closure;
use Illuminate\Contracts\Mail\Mailable;

/**
 * Metadata describing one branded Mailable for the admin email panel.
 *
 * Each Mailable that should appear in the admin catalog supplies a
 * BrandedMailDefinition via BrandedMailRegistry::register(). The
 * definition carries the human-readable title + description that the
 * admin sees, plus a `previewFactory` closure that returns a
 * Mailable instance with safe sample data (no real user / token /
 * URL signing required).
 *
 * `editableLangKeys` is the allow-list of lang strings the admin
 * panel exposes for content editing — keeps the override surface
 * intentional rather than letting admins edit arbitrary keys.
 */
readonly class BrandedMailDefinition
{
    /**
     * @param  class-string<Mailable>  $class  FQN of the Mailable class
     * @param  string  $title  Human-readable name shown in the admin catalog
     * @param  string  $description  What triggers this email + what it does
     * @param  Closure(): Mailable  $previewFactory  Returns a preview-safe Mailable instance
     * @param  string  $langGroup  Lang namespace prefix (e.g. "alexandria::emails.verify")
     * @param  list<string>  $editableLangKeys  Lang keys admins can override (subject, intro, etc.)
     * @param  string|null  $icon  Optional Font Awesome icon name for the catalog card
     */
    public function __construct(
        public string $class,
        public string $title,
        public string $description,
        public Closure $previewFactory,
        public string $langGroup,
        public array $editableLangKeys,
        public ?string $icon = null,
    ) {}

    public function preview(): Mailable
    {
        return ($this->previewFactory)();
    }
}

<?php

declare(strict_types=1);

namespace Alexandria\Core\Traits;

use Illuminate\Database\Eloquent\Model;

/**
 * Keeps stored prose on a single line-ending convention (LF).
 *
 * Browser textareas submit CRLF while scripted writes and imports use LF, so
 * a field edited by both ends up mixed. The renderers already normalize on
 * read — see ContentRendererService — so this never changed what a reader
 * saw, but it makes stored prose unsafe to pattern-match: a script anchoring
 * on "\n== Heading ==" silently misses the CRLF half of the corpus.
 *
 * Normalizing on save removes the mixing at the source. Raw query-builder
 * writes bypass Eloquent events and are not covered; operator scripts that
 * touch prose directly should normalize themselves.
 */
trait NormalizesLineEndings
{
    public static function bootNormalizesLineEndings(): void
    {
        static::saving(function (Model $model): void {
            foreach ($model->lineEndingFields() as $field) {
                $value = $model->getAttribute($field);

                if (! is_string($value) || ! str_contains($value, "\r")) {
                    continue;
                }

                $model->setAttribute($field, str_replace(["\r\n", "\r"], "\n", $value));
            }
        });
    }

    /**
     * Prose fields to normalize. Override per model.
     *
     * @return array<int, string>
     */
    public function lineEndingFields(): array
    {
        return ['content'];
    }
}

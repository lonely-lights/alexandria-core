<?php

declare(strict_types=1);

namespace Alexandria\Core\Services\Registration;

use Alexandria\Core\Models\InviteToken;
use DateTimeInterface;
use Illuminate\Support\Facades\DB;
use InvalidArgumentException;
use Random\RandomException;
use RuntimeException;
use Throwable;

/**
 * Invite-token lifecycle — Stage 8c.E.4.
 *
 * Three operations:
 *   - generate(): mint a new token with the standard code format.
 *   - validateCode(): is this code usable right now? (read-only)
 *   - consume(): atomically reserve a use of the token (transaction
 *     + row lock so concurrent /register POSTs can't double-spend
 *     the final use of a single-use code).
 *
 * Code alphabet excludes 0/O/1/I/l for typing fidelity. 12 chars
 * = ~5.16×10^17 combinations from a 30-char alphabet.
 */
class InviteTokenService
{
    private const string CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

    private const int CODE_LENGTH = 12;

    /**
     * Mint a new token. `created_by` should be the admin user
     * generating it; null is allowed for system-generated tokens
     * (seeders, CLI commands).
     *
     * @throws RandomException
     */
    public function generate(
        int $maxUses = 1,
        ?DateTimeInterface $expiresAt = null,
        ?string $notes = null,
        ?int $createdBy = null,
    ): InviteToken {
        return InviteToken::create([
            'code' => $this->mintUniqueCode(),
            'max_uses' => $maxUses,
            'uses_count' => 0,
            'expires_at' => $expiresAt,
            'notes' => $notes,
            'created_by' => $createdBy,
        ]);
    }

    /**
     * Read-only validation — does this code resolve to a usable
     * token right now? Used by the /register page to surface
     * "invalid token" feedback before the user submits.
     */
    public function validateCode(string $code): bool
    {
        $token = InviteToken::query()->where('code', $code)->first();

        return $token !== null && $token->isUsable();
    }

    /**
     * Atomically consume a use of the token. Throws if the code
     * is unknown, expired, or exhausted. Row-level lock prevents
     * a race where two simultaneous registrations both pass the
     * uses_count check before either has incremented.
     *
     * @throws InvalidArgumentException when code is unknown/expired/exhausted
     * @throws Throwable on DB transaction failure
     */
    public function consume(string $code): InviteToken
    {
        return DB::transaction(function () use ($code) {
            $token = InviteToken::query()
                ->where('code', $code)
                ->lockForUpdate()
                ->first();

            if ($token === null) {
                throw new InvalidArgumentException(__('alexandria::auth.invite_token.unknown'));
            }

            if ($token->isExpired()) {
                throw new InvalidArgumentException(__('alexandria::auth.invite_token.expired'));
            }

            if ($token->isExhausted()) {
                throw new InvalidArgumentException(__('alexandria::auth.invite_token.exhausted'));
            }

            // lockForUpdate above + the surrounding transaction give us
            // the same atomic semantics as $token->increment() without
            // tripping PhpStorm's "protected member via __call" warning
            // on Eloquent's magic-routed methods.
            $token->update(['uses_count' => $token->uses_count + 1]);

            return $token->refresh();
        });
    }

    /**
     * Generate a unique code, retrying on the vanishingly-rare
     * collision (~1 in 5×10^17 per attempt). 5 retries before
     * giving up — at that point something is structurally wrong.
     *
     * @throws RandomException
     */
    protected function mintUniqueCode(): string
    {
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $code = $this->randomCode();
            if (! InviteToken::query()->where('code', $code)->exists()) {
                return $code;
            }
        }

        throw new RuntimeException('Failed to mint a unique invite token after 5 attempts.');
    }

    /**
     * @throws RandomException
     */
    protected function randomCode(): string
    {
        $alphabet = self::CODE_ALPHABET;
        $code = '';
        for ($i = 0; $i < self::CODE_LENGTH; $i++) {
            $code .= $alphabet[random_int(0, strlen($alphabet) - 1)];
        }

        return $code;
    }
}

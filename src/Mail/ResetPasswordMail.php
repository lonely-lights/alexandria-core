<?php

declare(strict_types=1);

namespace Alexandria\Core\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Container\EntryNotFoundException;
use Illuminate\Contracts\Auth\CanResetPassword;
use Illuminate\Contracts\Container\CircularDependencyException;
use Illuminate\Contracts\Mail\Mailable as MailableContract;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Config;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;

/**
 * Branded password-reset mail. Queued for the same reason as
 * VerifyEmailMail — mail-transport failures shouldn't crash the
 * "forgot password" request lifecycle.
 *
 * Name greeting is passed explicitly (rather than read off the user)
 * because CanResetPassword doesn't expose a display name and we want
 * to keep the Mailable contract-driven, not concrete-model-driven.
 *
 * Explicit `implements MailableContract` is redundant at runtime but
 * lets static analysis match the contract directly. See VerifyEmailMail.
 */
class ResetPasswordMail extends Mailable implements MailableContract, ShouldQueue
{
    use Queueable, SerializesModels;

    public string $resetUrl;

    public int $expiryMinutes;

    public function __construct(
        public CanResetPassword $user,
        public string $token,
        public string $displayName,
    ) {
        $this->expiryMinutes = (int) Config::get('auth.passwords.users.expire', 60);

        $this->resetUrl = url(route('password.reset', [
            'token' => $token,
            'email' => $user->getEmailForPasswordReset(),
        ], false));
    }

    /**
     * @throws CircularDependencyException
     * @throws NotFoundExceptionInterface
     * @throws EntryNotFoundException
     * @throws ContainerExceptionInterface
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: app(BrandedTextResolver::class)->get('reset', 'subject'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'alexandria::emails.reset',
        );
    }

    /**
     * Build a preview-safe instance for the admin email panel.
     *
     * CanResetPassword is a much smaller contract than the verify
     * intersection — only two methods, so the stub stays terse.
     */
    public static function preview(): self
    {
        // PHPDoc cast for consistency with VerifyEmailMail::preview() —
        // narrows the anonymous-class type so static analysis doesn't
        // flag the constructor call.
        /** @var CanResetPassword $stub */
        $stub = new class implements CanResetPassword
        {
            public function getEmailForPasswordReset(): string
            {
                return 'preview@alexandria.test';
            }

            public function sendPasswordResetNotification($token): void {}
        };

        return new self($stub, 'sample-token-abc123xyz', 'Preview User');
    }
}

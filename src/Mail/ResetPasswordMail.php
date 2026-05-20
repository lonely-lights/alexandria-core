<?php

declare(strict_types=1);

namespace Alexandria\Core\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Auth\CanResetPassword;
use Illuminate\Contracts\Mail\Mailable as MailableContract;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Config;

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

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('alexandria::emails.reset.subject'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'alexandria::emails.reset',
        );
    }
}

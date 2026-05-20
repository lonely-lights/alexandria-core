<?php

declare(strict_types=1);

namespace Alexandria\Core\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Mail\Mailable as MailableContract;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;

/**
 * Branded email-verification mail. Queued so a misconfigured mail
 * transport can't 500 the registration request — failures retry on
 * the worker with backoff.
 *
 * The explicit `implements MailableContract` is redundant at runtime
 * (the parent `Illuminate\Mail\Mailable` already implements it) but
 * tells static analysis directly so IDEs don't flag `Mail::send($this)`
 * as a type mismatch through the two-level inheritance chain.
 */
class VerifyEmailMail extends Mailable implements MailableContract, ShouldQueue
{
    use Queueable, SerializesModels;

    public string $verificationUrl;

    public int $expiryMinutes;

    public function __construct(public Authenticatable&MustVerifyEmail $user)
    {
        $this->expiryMinutes = (int) Config::get('auth.verification.expire', 60);

        $this->verificationUrl = URL::temporarySignedRoute(
            'verification.verify',
            Carbon::now()->addMinutes($this->expiryMinutes),
            [
                'id' => $user->getAuthIdentifier(),
                'hash' => sha1($user->getEmailForVerification()),
            ],
        );
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: __('alexandria::emails.verify.subject'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'alexandria::emails.verify',
        );
    }
}

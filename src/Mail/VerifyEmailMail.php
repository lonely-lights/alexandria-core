<?php

declare(strict_types=1);

namespace Alexandria\Core\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Container\EntryNotFoundException;
use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Contracts\Container\CircularDependencyException;
use Illuminate\Contracts\Mail\Mailable as MailableContract;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\URL;
use Psr\Container\ContainerExceptionInterface;
use Psr\Container\NotFoundExceptionInterface;

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

    /**
     * @throws CircularDependencyException
     * @throws NotFoundExceptionInterface
     * @throws EntryNotFoundException
     * @throws ContainerExceptionInterface
     */
    public function envelope(): Envelope
    {
        return new Envelope(
            subject: app(BrandedTextResolver::class)->get('verify', 'subject'),
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'alexandria::emails.verify',
        );
    }

    /**
     * Build a preview-safe instance for the admin email panel.
     *
     * Uses an anonymous class satisfying the Authenticatable +
     * MustVerifyEmail intersection so we can render the email without
     * touching the DB or signing a real verification URL. The URL the
     * preview generates is still a valid signed temp-route (it just
     * points at fake id=1 / fake hash), so the iframe renders the same
     * shape an admin would see in production.
     */
    public static function preview(): self
    {
        // PHPDoc cast — PhpStorm infers anonymous-class multi-interface
        // implementations as a union, not the intersection the constructor
        // requires. The cast tells static analysis the actual shape.
        /** @var Authenticatable&MustVerifyEmail $stub */
        $stub = new class implements Authenticatable, MustVerifyEmail
        {
            public function getAuthIdentifier(): int
            {
                return 1;
            }

            public function getAuthIdentifierName(): string
            {
                return 'id';
            }

            public function getAuthPassword(): string
            {
                return '';
            }

            public function getAuthPasswordName(): string
            {
                return 'password';
            }

            public function getRememberToken(): string
            {
                return '';
            }

            public function setRememberToken($value): void {}

            public function getRememberTokenName(): string
            {
                return 'remember_token';
            }

            public function hasVerifiedEmail(): bool
            {
                return false;
            }

            public function markEmailAsVerified(): bool
            {
                return true;
            }

            public function markEmailAsUnverified(): bool
            {
                return true;
            }

            public function sendEmailVerificationNotification(): void {}

            public function getEmailForVerification(): string
            {
                return 'preview@alexandria.test';
            }
        };

        return new self($stub);
    }
}

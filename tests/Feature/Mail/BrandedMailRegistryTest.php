<?php

declare(strict_types=1);

use Alexandria\Core\Mail\BrandedMailDefinition;
use Alexandria\Core\Mail\BrandedMailRegistry;
use Alexandria\Core\Mail\ResetPasswordMail;
use Alexandria\Core\Mail\VerifyEmailMail;
use Illuminate\Support\Facades\Route;

// The Mailables build their action URLs against Fortify's named routes
// at render time. Fortify isn't booted in core's Testbench app, so we
// stub the routes here for any test that calls ->render().
beforeEach(function () {
    Route::get('/email/verify/{id}/{hash}', fn () => 'ok')->name('verification.verify');
    Route::get('/password/reset/{token}', fn () => 'ok')->name('password.reset');
});

it('registers and retrieves a Mailable by slug', function () {
    $registry = new BrandedMailRegistry;

    $definition = new BrandedMailDefinition(
        class: VerifyEmailMail::class,
        title: 'Verify Email',
        description: 'Registration confirmation.',
        previewFactory: fn () => VerifyEmailMail::preview(),
        langGroup: 'alexandria::emails.verify',
        editableLangKeys: ['subject', 'intro'],
        icon: 'envelope',
    );

    $registry->register('verify', $definition);

    expect($registry->has('verify'))->toBeTrue()
        ->and($registry->get('verify'))->toBe($definition)
        ->and($registry->all())->toHaveKey('verify');
});

it('returns null for an unknown slug', function () {
    $registry = new BrandedMailRegistry;
    expect($registry->get('nope'))->toBeNull()
        ->and($registry->has('nope'))->toBeFalse();
});

it('overwrites a previous registration with the same slug', function () {
    $registry = new BrandedMailRegistry;

    $first = new BrandedMailDefinition(
        class: VerifyEmailMail::class, title: 'First', description: '',
        previewFactory: fn () => VerifyEmailMail::preview(),
        langGroup: 'a', editableLangKeys: [],
    );
    $second = new BrandedMailDefinition(
        class: VerifyEmailMail::class, title: 'Second', description: '',
        previewFactory: fn () => VerifyEmailMail::preview(),
        langGroup: 'b', editableLangKeys: [],
    );

    $registry->register('verify', $first);
    $registry->register('verify', $second);

    expect($registry->get('verify')->title)->toBe('Second')
        ->and($registry->all())->toHaveCount(1);
});

it('binds the registry as a singleton in the service container', function () {
    $a = app(BrandedMailRegistry::class);
    $b = app(BrandedMailRegistry::class);

    expect($a)->toBe($b);
});

it('AlexandriaServiceProvider registers the verify + reset Mailables on boot', function () {
    $registry = app(BrandedMailRegistry::class);

    expect($registry->has('verify'))->toBeTrue()
        ->and($registry->has('reset'))->toBeTrue();

    $verify = $registry->get('verify');
    expect($verify->class)->toBe(VerifyEmailMail::class)
        ->and($verify->editableLangKeys)->toContain('subject', 'intro', 'action');

    $reset = $registry->get('reset');
    expect($reset->class)->toBe(ResetPasswordMail::class);
});

it('VerifyEmailMail::preview() returns a renderable instance with stub user data', function () {
    $mail = VerifyEmailMail::preview();
    $html = $mail->render();

    expect($html)->toContain('Alexandria')
        ->and($html)->toContain('Verify Email Address');
});

it('ResetPasswordMail::preview() returns a renderable instance with stub data', function () {
    $mail = ResetPasswordMail::preview();
    $html = $mail->render();

    expect($html)->toContain('Alexandria')
        ->and($html)->toContain('Reset Password')
        ->and($html)->toContain('Preview User');
});

it('preview factory closures on definitions return Mailable instances', function () {
    $registry = app(BrandedMailRegistry::class);

    $verifyMail = $registry->get('verify')->preview();
    $resetMail = $registry->get('reset')->preview();

    expect($verifyMail)->toBeInstanceOf(VerifyEmailMail::class)
        ->and($resetMail)->toBeInstanceOf(ResetPasswordMail::class);
});

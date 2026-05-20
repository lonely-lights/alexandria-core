<?php

declare(strict_types=1);

return [
    'layout' => [
        'footer' => 'Alexandria — a wordbench for writers.',
        'copyright' => '© :year Lonely Lights Ltd. All rights reserved.',
    ],

    'verify' => [
        'subject' => 'Verify your email address',
        'greeting' => 'Welcome to Alexandria,',
        'intro' => 'Confirm your email address to finish setting up your account and unlock the full library.',
        'action' => 'Verify Email Address',
        'fallback' => 'If you did not create an account, no further action is required.',
        'expiry_note' => 'This verification link will expire in :minutes minutes.',
    ],

    'reset' => [
        'subject' => 'Reset your password',
        'greeting' => 'Hi :name,',
        'intro' => 'You are receiving this email because we received a password reset request for your account.',
        'action' => 'Reset Password',
        'fallback' => 'If you did not request a password reset, no further action is required.',
        'expiry_note' => 'This password reset link will expire in :minutes minutes.',
    ],
];

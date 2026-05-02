<?php

declare(strict_types=1);

use Alexandria\Core\Http\Controllers\Auth\RegisterAvailabilityController;
use Illuminate\Support\Facades\Route;

Route::middleware(['web', 'throttle:30,1'])->group(function () {
    Route::post('/register/check-username', [RegisterAvailabilityController::class, 'checkUsername'])
        ->name('register.check-username');

    Route::post('/register/check-email', [RegisterAvailabilityController::class, 'checkEmail'])
        ->name('register.check-email');
});

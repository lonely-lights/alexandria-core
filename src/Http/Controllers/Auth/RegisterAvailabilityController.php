<?php

declare(strict_types=1);

namespace Alexandria\Core\Http\Controllers\Auth;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Validator;

class RegisterAvailabilityController extends Controller
{
    /**
     * POST /register/check-username — debounced from Register.tsx as the
     * user types. Returns {available: bool|null, message: string}.
     * `available: null` means "still typing, no verdict yet".
     */
    public function checkUsername(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'username' => ['required', 'string', 'max:255', 'alpha_dash'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'available' => false,
                'message' => $validator->errors()->first('username'),
            ]);
        }

        $username = $request->string('username')->toString();

        if (strlen($username) < 3) {
            return response()->json([
                'available' => null,
                'message' => 'Keep typing…',
            ]);
        }

        $userClass = config('alexandria.models.user');
        $taken = $userClass::query()
            ->whereRaw('LOWER(name) = ?', [strtolower($username)])
            ->exists();

        return response()->json([
            'available' => ! $taken,
            'message' => $taken ? 'Already in use' : 'Available',
        ]);
    }

    /**
     * POST /register/check-email — debounced from Register.tsx as the
     * user types. Returns {available: bool, message: string}.
     */
    public function checkEmail(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'email' => ['required', 'string', 'email', 'max:255'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'available' => false,
                'message' => $validator->errors()->first('email'),
            ]);
        }

        $email = $request->string('email')->toString();
        $userClass = config('alexandria.models.user');
        $taken = $userClass::query()
            ->whereRaw('LOWER(email) = ?', [strtolower($email)])
            ->exists();

        return response()->json([
            'available' => ! $taken,
            'message' => $taken ? 'Email already registered' : 'Email is available',
        ]);
    }
}

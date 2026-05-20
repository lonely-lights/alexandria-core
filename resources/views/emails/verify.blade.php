@extends('alexandria::emails.layouts.branded')

@section('subject', app(\Alexandria\Core\Mail\BrandedTextResolver::class)->get('verify', 'subject'))

@section('content')
    <p style="margin:0 0 16px; font-size:18px; font-weight:600; color:#1c1917;">
        @brandedString('verify.greeting')
    </p>

    <p style="margin:0 0 24px; font-size:15px; line-height:1.6; color:#1c1917;">
        @brandedString('verify.intro')
    </p>

    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
        <tr>
            <td align="center" style="padding: 8px 0 28px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                        <td align="center" style="border-radius:6px; background:#1c1917;">
                            <a href="{{ $verificationUrl }}" style="display:inline-block; padding:13px 28px; color:#ffffff; text-decoration:none; font-weight:600; font-size:15px; letter-spacing:0.01em; border-radius:6px;">
                                @brandedString('verify.action')
                            </a>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>

    <p style="margin:0 0 12px; font-size:13px; color:#78716c;">
        @brandedString('verify.expiry_note', ['minutes' => $expiryMinutes])
    </p>

    <p style="margin:0; font-size:13px; color:#78716c;">
        @brandedString('verify.fallback')
    </p>
@endsection

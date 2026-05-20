<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="{{ str_replace('_', '-', app()->getLocale()) }}">
<head>
    <meta charset="utf-8">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="x-apple-disable-message-reformatting">
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light only">
    <title>{{ trim((string) $__env->yieldContent('subject', config('app.name'))) }}</title>
</head>
<body style="margin:0; padding:0; background:#fafaf9; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif; color:#1c1917; line-height:1.6;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#fafaf9;">
        <tr>
            <td align="center" style="padding:32px 16px;">
                <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px; width:100%; background:#ffffff; border:1px solid #e7e5e4; border-radius:8px;">
                    {{-- Header: logomark + Cinzel→Georgia wordmark --}}
                    <tr>
                        <td align="center" style="padding:28px 32px 20px; border-bottom:1px solid #e7e5e4;">
                            <table role="presentation" cellpadding="0" cellspacing="0" border="0">
                                <tr>
                                    <td valign="middle" style="padding-right:12px;">
                                        <svg width="32" height="32" viewBox="0 0 64 64" xmlns="http://www.w3.org/2000/svg" fill="#1c1917" aria-hidden="true">
                                            <path d="M 33.18 13.92 L 39.82 19.08 Q 41 20 39.5 20 L 24.5 20 Q 23 20 24.18 19.08 L 30.82 13.92 Q 32 13 33.18 13.92 Z"/>
                                            <path d="M 16 26 L 20.5 26 Q 22 26 23.23 26.86 L 30.77 32.14 Q 32 33 33.23 32.14 L 40.77 26.86 Q 42 26 43.5 26 L 48 26 Q 50 26 50 28 L 50 34 Q 50 36 48 36 L 16 36 Q 14 36 14 34 L 14 28 Q 14 26 16 26 Z"/>
                                            <rect x="10" y="42" width="16" height="10" rx="2"/>
                                            <rect x="38" y="42" width="16" height="10" rx="2"/>
                                        </svg>
                                    </td>
                                    <td valign="middle">
                                        <span style="font-family:'Cinzel',Georgia,serif; font-weight:600; font-size:22px; letter-spacing:0.05em; text-transform:uppercase; color:#1c1917;">Alexandria</span>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>
                    {{-- Content slot --}}
                    <tr>
                        <td style="padding:32px 40px; font-size:15px; color:#1c1917; line-height:1.6;">
                            @yield('content')
                        </td>
                    </tr>
                    {{-- Footer --}}
                    <tr>
                        <td align="center" style="padding:20px 32px 28px; border-top:1px solid #e7e5e4; background:#fafaf9; border-radius:0 0 8px 8px;">
                            <p style="margin:0 0 4px; font-size:12px; color:#78716c; line-height:1.5;">
                                @yield('footer', __('alexandria::emails.layout.footer'))
                            </p>
                            <p style="margin:0; font-size:11px; color:#a8a29e; line-height:1.5;">
                                {{ __('alexandria::emails.layout.copyright', ['year' => date('Y')]) }}
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>

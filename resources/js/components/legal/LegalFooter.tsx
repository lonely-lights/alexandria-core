import type { ReactNode } from 'react';

interface LegalFooterProps {
    termsUrl: string;
    privacyUrl: string;
    termsLabel: ReactNode;
    privacyLabel: ReactNode;
    agreementText?: ReactNode;
    conjunction?: ReactNode;
}

export default function LegalFooter({
    termsUrl,
    privacyUrl,
    termsLabel,
    privacyLabel,
    agreementText,
    conjunction,
}: LegalFooterProps) {
    return (
        <p
            className="text-center text-xs pt-4"
            style={{ color: 'var(--theme-base-content)', opacity: 0.4 }}
        >
            {agreementText ? (
                <>
                    {agreementText}{' '}
                    <LegalLink href={termsUrl}>{termsLabel}</LegalLink>{' '}
                    {conjunction}{' '}
                    <LegalLink href={privacyUrl}>{privacyLabel}</LegalLink>.
                </>
            ) : (
                <>
                    <LegalLink href={termsUrl}>{termsLabel}</LegalLink>
                    {' · '}
                    <LegalLink href={privacyUrl}>{privacyLabel}</LegalLink>
                </>
            )}
        </p>
    );
}

function LegalLink({
    href,
    children,
}: {
    href: string;
    children: ReactNode;
}) {
    return (
        <a
            href={href}
            className="underline hover:opacity-80 transition-opacity"
        >
            {children}
        </a>
    );
}

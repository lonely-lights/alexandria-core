import { usePage } from '@inertiajs/react';

import LegalPage, {
    BulletList,
    LegalSection,
    SubHeading,
} from '../../components/legal/LegalPage';

interface PrivacyProps {
    copy: Record<string, string>;
    [key: string]: unknown;
}

export default function Privacy() {
    const { copy } = usePage<PrivacyProps>().props;

    return (
        <LegalPage
            copy={copy}
            titleKey="privacy.title"
            lastUpdatedKey="privacy.last_updated"
            defaultTitle="Privacy Policy"
        >
            <LegalSection n="1" heading="Information We Collect">
                <p>
                    We collect information you provide directly to us, such as
                    when you create an account, create content, or contact us
                    for support.
                </p>

                <SubHeading>Personal Information</SubHeading>
                <BulletList
                    items={[
                        'Account information (username, email, password)',
                        'Profile information (display name, avatar, bio)',
                        'Content you create (projects, entries, notes)',
                    ]}
                />

                <SubHeading>Automatically Collected Information</SubHeading>
                <BulletList
                    items={[
                        'Log data (IP address, browser type, pages visited)',
                        'Device information',
                        'Usage patterns',
                    ]}
                />
            </LegalSection>

            <LegalSection n="2" heading="How We Use Your Information">
                <p>We use the information we collect to:</p>
                <BulletList
                    items={[
                        'Provide, maintain, and improve our services',
                        'Process transactions and send related information',
                        'Send technical notices, updates, and support messages',
                        'Respond to your comments, questions, and requests',
                    ]}
                />
            </LegalSection>

            <LegalSection n="3" heading="Information Sharing">
                <p>
                    We do not sell, trade, or otherwise transfer your personal
                    information to outside parties except as described in
                    this policy.
                </p>
            </LegalSection>

            <LegalSection n="4" heading="Data Security">
                <p>
                    We implement appropriate security measures to protect
                    your personal information against unauthorized access,
                    alteration, disclosure, or destruction.
                </p>
            </LegalSection>

            <LegalSection n="5" heading="Your Rights">
                <p>
                    You have the right to access, update, or delete your
                    personal information at any time through your account
                    settings.
                </p>
            </LegalSection>

            <LegalSection n="6" heading="Contact Us">
                <p>
                    If you have questions about this Privacy Policy, please
                    contact us.
                </p>
            </LegalSection>
        </LegalPage>
    );
}

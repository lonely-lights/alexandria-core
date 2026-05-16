import { usePage } from '@inertiajs/react';

import LegalPage, {
    LegalSection,
} from '../../components/legal/LegalPage';

interface TermsProps {
    copy: Record<string, string>;
    [key: string]: unknown;
}

export default function Terms() {
    const { copy } = usePage<TermsProps>().props;

    return (
        <LegalPage
            copy={copy}
            titleKey="terms.title"
            lastUpdatedKey="terms.last_updated"
            defaultTitle="Terms of Service"
        >
            <LegalSection n="1" heading="Acceptance of Terms">
                <p>
                    By accessing and using Alexandria, you accept and agree to
                    be bound by the terms and provisions of this agreement.
                </p>
            </LegalSection>

            <LegalSection n="2" heading="Use License">
                <p>
                    Permission is granted to temporarily use Alexandria for
                    personal, non-commercial transitory viewing only.
                </p>
            </LegalSection>

            <LegalSection n="3" heading="User Content">
                <p>
                    You retain ownership of any content you create using
                    Alexandria. By using our service, you grant us a license to
                    host and display your content as necessary to provide the
                    service.
                </p>
            </LegalSection>

            <LegalSection n="4" heading="Disclaimer">
                <p>
                    The materials on Alexandria are provided on an &apos;as
                    is&apos; basis. Alexandria makes no warranties, expressed
                    or implied, and hereby disclaims and negates all other
                    warranties.
                </p>
            </LegalSection>

            <LegalSection n="5" heading="Limitations">
                <p>
                    In no event shall Alexandria or its suppliers be liable
                    for any damages arising out of the use or inability to
                    use the materials on Alexandria.
                </p>
            </LegalSection>

            <LegalSection n="6" heading="Revisions">
                <p>
                    Alexandria may revise these terms of service at any time
                    without notice. By using this website you are agreeing to
                    be bound by the then current version of these terms of
                    service.
                </p>
            </LegalSection>
        </LegalPage>
    );
}

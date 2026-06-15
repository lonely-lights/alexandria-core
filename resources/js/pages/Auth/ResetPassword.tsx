import { useForm } from "@inertiajs/react";
import { useState, type SyntheticEvent } from "react";

import PasswordRulesPopover, {
    evaluatePasswordRules,
} from "@alexandria/components/form/PasswordRulesPopover";
import FormGroup from "../../components/form/FormGroup";
import LegalFooter from "../../components/legal/LegalFooter";
import TextField from "../../components/form/TextField";
import AuthLayout from "../../components/layouts/AuthLayout";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import ButtonLink from "../../components/ui/ButtonLink";
import Divider from "../../components/ui/Divider";

interface ResetPasswordProps {
    copy: Record<string, string>;
    token: string;
    email: string;
    loginUrl: string;
    termsUrl: string;
    privacyUrl: string;
}

export default function ResetPassword({
    copy,
    token,
    email,
    loginUrl,
    termsUrl,
    privacyUrl,
}: ResetPasswordProps) {
    const form = useForm({
        token,
        email,
        password: "",
        password_confirmation: "",
    });

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        form.post("/reset-password");
    };

    // Password popover anchoring + focus tracking (mirrors Register).
    const [passwordEl, setPasswordEl] = useState<HTMLInputElement | null>(null);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [confirmationFocused, setConfirmationFocused] = useState(false);

    const passwordsValid = evaluatePasswordRules(form.data.password, {
        confirmation: form.data.password_confirmation,
    }).allPassed;

    // Email is trusted from the signed URL — we don't render it as an
    // input (preventing devtools-driven edits from confusing the UX) so
    // it's not part of the submit gate.
    const canSubmit = passwordsValid;
    const passwordFieldState = passwordsValid ? "success" : "idle";

    return (
        <AuthLayout
            pageTitle={copy["actions.reset_password"]}
            formTitle="Choose a new password"
            formIntro="Pick a new password to log back in."
        >
            <div
                className="text-sm"
                style={{
                    color: "var(--theme-base-content)",
                    opacity: 0.6,
                }}
            >
                Resetting password for{" "}
                <strong style={{ opacity: 1 }}>{email}</strong>
            </div>

            {Object.keys(form.errors).length > 0 && (
                <Alert role="error">
                    <div className="space-y-1">
                        {Object.values(form.errors).map((err) => (
                            <p key={err}>{err}</p>
                        ))}
                    </div>
                </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
                <FormGroup label={copy["fields.password"]} htmlFor="password">
                    <TextField
                        ref={setPasswordEl}
                        id="password"
                        name="password"
                        type="password"
                        value={form.data.password}
                        onChange={(e) =>
                            form.setData("password", e.target.value)
                        }
                        onFocus={() => setPasswordFocused(true)}
                        onBlur={() => setPasswordFocused(false)}
                        required
                        autoFocus
                        autoComplete="new-password"
                        placeholder="••••••••"
                        state={passwordFieldState}
                        icon={
                            <i
                                className="fa-solid fa-lock"
                                aria-hidden="true"
                            />
                        }
                    />
                    <PasswordRulesPopover
                        value={form.data.password}
                        confirmation={form.data.password_confirmation}
                        open={passwordFocused || confirmationFocused}
                        anchor={passwordEl}
                    />
                </FormGroup>

                <FormGroup
                    label={copy["actions.confirm_password"]}
                    htmlFor="password_confirmation"
                >
                    <TextField
                        id="password_confirmation"
                        name="password_confirmation"
                        type="password"
                        value={form.data.password_confirmation}
                        onChange={(e) =>
                            form.setData(
                                "password_confirmation",
                                e.target.value,
                            )
                        }
                        onFocus={() => setConfirmationFocused(true)}
                        onBlur={() => setConfirmationFocused(false)}
                        required
                        autoComplete="new-password"
                        placeholder="••••••••"
                        state={passwordFieldState}
                        icon={
                            <i
                                className="fa-solid fa-lock"
                                aria-hidden="true"
                            />
                        }
                    />
                </FormGroup>

                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={form.processing}
                    disabled={form.processing || !canSubmit}
                >
                    {copy["actions.reset_password"]}
                    <span aria-hidden="true">→</span>
                </Button>
            </form>

            <Divider>{copy["divider.remembered"]}</Divider>
            <ButtonLink href={loginUrl} variant="outline" size="lg" fullWidth>
                {copy["actions.login"]}
                <span aria-hidden="true">→</span>
            </ButtonLink>

            <LegalFooter
                termsUrl={termsUrl}
                privacyUrl={privacyUrl}
                termsLabel={copy["legal.terms_of_service"]}
                privacyLabel={copy["legal.privacy_policy"]}
                agreementText={copy["login.agree_terms"]}
                conjunction={copy["login.and"]}
            />
        </AuthLayout>
    );
}

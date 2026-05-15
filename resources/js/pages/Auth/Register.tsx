import { useForm } from "@inertiajs/react";
import { useEffect, useRef, useState, type SyntheticEvent } from "react";

import PasswordRulesPopover, {
    evaluatePasswordRules,
} from "@alexandria/components/form/PasswordRulesPopover";
import {
    ToastProvider,
    useToastContext,
} from "@alexandria/components/ui/ToastProvider";
import AvailabilityIndicator, {
    type AvailabilityStatus,
} from "../../components/form/AvailabilityIndicator";
import CheckboxField from "../../components/form/CheckboxField";
import FormGroup from "../../components/form/FormGroup";
import TextField from "../../components/form/TextField";
import AuthLayout from "../../components/layouts/AuthLayout";
import Alert from "../../components/ui/Alert";
import Button from "../../components/ui/Button";
import ButtonLink from "../../components/ui/ButtonLink";
import Divider from "../../components/ui/Divider";

interface AvailabilityState {
    status: AvailabilityStatus;
    message: string | null;
}

interface RegisterProps {
    copy: Record<string, string>;
    loginUrl: string;
    termsUrl: string;
    privacyUrl: string;
}

export default function Register(props: RegisterProps) {
    // ToastProvider must wrap RegisterForm so the form body can call
    // useToastContext().
    return (
        <ToastProvider>
            <RegisterForm {...props} />
        </ToastProvider>
    );
}

function RegisterForm({ copy, loginUrl, termsUrl, privacyUrl }: RegisterProps) {
    const { show: showToast } = useToastContext();
    const form = useForm({
        name: "",
        email: "",
        password: "",
        password_confirmation: "",
        terms: false as boolean,
    });

    const handleSubmit = (e: SyntheticEvent) => {
        e.preventDefault();
        form.post("/register");
    };

    // PasswordRulesPopover anchor + focus state for live rule feedback.
    // Callback ref pattern (useState, not useRef) avoids React 19's
    // react-hooks/refs rule against reading .current during render.
    const [passwordEl, setPasswordEl] = useState<HTMLInputElement | null>(null);
    const [passwordFocused, setPasswordFocused] = useState(false);
    const [confirmationFocused, setConfirmationFocused] = useState(false);

    // All-rules-passed flag drives the success border on BOTH password fields.
    const passwordsValid = evaluatePasswordRules(form.data.password, {
        confirmation: form.data.password_confirmation,
    }).allPassed;

    // ── Live availability checks ─────────────────────────────────────
    const [usernameStatus, setUsernameStatus] = useState<AvailabilityState>({
        status: "idle",
        message: null,
    });
    const [emailStatus, setEmailStatus] = useState<AvailabilityState>({
        status: "idle",
        message: null,
    });
    const usernameTimer = useRef<number | null>(null);
    const emailTimer = useRef<number | null>(null);

    function csrfToken(): string {
        return (
            document.querySelector<HTMLMetaElement>('meta[name="csrf-token"]')
                ?.content ?? ""
        );
    }

    // Debounced availability check for the username field. The toast
    // dispatch lives inside the fetch's .then() — sibling to the
    // setUsernameStatus call — so the action and its user-feedback fire
    // at the same site instead of via a downstream useEffect listening
    // to the resolved state.
    useEffect(() => {
        if (usernameTimer.current) {
            window.clearTimeout(usernameTimer.current);
        }

        const name = form.data.name.trim();

        if (!name) {
            setUsernameStatus({ status: "idle", message: null });

            return;
        }

        setUsernameStatus({ status: "checking", message: null });
        usernameTimer.current = window.setTimeout(() => {
            fetch("/register/check-username", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-CSRF-TOKEN": csrfToken(),
                    "X-Requested-With": "XMLHttpRequest",
                },
                body: JSON.stringify({ username: name }),
            })
                .then((r) => r.json())
                .then(
                    (body: {
                        available: boolean | null;
                        message: string | null;
                    }) => {
                        if (body.available === null) {
                            setUsernameStatus({
                                status: "idle",
                                message: body.message,
                            });

                            return;
                        }

                        const status = body.available ? "available" : "taken";
                        setUsernameStatus({ status, message: body.message });
                        showToast(
                            body.message ??
                                (body.available
                                    ? "Username is available."
                                    : "Username is already in use."),
                            { type: body.available ? "success" : "warning" },
                        );
                    },
                )
                .catch(() =>
                    setUsernameStatus({ status: "idle", message: null }),
                );
        }, 400);

        return () => {
            if (usernameTimer.current) {
                window.clearTimeout(usernameTimer.current);
            }
        };
    }, [form.data.name, showToast]);

    // Debounced availability check for the email field. Same site-of-action
    // toast pattern as the username check above.
    useEffect(() => {
        if (emailTimer.current) {
            window.clearTimeout(emailTimer.current);
        }

        const email = form.data.email.trim();

        if (!email || !email.includes("@") || !email.includes(".")) {
            setEmailStatus({ status: "idle", message: null });

            return;
        }

        setEmailStatus({ status: "checking", message: null });
        emailTimer.current = window.setTimeout(() => {
            fetch("/register/check-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Accept: "application/json",
                    "X-CSRF-TOKEN": csrfToken(),
                    "X-Requested-With": "XMLHttpRequest",
                },
                body: JSON.stringify({ email }),
            })
                .then((r) => r.json())
                .then(
                    (body: {
                        available: boolean | null;
                        message: string | null;
                    }) => {
                        const status = body.available ? "available" : "taken";
                        setEmailStatus({ status, message: body.message });
                        showToast(
                            body.message ??
                                (body.available
                                    ? "Email is available."
                                    : "Email is already registered."),
                            { type: body.available ? "success" : "warning" },
                        );
                    },
                )
                .catch(() => setEmailStatus({ status: "idle", message: null }));
        }, 500);

        return () => {
            if (emailTimer.current) {
                window.clearTimeout(emailTimer.current);
            }
        };
    }, [form.data.email, showToast]);

    // Build the terms agreement line by replacing :terms_of_service /
    // :privacy_policy placeholders.
    const agreeTemplate =
        copy["actions.agree_terms_privacy"] ??
        "I agree to the :terms_of_service and :privacy_policy.";
    const termsLabel = copy["legal.terms_of_service"] ?? "Terms of Service";
    const privacyLabel = copy["legal.privacy_policy"] ?? "Privacy Policy";
    const termsRegex = /(:terms_of_service|:privacy_policy)/g;
    const agreeParts = agreeTemplate.split(termsRegex);

    const fieldStateFor = (status: AvailabilityStatus) =>
        status === "available"
            ? "success"
            : status === "taken"
              ? "error"
              : "idle";

    const passwordFieldState = passwordsValid ? "success" : "idle";

    return (
        <AuthLayout
            pageTitle={copy["actions.enlist"] ?? "Register"}
            formTitle="Join the wordbench"
            motif={<RegisterPapersPanel />}
        >
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
                <FormGroup
                    label={copy["fields.name"]}
                    labelHint="(3–30 characters)"
                    htmlFor="name"
                >
                    <TextField
                        id="name"
                        name="name"
                        type="text"
                        value={form.data.name}
                        onChange={(e) => form.setData("name", e.target.value)}
                        required
                        autoFocus
                        autoComplete="username"
                        placeholder="letters, numbers, dashes, underscores"
                        state={fieldStateFor(usernameStatus.status)}
                        icon={
                            <i
                                className="fa-solid fa-user"
                                aria-hidden="true"
                            />
                        }
                        trailing={
                            <AvailabilityIndicator
                                status={usernameStatus.status}
                            />
                        }
                    />
                </FormGroup>

                <FormGroup label={copy["fields.email"]} htmlFor="email">
                    <TextField
                        id="email"
                        name="email"
                        type="email"
                        value={form.data.email}
                        onChange={(e) => form.setData("email", e.target.value)}
                        required
                        autoComplete="username"
                        placeholder="you@example.com"
                        state={fieldStateFor(emailStatus.status)}
                        icon={
                            <i
                                className="fa-solid fa-envelope"
                                aria-hidden="true"
                            />
                        }
                        trailing={
                            <AvailabilityIndicator
                                status={emailStatus.status}
                            />
                        }
                    />
                </FormGroup>

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

                <CheckboxField
                    id="terms"
                    name="terms"
                    align="start"
                    checked={form.data.terms}
                    onChange={(e) => form.setData("terms", e.target.checked)}
                    required
                    label={agreeParts.map((part, i) => {
                        if (part === ":terms_of_service") {
                            return (
                                <a
                                    key={i}
                                    href={termsUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:opacity-100 transition-opacity"
                                >
                                    {termsLabel}
                                </a>
                            );
                        }

                        if (part === ":privacy_policy") {
                            return (
                                <a
                                    key={i}
                                    href={privacyUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="underline hover:opacity-100 transition-opacity"
                                >
                                    {privacyLabel}
                                </a>
                            );
                        }

                        return <span key={i}>{part}</span>;
                    })}
                />

                {/* Submit — gated on all client-side checks resolving green.
                    Server still re-validates, so this is a UX gate, not a
                    security one. */}
                <Button
                    type="submit"
                    variant="primary"
                    size="lg"
                    fullWidth
                    loading={form.processing}
                    disabled={
                        form.processing ||
                        usernameStatus.status !== "available" ||
                        emailStatus.status !== "available" ||
                        !passwordsValid ||
                        !form.data.terms
                    }
                >
                    {copy["actions.enlist"]}
                    <span aria-hidden="true">→</span>
                </Button>
            </form>

            <Divider>{copy["actions.already_registered"]}</Divider>
            <ButtonLink href={loginUrl} variant="outline" size="lg" fullWidth>
                {copy["actions.login"]}
                <span aria-hidden="true">→</span>
            </ButtonLink>
        </AuthLayout>
    );
}

/**
 * Static sticky-notes cluster for Register (no rotation between panels —
 * Login uses HeroRotator, Register stays still). Carries the same paper-
 * tape decorative tokens forward verbatim.
 */
function RegisterPapersPanel() {
    return (
        <div className="relative h-full w-full">
            <svg
                width="440"
                height="280"
                viewBox="0 0 440 280"
                className="absolute top-0 left-0 pointer-events-none"
                aria-hidden="true"
            >
                <path
                    d="M 145 50 Q 220 5 310 60 Q 340 140 160 180 Q 225 210 275 220"
                    stroke="#d4a017"
                    strokeWidth="1.8"
                    strokeDasharray="5 6"
                    strokeLinecap="round"
                    fill="none"
                    opacity="0.7"
                />
            </svg>

            <div
                className="sticky-note sticky-note--yellow absolute text-[15px]"
                style={{
                    top: 30,
                    left: 60,
                    width: 170,
                    transform: "rotate(-4deg)",
                }}
            >
                every idea gets a home
            </div>
            <div
                className="sticky-note sticky-note--sage absolute text-[15px]"
                style={{
                    top: 40,
                    right: 40,
                    width: 180,
                    transform: "rotate(3deg)",
                }}
            >
                worlds grow, one note at a time
            </div>
            <div
                className="sticky-note sticky-note--coral absolute text-[15px]"
                style={{
                    top: 160,
                    left: 80,
                    width: 160,
                    transform: "rotate(-2deg)",
                }}
            >
                characters remember
            </div>
            <div
                className="sticky-note sticky-note--lavender absolute text-[15px]"
                style={{
                    top: 200,
                    right: 80,
                    width: 170,
                    transform: "rotate(2deg)",
                }}
            >
                nothing gets lost
            </div>
        </div>
    );
}

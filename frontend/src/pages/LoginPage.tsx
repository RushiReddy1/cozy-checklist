import { useState } from "react";
import type { FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircle2, Circle, Eye, EyeOff } from "lucide-react";
import bubblydoLogo from "../assets/bubblydo-logo.svg";
import { apiFetch } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { storeAuthSession, type AuthPayload } from "@/lib/auth";

type AuthMode = "signup" | "login";

export default function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<AuthMode>("signup");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const passwordChecks = [
    {
      label: "At least 8 characters",
      passed: password.length >= 8,
    },
    {
      label: "One uppercase letter",
      passed: /[A-Z]/.test(password),
    },
    {
      label: "One lowercase letter",
      passed: /[a-z]/.test(password),
    },
    {
      label: "One number",
      passed: /\d/.test(password),
    },
    {
      label: "One special character",
      passed: /[^A-Za-z0-9]/.test(password),
    },
  ];

  function passwordMatchesStandard(value: string) {
    const hasUppercase = /[A-Z]/.test(value);
    const hasLowercase = /[a-z]/.test(value);
    const hasNumber = /\d/.test(value);
    const hasSpecial = /[^A-Za-z0-9]/.test(value);
    return value.length >= 8 && hasUppercase && hasLowercase && hasNumber && hasSpecial;
  }

  async function getApiErrorMessage(res: Response, currentMode: AuthMode) {
    try {
      const data = (await res.json()) as { error?: string };
      const message = data.error?.trim();

      if (!message) {
        return currentMode === "signup"
          ? "Could not create your account right now."
          : "Email or password is incorrect.";
      }

      if (message === "invalid email or password") {
        return "Email or password is incorrect.";
      }

      if (message === "email already registered") {
        return "That email is already registered. Try logging in instead.";
      }

      if (message.includes("password must be at least 8 characters")) {
        return "Password must have at least 8 characters, including uppercase, lowercase, a number, and a special character.";
      }

      return message.charAt(0).toUpperCase() + message.slice(1);
    } catch {
      return currentMode === "signup"
        ? "Could not create your account right now."
        : "Email or password is incorrect.";
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (
      mode === "signup" &&
      (!firstName.trim() || !lastName.trim() || !email.trim() || !password.trim())
    ) {
      setError("Please fill in first name, last name, email, and password.");
      return;
    }

    if (mode === "login" && (!email.trim() || !password.trim())) {
      setError("Please enter both email and password.");
      return;
    }

    if (mode === "signup" && !passwordMatchesStandard(password)) {
      setError(
        "Password must have at least 8 characters, including uppercase, lowercase, a number, and a special character.",
      );
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const endpoint = mode === "signup" ? "/signup" : "/login";
      const payload =
        mode === "signup"
          ? {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              email: email.trim(),
              password,
            }
          : {
              email: email.trim(),
              password,
            };

      const res = await apiFetch(endpoint, {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const message = await getApiErrorMessage(res, mode);
        throw new Error(message);
      }

      const data = (await res.json()) as AuthPayload;

      if (!data.token || !data.user) {
        throw new Error("Could not finish signing you in. Please try again.");
      }

      storeAuthSession(data, mode);
      navigate("/", { replace: true });
    } catch (err) {
      const message =
        err instanceof TypeError
          ? "Could not reach the server. Make sure the backend is running on http://localhost:8080."
          : err instanceof Error
            ? err.message
            : "Could not finish your request right now.";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <main className="min-h-screen overflow-hidden bg-gradient-to-br from-pink-100 via-purple-100 to-pink-200 px-6 py-10 text-slate-900">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-6xl items-center justify-center">
        <div className="grid w-full max-w-5xl overflow-hidden rounded-[2rem] border border-pink-100 bg-white/80 shadow-[0_30px_80px_rgba(221,160,221,0.18)] backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
          <section className="relative hidden min-h-[640px] flex-col justify-between bg-[linear-gradient(160deg,_rgba(255,255,255,0.28),_rgba(255,255,255,0.06)),linear-gradient(135deg,_#f9a8d4,_#f472b6_48%,_#c084fc)] p-10 text-white lg:flex">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,_rgba(255,255,255,0.28),_transparent_35%),radial-gradient(circle_at_80%_30%,_rgba(255,255,255,0.18),_transparent_30%),radial-gradient(circle_at_50%_80%,_rgba(255,255,255,0.16),_transparent_26%)]" />
            <div className="relative flex items-center gap-4">
              <div className="rounded-3xl bg-white/18 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.35)] backdrop-blur-md">
                <img src={bubblydoLogo} alt="BubblyDo" className="h-12 w-12" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-white/75">
                  BubblyDo
                </p>
                <h1 className="mt-2 text-4xl font-black leading-none">
                  Organize the day
                  <br />
                  before it organizes you.
                </h1>
              </div>
            </div>

            <div className="relative space-y-5">
              <p className="max-w-md text-lg leading-8 text-white/88">
                Keep your lists, plans, and little wins in one calm place.
              </p>
              <div className="rounded-3xl border border-white/20 bg-white/12 p-5 backdrop-blur-sm">
                <p className="text-sm uppercase tracking-[0.25em] text-white/70">
                  Daily flow
                </p>
                <p className="mt-3 max-w-sm text-base leading-7 text-white/88">
                  Create a list, check things off, and come back whenever you are
                  ready to keep going.
                </p>
              </div>
            </div>
          </section>

          <section className="flex min-h-[640px] items-center bg-white/85 p-6 sm:p-10">
            <div className="mx-auto w-full max-w-md">
              <div className="mb-8 flex items-center gap-3 lg:hidden">
                <img src={bubblydoLogo} alt="BubblyDo" className="h-14 w-14" />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-pink-500">
                    BubblyDo
                  </p>
                  <p className="text-sm text-slate-500">Welcome back</p>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-semibold uppercase tracking-[0.35em] text-pink-500">
                  {mode === "signup" ? "Create account" : "Login"}
                </p>
                <h2 className="text-4xl font-black tracking-tight text-slate-900">
                  {mode === "signup"
                    ? "Create your BubblyDo account."
                    : "Sign in to keep things moving."}
                </h2>
                <p className="text-base leading-7 text-slate-500">
                  {mode === "signup"
                    ? "Start with your name, email, and a strong password. We will take you straight into your workspace."
                    : "Use your email and password to continue into your workspace."}
                </p>
              </div>

              <div className="mt-8 grid grid-cols-2 rounded-2xl bg-pink-50 p-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setMode("signup");
                    setError("");
                  }}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    mode === "signup"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-pink-600 hover:text-pink-700"
                  }`}
                >
                  Sign up
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode("login");
                    setError("");
                  }}
                  className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                    mode === "login"
                      ? "bg-white text-slate-900 shadow-sm"
                      : "text-pink-600 hover:text-pink-700"
                  }`}
                >
                  Log in
                </button>
              </div>

              <form onSubmit={handleSubmit} className="mt-10 space-y-5">
                {mode === "signup" ? (
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <label
                        htmlFor="first-name"
                        className="text-sm font-semibold text-slate-700"
                      >
                        First name
                      </label>
                      <Input
                        id="first-name"
                        type="text"
                        autoComplete="given-name"
                        value={firstName}
                        onChange={(event) => setFirstName(event.target.value)}
                        placeholder="ex: john"
                        className="h-12 rounded-2xl border-white/70 bg-white/90 px-4 shadow-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <label
                        htmlFor="last-name"
                        className="text-sm font-semibold text-slate-700"
                      >
                        Last name
                      </label>
                      <Input
                        id="last-name"
                        type="text"
                        autoComplete="family-name"
                        value={lastName}
                        onChange={(event) => setLastName(event.target.value)}
                        placeholder="ex: alexander"
                        className="h-12 rounded-2xl border-white/70 bg-white/90 px-4 shadow-sm"
                      />
                    </div>
                  </div>
                ) : null}

                <div className="space-y-2">
                  <label
                    htmlFor="email"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Email
                  </label>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="you@example.com"
                    className="h-12 rounded-2xl border-white/70 bg-white/90 px-4 shadow-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label
                    htmlFor="password"
                    className="text-sm font-semibold text-slate-700"
                  >
                    Password
                  </label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Enter your password"
                      className="h-12 rounded-2xl border-white/70 bg-white/90 px-4 pr-12 shadow-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((current) => !current)}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 transition hover:text-slate-700"
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5" />
                      ) : (
                        <Eye className="h-5 w-5" />
                      )}
                    </button>
                  </div>
                  {mode === "signup" && password.length > 0 ? (
                    <div className="rounded-2xl border border-pink-100 bg-pink-50/80 px-4 py-3">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-pink-500">
                        Password rules
                      </p>
                      <div className="mt-3 grid gap-2">
                        {passwordChecks.map((check) => (
                          <div
                            key={check.label}
                            className={`flex items-center gap-2 text-sm ${
                              check.passed ? "text-emerald-600" : "text-slate-500"
                            }`}
                          >
                            {check.passed ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0" />
                            ) : (
                              <Circle className="h-4 w-4 shrink-0" />
                            )}
                            <span>{check.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>

                {error ? (
                  <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-600">
                    {error}
                  </div>
                ) : null}

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="h-12 w-full rounded-2xl bg-slate-900 text-base font-semibold text-white hover:bg-slate-800"
                >
                  {isSubmitting
                    ? mode === "signup"
                      ? "Creating account..."
                      : "Signing in..."
                    : mode === "signup"
                      ? "Create account"
                      : "Sign in"}
                </Button>
              </form>

              <div className="mt-8 rounded-2xl border border-orange-100 bg-orange-50/80 px-4 py-4 text-sm leading-6 text-slate-600">
                {mode === "signup"
                  ? "Already have an account? Switch to Log in above."
                  : "Need an account? Switch to Sign up above."}
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

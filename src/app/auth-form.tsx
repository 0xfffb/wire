"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { loginAction, registerAction, type AuthFormState } from "./actions";
import { Turnstile } from "./turnstile";

const field = "mt-1.5 h-9 w-full rounded-md border border-black/10 px-3 outline-none focus:border-black";
const empty: AuthFormState = { error: "" };

export function LoginForm({ siteKey }: { siteKey: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  return (
    <AuthForm siteKey={siteKey} action={loginAction} title="登录" submit="继续" alternate={{ href: "/register", prompt: "还没有账户？", label: "注册" }}>
      <CredentialFields email={email} password={password} onEmail={setEmail} onPassword={setPassword} />
    </AuthForm>
  );
}

export function RegisterForm({ siteKey }: { siteKey: string }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");
  return (
    <AuthForm siteKey={siteKey} action={registerAction} title="注册" submit="创建账户" alternate={{ href: "/login", prompt: "已有账户？", label: "登录" }}>
      <CredentialFields email={email} password={password} onEmail={setEmail} onPassword={setPassword} />
      <label className="block text-sm text-[#666]">
        用户名
        <input name="username" required pattern="[a-z0-9_]{3,20}" value={username} onChange={(event) => setUsername(event.target.value)} className={field} />
      </label>
    </AuthForm>
  );
}

function CredentialFields({
  email,
  password,
  onEmail,
  onPassword,
}: {
  email: string;
  password: string;
  onEmail: (value: string) => void;
  onPassword: (value: string) => void;
}) {
  return (
    <>
      <label className="block text-sm text-[#666]">
        邮箱
        <input name="email" type="email" required value={email} onChange={(event) => onEmail(event.target.value)} className={field} />
      </label>
      <label className="block text-sm text-[#666]">
        密码
        <input name="password" type="password" required minLength={8} value={password} onChange={(event) => onPassword(event.target.value)} className={field} />
      </label>
    </>
  );
}

function AuthForm({
  siteKey,
  action,
  title,
  submit,
  alternate,
  children,
}: {
  siteKey: string;
  action: (prev: AuthFormState, formData: FormData) => Promise<AuthFormState>;
  title: string;
  submit: string;
  alternate: { href: string; prompt: string; label: string };
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, empty);
  const [token, setToken] = useState("");
  const [widgetKey, setWidgetKey] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (!state.error) return;
    setToken("");
    setWidgetKey((key) => key + 1);
  }, [state]);

  return (
    <form action={formAction} className="mx-auto max-w-sm space-y-4 px-6 py-16">
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      {state.error ? <p className="text-sm text-[#e5484d]">{state.error}</p> : null}
      {children}
      <Turnstile key={widgetKey} siteKey={siteKey} onToken={setToken} />
      <input type="hidden" name="cf-turnstile-response" value={token} />
      <button className="h-9 rounded-md bg-black px-3 text-white disabled:opacity-40" type="submit" disabled={pending || !token}>
        {pending ? "提交中" : submit}
      </button>
      <p className="text-sm text-[#666]">
        {alternate.prompt} <Link href={alternate.href} className="text-black">{alternate.label}</Link>
      </p>
    </form>
  );
}

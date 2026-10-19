import { RegisterForm } from "../auth-form";

export default function RegisterPage() {
  return <RegisterForm siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? ""} />;
}

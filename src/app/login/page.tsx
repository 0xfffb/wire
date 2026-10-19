import { loginAction, registerAction } from "../actions";

const field = "mt-1.5 h-9 w-full rounded-md border border-black/10 px-3 outline-none focus:border-black";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  const message =
    error === "taken" ? "邮箱或主页名已被使用。" : error === "register" ? "请检查注册信息。主页名使用小写字母、数字或下划线。" : error === "login" ? "邮箱或密码不正确。" : "";
  return (
    <div className="mx-auto grid max-w-3xl gap-16 px-6 py-16 md:grid-cols-2">
      <form action={loginAction} className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">登录</h1>
        <label className="block text-sm text-[#666]">
          邮箱
          <input name="email" type="email" required className={field} />
        </label>
        <label className="block text-sm text-[#666]">
          密码
          <input name="password" type="password" required minLength={8} className={field} />
        </label>
        <button className="h-9 rounded-md bg-black px-3 text-white" type="submit">继续</button>
      </form>
      <form action={registerAction} className="space-y-4">
        <h1 className="text-2xl font-semibold tracking-tight">注册</h1>
        {message ? <p className="text-sm text-[#e5484d]">{message}</p> : null}
        <label className="block text-sm text-[#666]">
          邮箱
          <input name="email" type="email" required className={field} />
        </label>
        <label className="block text-sm text-[#666]">
          密码
          <input name="password" type="password" required minLength={8} className={field} />
        </label>
        <label className="block text-sm text-[#666]">
          显示名
          <input name="displayName" required className={field} />
        </label>
        <label className="block text-sm text-[#666]">
          主页名
          <input name="handle" required pattern="[a-z0-9_]{3,20}" className={field} />
        </label>
        <button className="h-9 rounded-md border border-black px-3" type="submit">创建账户</button>
      </form>
    </div>
  );
}

import AuthForm from "@/components/auth/AuthForm";

export function LoginPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-2xl shadow-blue-950/20 backdrop-blur sm:p-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-300/80">Welcome back</p>
          <h1 className="text-3xl font-semibold text-zinc-50">Login</h1>
          <p className="text-sm text-zinc-400">Sign in with your PredictMarket account.</p>
        </div>
        <AuthForm mode="login" />
      </section>
    </main>
  );
}

export default LoginPage;

import AuthForm from "@/components/auth/AuthForm";

export function SignupPage() {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8 sm:px-6">
      <section className="rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 shadow-2xl shadow-blue-950/20 backdrop-blur sm:p-8">
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.3em] text-blue-300/80">Join PredictMarket</p>
          <h1 className="text-3xl font-semibold text-zinc-50">Create Account</h1>
          <p className="text-sm text-zinc-400">Start with virtual coins and compete on predictions.</p>
        </div>
        <AuthForm mode="signup" />
      </section>
    </main>
  );
}

export default SignupPage;

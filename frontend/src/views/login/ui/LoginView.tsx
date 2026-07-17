import Link from 'next/link';

import { LoginForm } from '@/features/log-in';

/** Login screen composition (criterion 2.1) with a link to signup (3.1). */
export function LoginView() {
  return (
    <main className="auth-screen">
      <section className="auth-card">
        <img
          className="auth-illustration"
          src="/auth/login-cactus.png"
          alt=""
          width={95}
          height={114}
        />
        <h1 className="auth-title">Yay, You&apos;re Back!</h1>
        <LoginForm />
        <p className="auth-switch">
          <Link href="/signup">Oops! I&apos;ve never been here before</Link>
        </p>
      </section>
    </main>
  );
}

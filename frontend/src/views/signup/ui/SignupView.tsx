import Link from 'next/link';

import { SignupForm } from '@/features/sign-up';

/** Signup screen composition (criterion 1.1) with a link to login (3.1). */
export function SignupView() {
  return (
    <main className="auth-screen">
      <section className="auth-card">
        <img
          className="auth-illustration"
          src="/auth/signup-cats.png"
          alt=""
          width={188}
          height={134}
        />
        <h1 className="auth-title">Yay, New Friend!</h1>
        <SignupForm />
        <p className="auth-switch">
          <Link href="/login">We&apos;re already friends!</Link>
        </p>
      </section>
    </main>
  );
}

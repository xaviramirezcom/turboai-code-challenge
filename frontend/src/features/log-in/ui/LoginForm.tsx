'use client';

import { useRouter } from 'next/navigation';
import { type FormEvent, useState } from 'react';

import { setSession } from '@/entities/session';
import { ApiError } from '@/shared/api';
import { fieldErrorsFrom } from '@/shared/lib';
import { PasswordInput } from '@/shared/ui/password-input';

import { login } from '../api/login';

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setSubmitting(true);
    try {
      const result = await login(email, password);
      setSession(result.user, result.token);
      router.push('/board');
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setErrors({ form: 'Invalid email or password.' });
        } else {
          const fields = fieldErrorsFrom(error.data);
          setErrors(
            Object.keys(fields).length > 0
              ? fields
              : { form: 'Something went wrong. Please try again.' },
          );
        }
      } else {
        setErrors({ form: 'Network error. Please try again.' });
      }
      setSubmitting(false);
    }
  }

  return (
    <form className="auth-form" onSubmit={handleSubmit} noValidate>
      {errors.form ? (
        <p className="form-error" role="alert">
          {errors.form}
        </p>
      ) : null}

      <div className="field">
        <label className="sr-only" htmlFor="login-email">
          Email
        </label>
        <input
          id="login-email"
          className="auth-input"
          name="email"
          type="email"
          placeholder="Email address"
          autoComplete="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          aria-invalid={errors.email ? true : undefined}
        />
        {errors.email ? (
          <p className="field-error" role="alert">
            {errors.email}
          </p>
        ) : null}
      </div>

      <PasswordInput
        label="Password"
        placeholder="Password"
        value={password}
        onChange={setPassword}
        autoComplete="current-password"
        error={errors.password}
      />

      <button type="submit" className="auth-submit" disabled={submitting}>
        {submitting ? 'Logging in…' : 'Login'}
      </button>
    </form>
  );
}

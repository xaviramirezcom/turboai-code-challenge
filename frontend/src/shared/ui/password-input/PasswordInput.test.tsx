import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';

import { PasswordInput } from './PasswordInput';

function Harness() {
  const [value, setValue] = useState('');
  return <PasswordInput label="Password" value={value} onChange={setValue} />;
}

describe('PasswordInput', () => {
  it('masks the value by default and toggles visibility', async () => {
    // covers 1.4
    const user = userEvent.setup();
    render(<Harness />);

    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');

    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');

    await user.click(screen.getByRole('button', { name: 'Hide password' }));
    expect(input).toHaveAttribute('type', 'password');
  });

  it('renders a field-level error when provided', () => {
    // covers 1.3 / 2.3 (error affordance)
    render(
      <PasswordInput
        label="Password"
        value="x"
        onChange={() => {}}
        error="Too short"
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('Too short');
  });
});

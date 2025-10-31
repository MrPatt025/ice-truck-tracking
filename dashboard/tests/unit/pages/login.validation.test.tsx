import React from 'react';
import { describe, expect, it, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: () => ({ replace: jest.fn() }),
}));

// Mock useAuth
jest.mock('@/shared/auth/AuthContext', async (orig) => {
  const actual = await (orig as any)();
  return {
    ...actual,
    useAuth: () => ({
      login: jest.fn().mockResolvedValue(undefined),
      token: null,
      loading: false,
      error: null,
    }),
  };
});

// Import the page AFTER mocks are set up
import LoginPage from '@/app/login/page';

describe('Login form validation', () => {
  it('shows validation error for short username/password without calling login', async () => {
    render(<LoginPage />);

    // Wait for mounted state by checking the heading
    await screen.findByRole('heading', { name: 'Sign in' });

    const user = screen.getByPlaceholderText('admin');
    const pass = screen.getByPlaceholderText('password');
    const submit = screen.getByRole('button', { name: 'Sign in' });

    // short username
    fireEvent.change(user, { target: { value: 'ab' } });
    fireEvent.change(pass, { target: { value: '1234567' } });
    fireEvent.click(submit);

    const err = await screen.findByRole('alert');
    expect(err).toHaveTextContent(/Username must be at least 3 characters/);
  });
});

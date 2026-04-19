import type { Page } from '@playwright/test'

const E2E_AUTH_TOKEN = 'e2e-test-token'

export async function setE2EAuthCookies(
  page: Page,
  baseURL: string,
  includeLegacyToken = false
): Promise<void> {
  const origin = new URL(baseURL)
  const secure = origin.protocol === 'https:'

  const cookies = [
    {
      name: 'access_token',
      value: E2E_AUTH_TOKEN,
      domain: origin.hostname,
      path: '/',
      httpOnly: false,
      secure,
      sameSite: 'Lax' as const,
    },
  ]

  if (includeLegacyToken) {
    cookies.push({
      name: 'auth-token',
      value: E2E_AUTH_TOKEN,
      domain: origin.hostname,
      path: '/',
      httpOnly: false,
      secure,
      sameSite: 'Lax' as const,
    })
  }

  await page.context().addCookies(cookies)
}

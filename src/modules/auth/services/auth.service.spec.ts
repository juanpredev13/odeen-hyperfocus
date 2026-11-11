import { beforeEach, describe, expect, it, vi } from 'vitest'

const exchangeCodeForSession = vi.fn()

vi.mock('@/services/supabase', () => ({
  supabase: { auth: { exchangeCodeForSession } },
}))

vi.mock('@/services/native', () => ({
  DEEP_LINK_SCHEME: 'odeen',
  isNative: (): boolean => true,
}))

const { completeEmailLink } = await import('@/modules/auth/services/auth.service')

describe('completeEmailLink', () => {
  beforeEach(() => {
    exchangeCodeForSession.mockReset()
    exchangeCodeForSession.mockResolvedValue({ error: null })
  })

  it('exchanges the code and returns the reset route', async () => {
    const result = await completeEmailLink('odeen://auth/reset-password?code=abc')

    expect(exchangeCodeForSession).toHaveBeenCalledWith('abc')
    expect(result).toEqual({ data: '/reset-password', error: null })
  })

  it('sends confirmation links home', async () => {
    const result = await completeEmailLink('odeen://auth/?code=abc')

    expect(result).toEqual({ data: '/', error: null })
  })

  it('never routes to a path the link did not come from', async () => {
    const result = await completeEmailLink('odeen://auth/assistant?code=abc')

    expect(result.data).toBe('/')
  })

  it('returns the error Supabase put in the link', async () => {
    const result = await completeEmailLink(
      'odeen://auth/reset-password?error=access_denied&error_description=Email+link+is+invalid+or+has+expired',
    )

    expect(exchangeCodeForSession).not.toHaveBeenCalled()
    expect(result.error?.message).toBe('Email link is invalid or has expired')
  })

  it('reports a failed exchange', async () => {
    exchangeCodeForSession.mockResolvedValue({ error: { message: 'code verifier not found' } })

    const result = await completeEmailLink('odeen://auth/reset-password?code=abc')

    expect(result).toEqual({ data: null, error: { message: 'code verifier not found' } })
  })

  it('reports a link without a code', async () => {
    const result = await completeEmailLink('odeen://auth/reset-password')

    expect(result.error?.message).toBe('The email link is missing its code.')
  })

  it('ignores URLs that are not auth links', async () => {
    expect(await completeEmailLink('odeen://capture?text=hi')).toEqual({ data: null, error: null })
    expect(await completeEmailLink('https://example.com/?code=abc')).toEqual({ data: null, error: null })
    expect(await completeEmailLink('not a url')).toEqual({ data: null, error: null })
    expect(exchangeCodeForSession).not.toHaveBeenCalled()
  })
})

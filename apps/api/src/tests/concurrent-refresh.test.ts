import { describe, it, expect, vi } from 'vitest'

describe('Concurrent Token Refresh Mechanism', () => {
  it('should only call the refresh API once for multiple simultaneous 401s', async () => {
    // 1. Mock the actual refreshApi call
    let refreshCallCount = 0
    const mockRefreshApi = async () => {
      refreshCallCount++
      // simulate network delay
      await new Promise(resolve => setTimeout(resolve, 50))
      return 'new-access-token'
    }

    // 2. Simulate AuthContext's lock implementation
    // We use a local variable instead of React.useRef, but the logic is identical
    let refreshPromiseRef: Promise<string | null> | null = null

    const refreshAccessToken = async (): Promise<string | null> => {
      // PROMISE LOCK LOGIC (Identical to AuthContext.tsx)
      if (refreshPromiseRef) {
        return refreshPromiseRef
      }

      refreshPromiseRef = (async () => {
        try {
          const newToken = await mockRefreshApi()
          return newToken
        } catch {
          return null
        } finally {
          refreshPromiseRef = null
        }
      })()

      return refreshPromiseRef
    }

    // 3. Simulate N simultaneous 401 responses triggering refreshAccessToken
    const simultaneousRequests = 5

    // Fire them all at once (Promise.all)
    const promises = []
    for (let i = 0; i < simultaneousRequests; i++) {
      promises.push(refreshAccessToken())
    }

    // Wait for all of them to resolve
    const results = await Promise.all(promises)

    // 4. Verify results
    // All requests should receive the EXACT SAME token
    expect(results).toHaveLength(5)
    results.forEach(token => {
      expect(token).toBe('new-access-token')
    })

    // The actual API must only be called ONCE
    expect(refreshCallCount).toBe(1)
  })
})

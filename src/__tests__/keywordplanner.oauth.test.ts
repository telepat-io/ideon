import { resolveGadsOAuthRedirect } from '../integrations/keywordplanner/oauth.js';

describe('resolveGadsOAuthRedirect', () => {
  it('uses localhost callback when redirect URL is unset', () => {
    expect(resolveGadsOAuthRedirect(undefined)).toEqual({
      redirectUri: 'http://localhost:9876/callback',
      redirectPath: '/callback',
      listenPort: 9876,
    });
  });

  it('honors a custom listen port for desktop OAuth', () => {
    expect(resolveGadsOAuthRedirect(undefined, 9878)).toEqual({
      redirectUri: 'http://localhost:9878/callback',
      redirectPath: '/callback',
      listenPort: 9878,
    });
  });

  it('uses configured public redirect URL for Web OAuth', () => {
    expect(resolveGadsOAuthRedirect('https://ideon.telepat.dev/callback')).toEqual({
      redirectUri: 'https://ideon.telepat.dev/callback',
      redirectPath: '/callback',
      listenPort: 9876,
    });
  });

  it('defaults redirect path to /callback when configured URL has no path', () => {
    expect(resolveGadsOAuthRedirect('https://ideon.telepat.dev')).toEqual({
      redirectUri: 'https://ideon.telepat.dev',
      redirectPath: '/callback',
      listenPort: 9876,
    });
  });

  it('trims whitespace from configured redirect URL', () => {
    expect(resolveGadsOAuthRedirect('  http://ideon.localhost:8080/callback  ')).toEqual({
      redirectUri: 'http://ideon.localhost:8080/callback',
      redirectPath: '/callback',
      listenPort: 9876,
    });
  });
});

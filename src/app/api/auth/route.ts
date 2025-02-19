import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/services/external/auth-service';

if (!process.env.AUTH_API_URL) {
  throw new Error('AUTH_API_URL environment variable is not set');
}

const authService = new AuthService({
  endpoint: process.env.AUTH_API_URL || '' // Provide empty string as fallback
});

export async function POST(request: Request) {
  try {
    let username, password;
    const contentType = request.headers.get('content-type');

    // Handle both JSON and form-urlencoded data
    if (contentType?.includes('application/json')) {
      const body = await request.json();
      username = body.username;
      password = body.password;
    } else if (contentType?.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      username = formData.get('username');
      password = formData.get('password');
    }

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    try {
      await authService.initialize();
    } catch (error) {
      console.error('Auth service initialization error:', error);
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 503 }
      );
    }

    // Authenticate user
    try {
      const authResponse = await authService.authenticate({
        type: 'login',
        credentials: { username, password }
      });

      if (!authResponse.token || !authResponse.refreshToken || !authResponse.user) {
        return NextResponse.json(
          { error: 'Invalid credentials' },
          { status: 401 }
        );
      }

      // Set auth token cookie
      cookies().set('auth-token', authResponse.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: authResponse.expiresIn ? authResponse.expiresIn : 30 * 60 // 30 minutes default
      });

      // Set refresh token cookie with longer expiry
      cookies().set('refresh-token', authResponse.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: 7 * 24 * 60 * 60 // 7 days
      });

      // Return response in NextAuth expected format
      return NextResponse.json({
        token: authResponse.token,
        refreshToken: authResponse.refreshToken,
        user: {
          id: authResponse.user.id,
          username: authResponse.user.username,
          email: authResponse.user.email
        }
      });
    } catch (error) {
      console.error('Authentication error:', error);
      return NextResponse.json(
        { error: 'Authentication failed' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const token = cookies().get('auth-token')?.value;
    const refreshToken = cookies().get('refresh-token')?.value;

    if (!token && !refreshToken) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    try {
      await authService.initialize();
    } catch (error) {
      console.error('Auth service initialization error:', error);
      return NextResponse.json(
        { error: 'Authentication service unavailable' },
        { status: 503 }
      );
    }

    try {
      // Try to refresh the token
      const authResponse = await authService.authenticate({
        type: 'refresh',
        credentials: { token: refreshToken || token || '' }
      });

      // If token refresh was successful, update both cookies
      if (authResponse.token) {
        cookies().set('auth-token', authResponse.token, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: authResponse.expiresIn ? authResponse.expiresIn : 30 * 60 // 30 minutes default
        });
      }

      if (authResponse.refreshToken) {
        cookies().set('refresh-token', authResponse.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          path: '/',
          maxAge: 7 * 24 * 60 * 60 // 7 days
        });
      }

      const currentUser = authService.getCurrentUser();
      if (!currentUser) {
        cookies().delete('auth-token');
        cookies().delete('refresh-token');
        return NextResponse.json(
          { error: 'Session invalid' },
          { status: 401 }
        );
      }

      return NextResponse.json({
        user: currentUser
      });
    } catch (error) {
      // If token refresh fails, clear both cookies
      cookies().delete('auth-token');
      cookies().delete('refresh-token');
      console.error('Token refresh error:', error);
      return NextResponse.json(
        { error: 'Session expired' },
        { status: 401 }
      );
    }
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

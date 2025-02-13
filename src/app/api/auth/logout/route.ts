import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { AuthService } from '@/services/external/auth-service';

export async function POST() {
  try {
    // Initialize auth service
    const authService = new AuthService({
      endpoint: process.env.AUTH_API_URL
    });

    try {
      await authService.initialize();

      // Get the current token
      const token = cookies().get('auth-token')?.value;

      if (token) {
        // Notify auth service about logout
        await authService.authenticate({
          type: 'logout',
          credentials: { token }
        });
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Continue with cookie cleanup even if auth service fails
    }

    // Clear the auth cookie
    cookies().delete('auth-token');

    return NextResponse.json({
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Server error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

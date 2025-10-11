import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const state = searchParams.get('state'); // user_id
    const code = searchParams.get('code');
    const error = searchParams.get('error');

    // If there's an OAuth error, redirect to frontend with error
    if (error) {
      console.error('OAuth error:', error);
      return NextResponse.redirect(
        new URL(`/?calendar_error=${error}`, request.url)
      );
    }

    // If no code, something went wrong
    if (!code || !state) {
      console.error('Missing code or state in OAuth callback');
      return NextResponse.redirect(
        new URL('/?calendar_error=missing_parameters', request.url)
      );
    }

    // Forward the request to the backend OAuth callback
    const backendUrl = `http://localhost:8000/api/calendar/oauth2callback?state=${state}&code=${encodeURIComponent(code)}`;
    
    console.log('Processing OAuth callback, forwarding to backend:', backendUrl);
    
    try {
      const response = await fetch(backendUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'GlobeSync-Frontend/1.0'
        },
        redirect: 'manual' // Don't follow redirects automatically
      });

      console.log('Backend response status:', response.status);
      
      // Backend should return a success response or redirect
      if (response.status >= 300 && response.status < 400) {
        // It's a redirect response, get the location
        const location = response.headers.get('location');
        if (location && location.includes('calendar_connected=true')) {
          return NextResponse.redirect(
            new URL('/?calendar_connected=true', request.url)
          );
        } else if (location && location.includes('calendar_error=')) {
          const errorMatch = location.match(/calendar_error=([^&]+)/);
          const error = errorMatch ? errorMatch[1] : 'unknown_error';
          return NextResponse.redirect(
            new URL(`/?calendar_error=${error}`, request.url)
          );
        }
      } else if (response.ok) {
        // Success response
        return NextResponse.redirect(
          new URL('/?calendar_connected=true', request.url)
        );
      } else {
        // Error response
        const errorText = await response.text().catch(() => 'backend_error');
        console.error('Backend calendar callback failed:', response.status, errorText);
        return NextResponse.redirect(
          new URL(`/?calendar_error=backend_error_${response.status}`, request.url)
        );
      }
    } catch (fetchError) {
      console.error('Error calling backend:', fetchError);
      return NextResponse.redirect(
        new URL('/?calendar_error=backend_connection_failed', request.url)
      );
    }

    // Fallback redirect
    return NextResponse.redirect(
      new URL('/?calendar_error=unexpected_response', request.url)
    );

  } catch (error) {
    console.error('Calendar OAuth callback error:', error);
    return NextResponse.redirect(
      new URL('/?calendar_error=callback_processing_failed', request.url)
    );
  }
}
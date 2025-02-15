import { createDailyRoom } from '@/services/daily'
import type { ActionResponse } from '@/types/actions'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const result = await createDailyRoom(body)

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create room'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

export async function DELETE(request: Request) {
  const url = new URL(request.url)
  const name = url.searchParams.get('name')

  if (!name) {
    return new Response(JSON.stringify({
      success: false,
      error: 'Room name is required'
    }), {
      status: 400,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }

  try {
    const apiKey = process.env.NEXT_PUBLIC_DAILY_API_KEY
    const response = await fetch(`https://api.daily.co/v1/rooms/${name}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      const error = await response.json()
      return new Response(JSON.stringify({
        success: false,
        error: `Failed to delete room: ${error.message || 'Unknown error'}`
      }), {
        status: response.status,
        headers: {
          'Content-Type': 'application/json'
        }
      })
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  } catch (error) {
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete room'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    })
  }
}

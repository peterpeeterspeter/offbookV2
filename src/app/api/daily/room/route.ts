import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const apiKey = process.env.NEXT_PUBLIC_DAILY_API_KEY
    const domain = process.env.NEXT_PUBLIC_DAILY_DOMAIN

    if (!apiKey || !domain) {
      return NextResponse.json({
        success: false,
        error: 'Missing Daily.co configuration'
      }, { status: 500 })
    }

    const response = await fetch(`https://api.daily.co/v1/rooms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        ...body,
        properties: {
          ...body.properties,
          enable_chat: true,
          enable_knocking: false,
          enable_screenshare: true,
          enable_recording: 'cloud'
        }
      })
    })

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating Daily.co room:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to create room'
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const name = searchParams.get('name')

    if (!name) {
      return NextResponse.json({
        success: false,
        error: 'Room name is required'
      }, { status: 400 })
    }

    const apiKey = process.env.NEXT_PUBLIC_DAILY_API_KEY
    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'Missing Daily.co configuration'
      }, { status: 500 })
    }

    const response = await fetch(`https://api.daily.co/v1/rooms/${name}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      }
    })

    if (!response.ok) {
      throw new Error(`Failed to delete room: ${response.statusText}`)
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting Daily.co room:', error)
    return NextResponse.json({
      success: false,
      error: 'Failed to delete room'
    }, { status: 500 })
  }
}

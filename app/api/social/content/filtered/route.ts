import { NextRequest, NextResponse } from 'next/server'
import { getFilteredContent } from '@/lib/tapestry'

export async function GET(request: NextRequest) {
  try {
    const filterField = request.nextUrl.searchParams.get('filterField') || undefined
    const filterValue = request.nextUrl.searchParams.get('filterValue') || undefined
    const orderByField = request.nextUrl.searchParams.get('orderByField') || undefined
    const orderDirection = (request.nextUrl.searchParams.get('orderDirection') as 'asc' | 'desc') || undefined
    const page = request.nextUrl.searchParams.get('page') ? parseInt(request.nextUrl.searchParams.get('page')!) : undefined
    const pageSize = request.nextUrl.searchParams.get('pageSize') ? parseInt(request.nextUrl.searchParams.get('pageSize')!) : undefined

    const contents = await getFilteredContent({
      filterField, filterValue, orderByField, orderDirection, page, pageSize,
    })
    return NextResponse.json({ contents })
  } catch (error) {
    console.error('Filtered content error:', error)
    return NextResponse.json({ contents: [] })
  }
}

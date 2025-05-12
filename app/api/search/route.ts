import { NextResponse } from 'next/server';
import { searchPDFs } from '../../services/google-search';
import { createClient } from '@/supabase/server';

export async function POST(request: Request) {
  try {
    const { query, grade } = await request.json();
    const supabase = await createClient();

    await supabase
      .from('search_history')
      .insert({ query, filter: grade ? grade : 'ALL', relevancy_calculated: false })
      .select();

    const results = await searchPDFs(query, grade);

    return NextResponse.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json({ error: 'Failed to perform search' },{ status: 500 });
  }
} 

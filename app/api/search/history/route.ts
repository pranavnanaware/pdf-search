import { createClient } from '../../../../supabase/server';
import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const supabase = await createClient();
    
    // First get the most recent unique queries
    const { data, error } = await supabase
      .from('search_history')
      .select('query, filter')
      .order('created_at', { ascending: false })
      .limit(20)
    

    if (error) throw error;

    
    console.log("UNIQUE QUERIES", data);

    return NextResponse.json(data);
  } catch (error) {
    console.error('Error fetching search history:', error);
    return NextResponse.json({ error: 'Failed to fetch search history' }, { status: 500 });
  }
} 
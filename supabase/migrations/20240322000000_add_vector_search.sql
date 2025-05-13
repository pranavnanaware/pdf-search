-- Enable the vector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create documents table
CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  url TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create chunks table
CREATE TABLE IF NOT EXISTS chunks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  text TEXT NOT NULL,
  embedding vector(1536),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  query TEXT NOT NULL,
  filter TEXT NOT NULL,
  relevancy_calculated BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Create an ivfflat index for fast similarity search
CREATE INDEX IF NOT EXISTS chunks_embedding_idx ON chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS documents_url_idx ON documents(url);
CREATE INDEX IF NOT EXISTS chunks_document_id_idx ON chunks(document_id);
CREATE INDEX IF NOT EXISTS search_history_query_idx ON search_history(query);

-- Enable Row Level Security
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE search_history ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow public read access to documents"
ON documents FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public read access to chunks"
ON chunks FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow public read access to search history"
ON search_history FOR SELECT
TO public
USING (true);

CREATE POLICY "Allow insert to search history"
ON search_history FOR INSERT
TO public
WITH CHECK (true);

-- Create a function to match chunks
CREATE OR REPLACE FUNCTION match_chunks(
  p_query_embedding vector(1536),
  p_document_id UUID,
  p_match_count int
)
RETURNS TABLE (
  id UUID,
  document_id UUID,
  page_number INTEGER,
  text TEXT,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    chunks.id,
    chunks.document_id,
    chunks.page_number,
    chunks.text,
    1 - (chunks.embedding <=> p_query_embedding) as similarity
  FROM chunks
  WHERE chunks.document_id = p_document_id
  ORDER BY chunks.embedding <=> p_query_embedding
  LIMIT p_match_count;
END;
$$; 
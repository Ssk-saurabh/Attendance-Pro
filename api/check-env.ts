export default function handler(req: any, res: any) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', ['GET']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const geminiConfigured = !!(process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY);
  const supabaseConfigured = !!(
    (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL) &&
    (process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY)
  );

  return res.status(200).json({
    geminiConfigured,
    supabaseConfigured,
  });
}

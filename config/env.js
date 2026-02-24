import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: Number(process.env.PORT || 3001),
  googleApiKey: process.env.GOOGLE_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-3-flash-preview',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseAnonKey: process.env.SUPABASE_ANON_KEY || '',
};

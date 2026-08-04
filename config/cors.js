// Permite apenas deploys (produção e previews) do próprio projeto na Vercel,
// em vez de qualquer *.vercel.app — evita que um app de terceiros hospedado
// na Vercel passe pelo CORS com credentials: true.
const OWN_VERCEL_PROJECT_ORIGIN = /^https:\/\/oraculo-front-2-0[a-z0-9-]*\.vercel\.app$/i;

const extraAllowedOrigins = (process.env.CORS_EXTRA_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

export const corsOptions = {
  origin: (origin, callback) => {
    // Permite chamadas locais, Postman ou mobile (sem origin)
    if (!origin) return callback(null, true);

    const allowedOrigins = [
      'http://localhost:5173',
      'http://localhost:3000',
      'https://oraculo-front-2-0.vercel.app', // O seu link exato
      ...extraAllowedOrigins,
    ];

    if (allowedOrigins.includes(origin) || OWN_VERCEL_PROJECT_ORIGIN.test(origin)) {
      return callback(null, true);
    }

    console.log('Bloqueado pelo CORS:', origin);
    return callback(new Error('Bloqueado pelo CORS'));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
  optionsSuccessStatus: 200
};

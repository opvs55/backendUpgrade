import { GoogleGenerativeAI } from '@google/generative-ai';
import { env } from './env.js';

export const geminiModelName = env.geminiModel;

export const genAI = env.googleApiKey ? new GoogleGenerativeAI(env.googleApiKey) : null;

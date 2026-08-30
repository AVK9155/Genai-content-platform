// Vercel Serverless Function — wraps the Express app
// This file bridges Vercel's serverless runtime with our Express server

const path = require('path');

// Load env vars (Vercel injects them automatically in production)
require('dotenv').config({ path: path.join(__dirname, '../backend-genai/.env') });

// Import the compiled Express app
const app = require('../backend-genai/dist/index').default;

module.exports = app;

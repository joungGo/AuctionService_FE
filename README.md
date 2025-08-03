# Auction Service Frontend

This is a [Next.js](https://nextjs.org) project for an auction service.

## Environment Setup

### Backend Server Configuration

- **Development**: `http://localhost:8080/api`
- **Production**: `https://bidflow.cloud/api` (via Next.js API proxy)

### Mixed Content Issue Fix

This project automatically detects the environment and uses appropriate API URLs:

- **Development**: Direct API calls to `http://localhost:8080/api`
- **Production (HTTPS)**: Uses Next.js API proxy (`/api/proxy/*`) to avoid Mixed Content issues

### Next.js API Proxy

In production, all API calls are routed through `/api/proxy/[...path]` to resolve Mixed Content issues when calling HTTP backend from HTTPS frontend.

Example:
- Client calls: `https://auction-service-fe.vercel.app/api/proxy/auth/login`
- Proxy forwards to: `https://bidflow.cloud/api/auth/login`

### Environment Variables

You can override the default URLs by setting environment variables:

```bash
# API Base URL (overrides automatic detection)
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api

# WebSocket URL  
NEXT_PUBLIC_WS_URL=https://your-api-domain.com/ws

# Backend URL for API proxy (server-side only)
BACKEND_URL=https://your-backend-domain.com
```

**Note**: 
- Environment variables must be prefixed with `NEXT_PUBLIC_` to be available in the browser
- `BACKEND_URL` is used server-side only and should be set in Vercel environment variables

### Vercel Environment Variables Setup

For production deployment on Vercel, set these environment variables:

1. Go to your Vercel project dashboard
2. Navigate to Settings → Environment Variables
3. Add the following variables:
   - `BACKEND_URL`: Your actual backend server URL (e.g., `https://your-backend-domain.com`)
   - `NEXT_PUBLIC_API_URL`: Your API base URL (e.g., `https://your-backend-domain.com/api`)
   - `NEXT_PUBLIC_WS_URL`: Your WebSocket URL (e.g., `wss://your-backend-domain.com/ws`)

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

## API Configuration

The application uses a centralized configuration system located in `src/lib/config.ts`:

- `getApiBaseUrl()`: Returns the appropriate API base URL based on environment
- `getWsUrl()`: Returns the appropriate WebSocket URL based on environment
- `API_ENDPOINTS`: Centralized API endpoint definitions

## Mixed Content Security

Modern browsers block Mixed Content (HTTP requests from HTTPS pages) for security reasons. This project solves this by:

1. **Automatic Environment Detection**: Detects if the page is served over HTTPS
2. **Next.js API Proxy**: Uses server-side proxy in production to avoid Mixed Content issues
3. **Environment Variable Support**: Allows custom API URLs via environment variables

**Production Architecture:**
```
HTTPS Client → Next.js API Proxy → HTTPS Backend (bidflow.cloud)
```

## WebSocket Limitations

⚠️ **WebSocket Mixed Content Issue**: WebSocket connections from HTTPS to HTTP may still be blocked by browsers. Consider:

1. Setting up HTTPS on the backend server (recommended)
2. Using a reverse proxy with SSL termination
3. Implementing WebSocket over HTTPS (WSS)

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

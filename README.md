# Auction Service Frontend

This is a [Next.js](https://nextjs.org) project for an auction service.

## Environment Setup

### Mixed Content Issue Fix

This project automatically detects the environment and uses appropriate API URLs:

- **Development**: Uses `http://localhost:8080/api` for API calls
- **Production (HTTPS)**: Uses `https://auction-service-fe.vercel.app:8080/api` for API calls

### Environment Variables

You can override the default API URLs by setting environment variables:

Create a `.env.local` file in the root directory:

```bash
# API Base URL
NEXT_PUBLIC_API_URL=https://your-api-domain.com/api

# WebSocket URL  
NEXT_PUBLIC_WS_URL=https://your-api-domain.com/ws
```

**Note**: Environment variables must be prefixed with `NEXT_PUBLIC_` to be available in the browser.

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
2. **Dynamic URL Selection**: Uses HTTPS API URLs in production and HTTP URLs in development
3. **Environment Variable Support**: Allows custom API URLs via environment variables

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

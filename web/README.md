This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Customer profile and logout

After signing in as a customer, open `/booking` and select the avatar in the right panel. The profile dialog reads the signed-in customer's name, email and phone from the authenticated `/auth/me` endpoint. Missing phone numbers display as "Not provided". Escape, the close button or the backdrop closes the dialog.

Logout is available in the sidebar and profile dialog. It signs out the current Supabase browser session, clears the displayed account and replaces the current page with `/login`. Failed logout requests show a retry message. Check that reloading `/booking` or returning with the browser Back button requires signing in again.

Run `npm run test:auth` for the isolated authentication tests, including late profile responses, queued auth callbacks, repeated logout clicks and logout failure/retry.

## Getting Started

First, run the development server:

Install dependencies in both `../server` and this directory first. The `predev`
and `prebuild` scripts compile the shared backend. Next serves its HTTP routes
at `/api/v1/*` in the same process as the frontend; a separate API process is
not needed for the web app. Local API configuration is read from `server/.env`.
Re-run `npm run dev` after changing shared backend code.

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

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

Use `web` as the project Root Directory and enable source files outside the
root directory. The included `vercel.json` installs both packages before the
build. Configure `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and the public `APP_URL` in
Vercel; configure `DATABASE_URL` for business modules. Requests use `/api/v1`
on the site's origin, so `NEXT_PUBLIC_API_URL` is no longer used by the web app.
Check `/api/v1/health` after deploying. See the repository README for callback
configuration and the scope of the HTTP deployment.

To test the built HTTP integration, run `npm run build`, start it with
`npm start -- -p 3101`, then run `npm run test:api` in a second terminal. This
checks same-origin API routing, JSON parsing and limits, and auth guards without
creating accounts. `SWIFTDROP_TEST_ORIGIN` can select another test origin.

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

# Feature Ticket 20: Add OG Graph to UI using Helmet

## Description

I need you add helmet and programatically handle open graph meta tags injection in the client add for these routes

<meta property="og:title" content="Support - German Emirates Club" />
<meta property="og:description" content="Get support from the German Emirates Club team." />
<meta property="og:image" content="https://services.german-emirates-club.com/uploads/background.webp" />
<meta property="og:url" content="https://services.german-emirates-club.com/support" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://services.german-emirates-club.com/uploads/background.webp" />



<meta property="og:title" content="Membership - German Emirates Club" />
<meta property="og:description" content="Join the German Emirates Club and become a member today." />
<meta property="og:image" content="https://services.german-emirates-club.com/uploads/background.webp" />
<meta property="og:url" content="https://services.german-emirates-club.com/membership" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://services.german-emirates-club.com/uploads/background.webp" />

<meta property="og:title" content="Partner Onboarding - German Emirates Club" />
<meta property="og:description" content="Become a partner of the German Emirates Club. Start your onboarding here." />
<meta property="og:image" content="https://services.german-emirates-club.com/images/partner-preview.jpg" />
<meta property="og:url" content="https://services.german-emirates-club.com/partner-onboarding" />
<meta property="og:type" content="website" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://services.german-emirates-club.com/uploads/background.webp" />

## Implementation

Uses `react-helmet-async` (installed with `--legacy-peer-deps` — its peer range
caps at React 18 but it runs fine on this React 19 app). `@emotion/react` and
`@emotion/styled` were also added as explicit `public` dependencies (MUI requires
them; they were previously only orphaned installs).

* **`main.jsx`** — wrapped the app tree in `<HelmetProvider>`.
* **`components/Seo.jsx`** — new reusable component that renders the OG/Twitter
  tags inside `<Helmet>`. Props: `title`, `description`, `url`, plus optional
  `image` (defaults to the `background.webp` URL), `type` (`website`),
  `twitterCard` (`summary_large_image`) and `twitterImage` (defaults to `image`).
* **`pages/SupportPortal.jsx`** (`/support`) — renders `<Seo>` in both the form
  and the post-submit confirmation branches.
* **`pages/PurchaseMemberShip.jsx`** (`/membership`) — renders `<Seo>`.
* **`PartnerOnboarding/PartnerOnboarding.tsx`** (`/partner-onboarding`) — renders
  `<Seo>` with the distinct `og:image` (`partner-preview.jpg`); `twitter:image`
  stays `background.webp` per the ticket.

### Caveat (important)

These tags are injected **client-side**, so social / link-preview crawlers
(Facebook, X/Twitter, LinkedIn, WhatsApp) — which do not execute JavaScript —
will **not** see them. For real link previews the tags must be present in the
server's initial HTML (server-side injection per route, or SSR/prerendering).


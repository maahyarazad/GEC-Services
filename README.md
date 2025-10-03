# Services-GEC
New features & major additions

Add G Sheet parser cron job — import and filter (duplicates/empty card numbers) every 6 hours. (Add G Sheet parser cron job, f179230)

Add Google Pass to registration — Google Wallet pass integration. (8bee36f)

Add Apple Wallet PKPass endpoints & use in events — generate and email .pkpass files. (071bf32, 74899d7, 0701c1)

Add WebSocket support — server-side WebSocket + admin query param UI updates. (5262167)

Implement scheduling registration with payment — scheduling UI + back-end scheduling registration. (5a8f3de)

Implement Payment service and Payment UI — payment integration, status in admin panel. (65a0d54)

Add server-side PDF generator — invoices, server-side PDF generation improvements. (36fb8af, a46c4a5, 4146d88, 600c88b)

Member CRUD & admin UI — full member management in admin panel. (5ca58da)

OTP flow — OTP control, resend logic and email message updates (5f59bb2, 573ad4e, ab75a3b, 5ff4e8a).

Whatsapp integration — templates, send endpoints and UI. (f36573c, 2969a2e references)

Email service & QR code generator — email templates, QR attachments, Apple/Google wallet links. (128356b, 07ec7f7, 4ffef04, eb2f1fe)

UI / UX improvements

Admin panel UI updates — many refinements, new components, improved DataGrid sorting and filtering. (882aa15, 9247d40, 4f2c47c, 9cc7e0d)

Improve registration UI — stepper, floating labels, survey form support, responsive fixes. (0042089, f4f40f1, 5f4f2da, 5f59bb2)

Add registration config editor — editing templates and using a rich text editor (Quill). (eaaf6fb, 72cccc8)

Add event time & location UI — event location name, map, and QR integration. (b7b4cef, 6f653c4)

Mobile view & style fixes — many small fixes, topbar issue, snackbar, layout fixes. (f36573c, 67c6432, b421321)

Backend & server fixes

Fix CORS and mapbox issues — Mapbox CORS fixes and adjustments for correct behavior. (e818dfb)

Rate limiter and security — add rate limiter and protect admin endpoints. (9cc7e0d, bf84699)

Database schema updates and SQL improvements — create table updates, pagination, safe write. (2031fd1, f4be90c, d3ddcd0)

Use UTC and dayjs improvements — scheduling and timezone handling. (6ea70cd, 1c17f03, 3d90f99)

Use number values for scheduling — type fixes on scheduling fields. (52ba9f2)

Features around export / files

CSV & download features — CSV download for survey and admin exports. (0885a42, 4fcbc62)

Add video support & file validation — file type validation and event file download functions. (6f152c4, 6f653c4)

Add apple & google pass endpoints — endpoints for wallet passes; email/attachment fixes. (9906b37, fcea573, 74899d7)

Bug fixes & polishing (selected)

Multiple fixes for UI bugs, responsiveness, template logic, and validation. (many commits: 07753bc, 3627944, 8bee36f, 7a68218, 3af848f, c1e6c0, etc.)

Fix editing custom WhatsApp templates. (2c72437)

Fix red card check in endpoints, login/optional-login related fixes. (1afecd6, 92eae75)

Remove debuggers and console logs across the codebase. (36e5efd, e483057)

Fix issues in scheduling timing (4-hour delay fix). (439abfe)

Improve QR code & email reliability. (713aca5)

Build / misc

NPM build fixes, dependency lock updates and cleanup. (2969a2e, eff3545)
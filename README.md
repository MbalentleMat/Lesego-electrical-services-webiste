# Lesego Electrical Services — Professional HTML Website

Responsive HTML5/CSS3/vanilla JavaScript website based on the supplied Lesego prototype. Includes a functional **browser-only demonstration** of customer, electrician and administrator workflows.

## Getting started

Open `index.html` in a browser, or serve the folder with VS Code Live Server / `python -m http.server 8000`. The website uses a Google Fonts CDN for typography; system fonts are used if offline.

## Pages

Home, Services, About, Electricians, Booking, Contact, Support/FAQ, Careers, Privacy, Terms, Login, Register, role-based Dashboard, Booking Detail.

## Demonstration workflows

- Customer: create bookings, view status, review quotations, request changes, send messages once assigned, submit reviews for completed jobs, edit display name.
- Administrator: view all bookings, assign demo electrician, detect simple appointment conflicts, update statuses, create quotations, approve/decline change requests, see enquiries and reviews.
- Electrician: see assigned bookings, start/complete jobs, exchange booking messages, view reviews.
- General: responsive navigation, accessible forms, input validation, help content, contact enquiries and careers interest form.

Click **Sign in**, then select **Customer**, **Electrician** or **Administrator**. Seed data contains two illustrative bookings. Browser `localStorage` saves demo records; `sessionStorage` saves the selected role. Reset records under Dashboard → Settings.

## CRITICAL: demo, not production

This website does **not** connect to Firebase or the Android application's data. The demonstration roles have **no real authentication**; browser data is not secure or shared across devices. Never use it to collect real personal data, handle live appointments, process payments or grant administrative access. All demo account emails, prices and service details are fictitious.

To deploy a real service, integrate Firebase Auth and Firestore using the **same verified schema as the Android app**. Enforce role and ownership permissions in Firestore security rules (never rely on client-side role checks), and test all workflows end-to-end. Add verified contact details, service area, policies, consent/privacy (including POPIA), proper operational availability, and actual email/notification handling. Securely assign privileged roles server-side. Do not put Firebase Admin service-account keys or signing keys in frontend code.

## WIL evidence checklist

- Capture screenshots of each page and all three demo dashboards.
- Document requirements and completed vs pending work in Azure Boards.
- Keep GitHub commits and release notes.
- Add automated tests and CI; verify Android app integration separately.
- Demonstrate real website + Android app on physical device only after production integration is complete.

## Files

`index.html` — page shell; `assets/style.css` — responsive styles; `assets/app.js` — router, forms and demo workflows; `docs/FEATURES.md` — acceptance checklist.

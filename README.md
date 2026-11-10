# Glitchwayve — Simple Reference Version

This is a simplified version of the Glitchwayve CIIT student dashboard. It is designed to be easier to study and recreate as a beginner.

## Project structure

```text
glitchwayve/
│
├── index.html                 Website structure
├── style.css                  All visual styling and responsive layout
├── script.js                  All JavaScript, pages, events and Supabase calls
│
└── supabase/
    └── schema.sql             Database tables, permissions and RLS policies
```

There are no JavaScript folders, separate API files, frameworks, npm packages, build tools, or sample/seed data. The project uses one Supabase project and one Supabase database.

## 1. Run the website

1. Extract the project ZIP.
2. Open the `glitchwayve` folder in Visual Studio Code.
3. Open `index.html` with the Live Server extension.
4. Keep an internet connection while using the website because Supabase JS, Lucide icons and the Inter font load from CDNs.

You do not need `npm install`, a terminal build command, React, or a local backend server.

## 2. Connect your Supabase project

### Step A — Create your Supabase project

Create one **new/empty** project at [supabase.com](https://supabase.com/). This one project provides the authentication service and PostgreSQL database. This simple schema is not a migration script for the older Glitchwayve schema. If you already ran the older project schema in a Supabase project, use a fresh project or plan a careful migration instead of running this file over the old tables.

### Step B — Create the database tables

1. Open the Supabase project.
2. Open **SQL Editor**.
3. Create a new query.
4. Copy all contents of `supabase/schema.sql` into the editor.
5. Run the query.

The schema creates empty tables. It contains no `INSERT` statements and does not create fictional student, service, room, office, announcement or equipment records.

### Step C — Add the two building records

Open **Table Editor → buildings → Insert row** and add the real building records using these keys:

| building_key | name |
|---|---|
| `interweave` | CIIT Interweave |
| `glitch` | CIIT Glitch |

These building keys must match the two values already used by the building switch in `script.js`.

### Step D — Add verified school information

Use **Table Editor** to add approved/verified information. Add the building record before adding its floors, rooms, services, offices or equipment because those tables refer to a building.

The service categories used by the page navigation are:

| Page in the dashboard | Value to enter in `services.category` |
|---|---|
| Academics & Formation | `Academics & Formation` |
| Requests | `Requests` |
| Careers | `Careers` |
| Student Life | `Student Life` |
| Health & Wellness | `Health & Wellness` |
| Support | `Support` |

Other important tables:

- `floors`: floor number and floor label for a building.
- `rooms`: the `floor_id` must match the ID of a row in `floors`.
- `services`: one service row for each building where that service is available. Add location, hours, requirements and an optional Lucide icon name.
- `offices`: office name, purpose, location, hours, what to bring and contact email.
- `announcements`: set `building_key` to `interweave` or `glitch`. Leave it `NULL` only when an announcement applies to both buildings.
- `documents`: set `category` to `Handbook` for records shown in College Handbook. Add an HTTPS document URL when a file is available.
- `equipment`: add the equipment for the building where it is located.

Only add information that your group has permission to publish. The dashboard intentionally shows empty states until records are added.

### Step E — Create a test student account

The login page uses Supabase Auth. It does not include public registration.

1. Open **Authentication → Users** in Supabase.
2. Create a test account that uses a CIIT-format email address ending in `@ciit.edu.ph`.
3. Set/confirm its password in Supabase.
4. Use this account on the Glitchwayve login page.

Use an institution-approved test account. Do not ask classmates to type their real passwords into an unapproved class prototype. The `@ciit.edu.ph` check in JavaScript is a user-interface check; the app's account access is controlled by Supabase Auth and your Supabase project settings.

### Step F — Add the Supabase URL and publishable key

1. In Supabase, open the project's **Connect** dialog or **Settings → API Keys**.
2. Copy the project URL.
3. Copy the **publishable key**.
4. Open `script.js` and replace the two values at the very top:

```javascript
const SUPABASE_URL = "YOUR_SUPABASE_PROJECT_URL";
const SUPABASE_PUBLISHABLE_KEY = "YOUR_SUPABASE_PUBLISHABLE_KEY";
```

Do not put a Supabase secret key or `service_role` key in `script.js`. Browser code is visible to everyone. Row Level Security protects the data that the browser can access.

## 3. How the code works

The same JavaScript file handles the complete connection:

```text
Student clicks a button or submits a form
                 ↓
         handleClick() / handleFormSubmit()
                 ↓
        Page or form function runs
                 ↓
        Database function runs
                 ↓
        Supabase reads or saves a row
                 ↓
        Page is rendered again with the result
```

Example — a student submits a request:

```text
Service card
  → data-action="start-request"
  → handleClick()
  → openRequestDialog()
  → student submits requestForm
  → handleFormSubmit()
  → submitRequestForm()
  → createRequest()
  → Supabase requests table
  → navigateTo("pulse")
  → renderPulsePage()
```

The database functions are in `script.js` under **4. SUPABASE DATABASE FUNCTIONS**. They are not in a separate API folder.

For the explanation of every named JavaScript function, read `FUNCTION_GUIDE.md`. The same purpose/connection notes are also written immediately above each function in `script.js`.

## 4. Main features included in this simpler version

- Supabase email/password sign-in and sign-out.
- Interweave / Glitch Tower switch; the current section is kept when switching.
- Desktop sidebar and mobile bottom navigation.
- Home page with real announcements and counts from the signed-in student's records.
- Dismiss and restore announcement controls.
- Search across both buildings for services, rooms and offices.
- Database-fed service cards for Academics, Requests, Careers, Student Life, Health & Wellness and Support.
- Floor and room directory.
- School office directory and copy-email action.
- College Handbook page using database document links.
- Service request submission.
- Room booking request submission.
- Appointment request submission.
- PULSE list of the signed-in student's own requests, bookings, appointments and equipment records.
- Innovation Hub equipment list, borrowing requests, return action and project submission.
- Notifications and mark-as-read actions.
- Text-size and high-contrast controls.
- Reset my data, which deletes only personal rows owned by the signed-in student.
- Empty states and database error/retry states when records are missing or a query fails.

## 5. What has intentionally been simplified or is not implemented yet

This is a learning reference, not a full production replacement of the original detailed brief. The following features from the larger version still need to be developed if your instructor expects them:

- The complete field-by-field Service Request Engine, review/consent step, attachments and configurable processing requirements. The current form is a simple service request with a details field.
- Database-enforced room booking conflict prevention and live available-time suggestions. The current code validates date and time order, then saves the booking request. It does not check other students' booking rows for conflicts.
- Appointment slot availability, rescheduling and cancellation.
- Automatic simulated status progression. Current statuses remain as saved until an authorized office/admin updates them.
- Full Carehub wellness check-in, medical/vaccine file uploads and the Safety Declaration workflow. The schema includes some future personal tables, but the current screens do not use those tables yet.
- Practicum logs, events/RSVP, organization membership, market listings and facilitator test mode.
- Automatic equipment availability counting across all students. The current page shows the inventory quantity and the signed-in student's own borrow records; an office should manage the actual inventory quantity.
- Handbook conforme signing and downloadable generated copies.
- Push notifications, external service integrations and real CIIT single sign-on.

These are listed openly so you do not mistake an unfinished flow for an implemented one. Add them one at a time after understanding the simpler version.

## 6. Security notes

- The SQL schema enables Row Level Security (RLS) on every table.
- Shared tables (`buildings`, `floors`, `rooms`, `services`, `offices`, `announcements`, `documents`, `equipment`) are read-only to signed-in students through this frontend.
- Personal tables use `student_id` and policies that only allow the matching signed-in Supabase user to read or change their own rows.
- The Reset My Data function filters deletes by the current student's ID. It does not delete shared school information.
- A publishable key is intended for browser use, but it does not replace RLS. Never place a secret/service-role key in this project.

## 7. Recommended order for recreating the site yourself

1. Read `index.html` and identify the login screen, sidebar, top bar, main area and mobile navigation containers.
2. Read the first part of `style.css` and change a few CSS variables to see how the theme works.
3. In `script.js`, study the global `state` object and the small helper functions.
4. Study `renderAppShell()` and `handleRouteChange()` to understand navigation.
5. Study `renderHomePage()` to understand how Supabase data becomes HTML.
6. Study one database read function such as `getServices()`.
7. Study one complete write flow: `openRequestDialog()` → `submitRequestForm()` → `createRequest()` → `renderPulsePage()`.
8. Only after those are clear, study room booking, appointments and Innovation Hub.

## Official references

- [Supabase JavaScript client installation (CDN)](https://supabase.com/docs/reference/javascript/installing)
- [Supabase JavaScript client initialization](https://supabase.com/docs/reference/javascript/initializing)
- [Supabase API keys and publishable keys](https://supabase.com/docs/guides/getting-started/api-keys)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)

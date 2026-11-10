# Glitchwayve — Function Guide

This guide explains what each named function in `script.js` does and how it connects to the rest of the website. The same notes are written directly above every function in the JavaScript file.

**Functions documented: 81**

## How to read a function note

- **Purpose:** the job of the function.
- **Connected from:** which page, event, form or other function calls it.
- **Uses / hands off to:** the data, helper or next function it relies on.

## Main website flow

### Opening the dashboard

```text
startGlitchwayve()
  → checkExistingSession()
  → openDashboard()
  → handleRouteChange()
  → renderAppShell()
  → renderCurrentPage()
  → renderHomePage() (or the selected section)
```

### Signing in

```text
Student submits loginForm
  → handleFormSubmit()
  → signIn()
  → Supabase Auth: signInWithPassword()
  → openDashboard()
  → handleRouteChange()
```

### Switching buildings

```text
Student clicks Interweave or Glitch Tower
  → handleClick()
  → setBuilding()
  → URL hash changes
  → handleRouteChange()
  → renderAppShell() + renderCurrentPage()
```

### Submitting a service request

```text
Service card button
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

### Making a room booking request

```text
Book a room button
  → openBookingDialog()
  → getRooms()
  → student submits bookingForm
  → handleFormSubmit()
  → submitBookingForm()
  → validateBooking()
  → createBooking()
  → Supabase bookings table
  → navigateTo("pulse")
```

### Searching the dashboard

```text
Student types in globalSearchInput
  → handleInput()
  → updateSearchResults()
  → searchDatabase()
  → Supabase services, rooms and offices tables
  → matching search result buttons are rendered
```

## Function-by-function reference

### 1. Small helpers and shared display functions

| Function | Purpose | Connected from | Uses / hands off to |
|---|---|---|---|
| `getBuildingName()` | Returns the visible name of Interweave or Glitch Tower. | renderTopbar(), renderHomePage(), service and search result cards. | The current building key in state. |
| `getTodayString()` | Creates a date string used as the minimum date in date fields. | openBookingDialog(), openAppointmentDialog(), openBorrowDialog(), and form validators. | The JavaScript Date object. |
| `formatDate()` | Converts a saved date into a readable date for the student. | renderAnnouncementList(), renderHandbookPage(), renderPulsePage(), and Innovation Hub records. | A date value from Supabase. |
| `escapeHTML()` | Escapes text before placing it inside HTML so database text cannot become HTML or script code. | Most page rendering functions and dialogs. | A text value; returns a safe HTML string. |
| `safeWebUrl()` | Allows only HTTP or HTTPS document links from the database. | renderHandbookPage(). | The browser URL parser; returns an empty string for an invalid link. |
| `refreshIcons()` | Tells Lucide to draw icons inside the HTML that was just rendered. | Shared display functions and every page/dialog renderer. | The Lucide CDN script loaded in index.html. |
| `applyAccessibilitySettings()` | Applies the text-size and high-contrast preferences saved in localStorage. | startGlitchwayve(), openDashboard(), and the Settings click actions. | state.textSize, state.highContrast, and CSS variables/classes. |
| `renderPageHeader()` | Builds the repeated heading and description at the top of each page. | Home-independent page renderers such as renderServiceCategoryPage(), renderMovingPage(), and renderDirectoryPage(). | A page title, description, and optional button HTML. |
| `renderEmptyState()` | Builds a clear message when a Supabase table has no matching records. | Home, services, floors, rooms, handbook, PULSE, Innovation Hub, search, and notifications. | A title, message, and Lucide icon name. |
| `renderLoadingCards()` | Shows skeleton cards while a page waits for Supabase data. | The asynchronous page rendering functions. | A number of placeholder loading cards; no database records are created. |
| `showToast()` | Shows a temporary success or error message. | Form submission functions and the global click handler. | A message and an optional error flag. |
| `showDialog()` | Opens a reusable modal dialog and places the supplied form or content inside it. | openRequestDialog(), openBookingDialog(), openAppointmentDialog(), openProjectDialog(), openBorrowDialog(), search, notifications, profile and confirmation dialogs. | A title, description, HTML body and optional wide-dialog setting. |
| `closeDialog()` | Clears the currently open modal dialog. | The global click handler and Escape-key handler. | The dialogRoot element in index.html. |
| `showPageError()` | Displays a friendly error state when a page cannot load data. | The catch blocks in page renderers. | The error returned by Supabase or JavaScript. |

### 2. Supabase database functions

| Function | Purpose | Connected from | Uses / hands off to |
|---|---|---|---|
| `getAnnouncements()` | Reads announcements for the active building, including announcements that apply to both buildings. | renderHomePage(). | The announcements table in Supabase. |
| `getDismissedAnnouncementIds()` | Reads the announcement IDs hidden by the signed-in student. | renderHomePage(). | The dismissed_announcements table and the current user ID. |
| `getServices()` | Reads the services in one category for the active building. | renderServiceCategoryPage(), which is used by Academics, Requests, Careers, Student Life, Health and Support. | The services table, active building key and selected category. |
| `getFloors()` | Reads the floor list for the active building. | renderMovingPage(). | The floors table in Supabase. |
| `getRooms()` | Reads the rooms for the active building. | renderMovingPage() and openBookingDialog(). | The rooms table in Supabase. |
| `getOffices()` | Reads the office directory for the active building. | renderDirectoryPage(). | The offices table in Supabase. |
| `getDocuments()` | Reads handbook-category documents for the active building or all buildings. | renderHandbookPage(). | The documents table in Supabase. |
| `getMyRecords()` | Reads the signed-in student’s own requests, bookings, appointments and borrow records. | renderHomePage() and renderPulsePage(). | Personal tables protected by Row Level Security. |
| `getNotifications()` | Reads in-app notifications belonging to the signed-in student. | renderHomePage() and openNotificationsDialog(). | The notifications table in Supabase. |
| `getEquipment()` | Reads the equipment inventory for the active building. | renderInnovationPage(). | The equipment table in Supabase. |
| `getMyProjects()` | Reads the signed-in student’s project submissions. | renderInnovationPage(). | The projects table in Supabase. |
| `createRequest()` | Inserts a student request and returns the new record. | submitRequestForm(). | The requests table; Row Level Security checks student_id. |
| `createBooking()` | Inserts a room-booking request for the signed-in student. | submitBookingForm(). | The bookings table; Row Level Security checks student_id. |
| `createAppointment()` | Inserts an appointment request. | submitAppointmentForm(). | The appointments table; Row Level Security checks student_id. |
| `createProject()` | Inserts a student project or idea submission. | submitProjectForm(). | The projects table; Row Level Security checks student_id. |
| `createBorrowRecord()` | Inserts a request to borrow an equipment item. | submitBorrowForm(). | The borrow_records table; Row Level Security checks student_id. |
| `returnBorrowedItem()` | Updates the student’s borrow record to Returned and saves the return time. | The return-equipment action in handleClick(). | The borrow_records table and the current user ID. |
| `dismissAnnouncement()` | Saves that the current student dismissed an announcement. | The dismiss-announcement action in handleClick(). | The dismissed_announcements table. |
| `restoreAnnouncement()` | Deletes the current student’s dismissal record so the announcement can be seen again. | The restore-announcement action in handleClick(). | The dismissed_announcements table. |
| `markNotificationRead()` | Marks one notification as read. | The mark-notification-read action in handleClick(). | The notifications table. |
| `markAllNotificationsRead()` | Marks all unread notifications for the current student as read. | The mark-all-read action in handleClick(). | The notifications table. |
| `resetMyData()` | Deletes the current student’s rows from the personal tables listed in the function. | The reset-my-data action in handleClick(), after a confirmation dialog. | Personal tables only; shared building, service, room and office data is not deleted. |
| `searchDatabase()` | Searches service names, room numbers/names and office names across both buildings. | updateSearchResults(). | The services, rooms and offices tables. |

### 3. Login, route and app shell functions

| Function | Purpose | Connected from | Uses / hands off to |
|---|---|---|---|
| `renderLoginScreen()` | Builds the sign-in screen and shows a setup message if Supabase is not configured. | startGlitchwayve(), checkExistingSession(), signOut(), and the auth state listener. | The loginScreen element and the Supabase connection settings. |
| `checkExistingSession()` | Checks whether Supabase has already saved a signed-in session. | startGlitchwayve(). | Supabase Auth getSession(); opens the dashboard or login screen. |
| `signIn()` | Checks the CIIT email format and signs in using Supabase Auth. | handleFormSubmit() when the login form is submitted. | The login form and supabaseClient.auth.signInWithPassword(). |
| `signOut()` | Ends the current Supabase session and returns to the login screen. | The sign-out action in handleClick() and the profile dialog. | Supabase Auth signOut(). |
| `openDashboard()` | Reveals the main dashboard after a valid user session is available. | checkExistingSession() and signIn(). | The current user, the route handler and the dashboard shell. |
| `navigateTo()` | Changes the URL to the selected section so browser Back and Forward work. | Navigation buttons, quick links and form success handlers. | The current building and the section name. |
| `setBuilding()` | Changes Interweave/Glitch and keeps the current page section. | Building-switch buttons and keyboard arrow navigation. | state.building, localStorage, document data attribute and the hash router. |
| `handleRouteChange()` | Reads the URL hash, sets the building and section, and requests the correct page renderer. | The browser hashchange event and openDashboard(). | renderAppShell() and renderCurrentPage(). |
| `renderSidebar()` | Builds the desktop sidebar and marks the active navigation item. | renderAppShell(). | navigationItems and state.section/state.building. |
| `renderTopbar()` | Builds the sticky top bar, building switch, notifications and profile buttons. | renderAppShell(). | state.user and state.building. |
| `renderMobileNav()` | Builds the five-item mobile bottom navigation with Menu on the right. | renderAppShell(). | state.section. |
| `renderAppShell()` | Refreshes the sidebar, top bar and mobile navigation together. | handleRouteChange(). | renderSidebar(), renderTopbar(), renderMobileNav() and refreshIcons(). |

### 4. Page rendering functions

| Function | Purpose | Connected from | Uses / hands off to |
|---|---|---|---|
| `renderHomePage()` | Loads and displays the greeting, quick links, record counts and announcements. | renderCurrentPage() and announcement dismiss/restore actions. | getAnnouncements(), getDismissedAnnouncementIds(), getMyRecords() and getNotifications(). |
| `renderAnnouncementList()` | Converts announcement records into cards with dismiss or restore buttons. | renderHomePage(). | Announcement records and the student’s dismissed announcement IDs. |
| `renderServiceCard()` | Converts one service row from Supabase into a service card. | renderServiceCategoryPage(). | One service record; the Open service button starts a request. |
| `renderServiceCategoryPage()` | Loads one database category and renders the matching service cards. | renderCurrentPage() and renderRequestsPage(). | getServices(), renderServiceCard(), state.currentServices and the active building. |
| `renderRequestsPage()` | Shows services categorized as Requests and a link to the PULSE records. | renderCurrentPage(). | renderServiceCategoryPage() for the Requests category. |
| `renderMovingPage()` | Loads floors and rooms, then shows the selected floor and its room list. | renderCurrentPage() and the select-floor action. | getFloors(), getRooms() and state.selectedFloorId. |
| `renderDirectoryPage()` | Loads and displays the offices for the active building. | renderCurrentPage(). | getOffices() and the offices table. |
| `renderHandbookPage()` | Loads handbook and memorandum links stored in Supabase. | renderCurrentPage(). | getDocuments() and the documents table. |
| `renderPulsePage()` | Combines the signed-in student’s requests, bookings, appointments and borrow records into one list. | renderCurrentPage() and successful request/booking/appointment flows. | getMyRecords() and the personal tables. |
| `renderInnovationPage()` | Displays equipment inventory, the student’s borrowed items and project submissions. | renderCurrentPage(), project submission and equipment return/borrow actions. | getEquipment(), getMyProjects() and the borrow_records table. |
| `renderSettingsPage()` | Displays the signed-in account, accessibility controls and reset option. | renderCurrentPage() and the contrast/text-size actions. | state.user, localStorage and resetMyData() through handleClick(). |
| `renderCurrentPage()` | Chooses which page-rendering function to call for the active section. | handleRouteChange(). | The section renderers and current section in state. |

### 5. Dialog, search and notification functions

| Function | Purpose | Connected from | Uses / hands off to |
|---|---|---|---|
| `openRequestDialog()` | Opens a simple request form for the selected service. | The start-request action and a service result from global search. | state.selectedService and the requestForm submission handler. |
| `openBookingDialog()` | Loads rooms and opens the room-booking form. | The open-booking-form action in the Academics page. | getRooms() and createBooking() after submission. |
| `openAppointmentDialog()` | Opens the appointment request form. | The open-appointment-form action in Health & Wellness. | The appointmentForm submission handler. |
| `openProjectDialog()` | Opens the Innovation Hub project/idea form. | The open-project-form action in Student Life and Innovation Hub. | The projectForm submission handler. |
| `openBorrowDialog()` | Opens the borrowing request form for a selected equipment record. | The borrow-equipment action in handleClick(). | An equipment record from state.currentEquipment. |
| `openSearchDialog()` | Opens the global search dialog. | The sidebar search, mobile Search button and Ctrl/Cmd+K shortcut. | updateSearchResults() through the global input listener. |
| `updateSearchResults()` | Runs the database search and displays matching services, rooms and offices. | handleInput() after the user pauses typing. | searchDatabase() and the searchResults element. |
| `openNotificationsDialog()` | Loads and displays in-app notifications and read controls. | The topbar notification button and notification read actions. | getNotifications(), markNotificationRead() and markAllNotificationsRead(). |
| `openProfileDialog()` | Displays the current account and sign-out/settings actions. | The topbar profile button. | state.user and the shared dialog. |
| `openMobileMenu()` | Displays the full navigation list in a mobile dialog. | The right-most Menu button in the mobile bottom bar. | navigationItems and navigateTo(). |

### 6. Form, click and startup functions

| Function | Purpose | Connected from | Uses / hands off to |
|---|---|---|---|
| `validateBooking()` | Checks that a booking date is not in the past and its end time is after its start time. | submitBookingForm(). | The room booking form values. |
| `submitRequestForm()` | Checks and saves the request form, then navigates to PULSE. | handleFormSubmit() when requestForm is submitted. | createRequest() and navigateTo("pulse"). |
| `submitBookingForm()` | Validates and saves a room booking request. | handleFormSubmit() when bookingForm is submitted. | validateBooking(), createBooking() and navigateTo("pulse"). |
| `submitAppointmentForm()` | Validates and saves an appointment request. | handleFormSubmit() when appointmentForm is submitted. | createAppointment() and navigateTo("pulse"). |
| `submitProjectForm()` | Validates and saves a project submission, then refreshes Innovation Hub. | handleFormSubmit() when projectForm is submitted. | createProject() and renderInnovationPage(). |
| `submitBorrowForm()` | Checks the chosen equipment and pickup date, then saves the borrow request. | handleFormSubmit() when borrowForm is submitted. | state.currentEquipment and createBorrowRecord(). |
| `handleFormSubmit()` | Checks which form was submitted and calls the matching form function. | The document-level submit event listener registered by startGlitchwayve(). | signIn(), submitRequestForm(), submitBookingForm(), submitAppointmentForm(), submitProjectForm() and submitBorrowForm(). |
| `handleClick()` | Handles navigation and button actions across the entire website. | The document-level click event listener registered by startGlitchwayve(). | Routing functions, Supabase write functions, dialogs, settings and toast messages. |
| `handleInput()` | Waits briefly after the user types in global search, then updates results. | The document-level input event listener registered by startGlitchwayve(). | updateSearchResults() and searchDatabase(). |
| `startGlitchwayve()` | Starts the application by registering events, applying saved settings and checking the login session. | Called once at the bottom of script.js. | All global event handlers, Supabase Auth and checkExistingSession(). |

## Where the Supabase tables are used

| Table | Read by | Written/updated by |
|---|---|---|
| `announcements` | `getAnnouncements()` | Managed by the school in Supabase Table Editor |
| `dismissed_announcements` | `getDismissedAnnouncementIds()` | `dismissAnnouncement()`, `restoreAnnouncement()`, `resetMyData()` |
| `services` | `getServices()`, `searchDatabase()` | Managed by the school in Supabase Table Editor |
| `floors` | `getFloors()` | Managed by the school in Supabase Table Editor |
| `rooms` | `getRooms()`, `searchDatabase()`, booking relationship query | Managed by the school in Supabase Table Editor |
| `offices` | `getOffices()`, `searchDatabase()` | Managed by the school in Supabase Table Editor |
| `documents` | `getDocuments()` | Managed by the school in Supabase Table Editor |
| `requests` | `getMyRecords()` | `createRequest()`, `resetMyData()` |
| `bookings` | `getMyRecords()` | `createBooking()`, `resetMyData()` |
| `appointments` | `getMyRecords()` | `createAppointment()`, `resetMyData()` |
| `borrow_records` | `getMyRecords()`, `renderInnovationPage()` | `createBorrowRecord()`, `returnBorrowedItem()`, `resetMyData()` |
| `notifications` | `getNotifications()` | `markNotificationRead()`, `markAllNotificationsRead()`, `resetMyData()` |
| `equipment` | `getEquipment()` | Managed by the school in Supabase Table Editor |
| `projects` | `getMyProjects()` | `createProject()`, `resetMyData()` |

## One important distinction

`script.js` contains both page functions and database functions. For example, `renderHomePage()` is responsible for displaying the Home screen, while `getAnnouncements()` is responsible for reading announcement rows from Supabase. Keeping those jobs as separate functions makes one large JavaScript file easier to understand, even though it is still a single file.

The table records are not sample data. The shared Supabase tables begin empty and must be filled with real/approved school information. Personal tables begin empty for each authenticated account.

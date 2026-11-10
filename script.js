/* =========================================================
   GLITCHWAYVE - ONE-FILE JAVASCRIPT
   Beginner note:
   - HTML creates the page containers.
   - CSS controls the appearance.
   - This file handles page changes, buttons, forms and Supabase.
   - All database requests are written directly in this file.
   ========================================================= */

// =========================================================
// 1. SUPABASE CONNECTION
// =========================================================

// Replace these two values with the URL and publishable key from your Supabase project.
// A publishable key is safe to use in browser code only when Row Level Security is enabled.
const SUPABASE_URL = "https://vgvxvmrijdzzxiafligz.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_9ShzBEr1-VKQR294lFbuLg_D_lC3iBy";

// Create one Supabase client that the rest of this file will use.
const supabaseClient =
  window.supabase &&
  SUPABASE_URL !== "YOUR_SUPABASE_PROJECT_URL" &&
  SUPABASE_PUBLISHABLE_KEY !== "YOUR_SUPABASE_PUBLISHABLE_KEY"
    ? window.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY)
    : null;

// =========================================================
// 2. WEBSITE SETTINGS AND GLOBAL STATE
// =========================================================

// These are navigation labels, not database records or sample service data.

const navigationItems = [
  { section: "home", label: "Home", icon: "house" },
  { section: "moving", label: "Moving Around", icon: "map" },
  { section: "handbook", label: "College Handbook", icon: "book-open" },
  { section: "academics", label: "Academics & Formation", icon: "graduation-cap" },

  // Interweave-only features
  { section: "document-support", label: "Document Support", icon: "file-text" },

  // Available in both buildings
  { section: "requests", label: "Requests", icon: "clipboard-list" },
  { section: "careers", label: "Careers", icon: "briefcase-business" },

  // Interweave-only features
  { section: "student-life", label: "Student Life", icon: "users" },

  // Shared feature
  { section: "health", label: "Health & Wellness", icon: "heart-pulse" },

  // Interweave-only feature: this is the existing Support category,
  // displayed under the proposal's name, IT Support.
  { section: "support", label: "IT Support", icon: "life-buoy" },
  { section: "directory", label: "School Directory", icon: "contact" },
  { section: "online-library", label: "Online Library", icon: "book-open" },

  // Shared feature
  { section: "pulse", label: "PULSE Dashboard", icon: "activity" },

  // Existing project feature
  { section: "innovation", label: "Innovation Hub", icon: "lightbulb" },
  { section: "settings", label: "Settings", icon: "settings" }
];


// This object stores the information currently being used by the website.
const state = {
  user: null,
  building: localStorage.getItem("glitchwayve-building") || "interweave",
  section: "home",
  selectedFloorId: null,
  selectedService: null,
  currentServices: [],
  currentEquipment: [],
  searchTimer: null,
  showDismissed: false,
  textSize: localStorage.getItem("glitchwayve-text-size") || "16px",
  highContrast: localStorage.getItem("glitchwayve-high-contrast") === "true"
};

/*
 * BUILDING AVAILABILITY
 *
 * These sections are only available in Interweave,
 * based on the feature inspection in the HCI proposal.
 */
const interweaveOnlySections = new Set([
  "document-support",
  "student-life",
  "support",
  "directory",
  "online-library"
]);

// These service categories are also exclusive to Interweave.
const interweaveOnlyServiceCategories = new Set([
  "Document Support",
  "Student Life",
  "Support"
]);

// Check whether a dashboard section is available in a building.
function isSectionAvailable(section, buildingKey = state.building) {
  return !(
    buildingKey === "glitch" &&
    interweaveOnlySections.has(section)
  );
}

// Return only the navigation items allowed in the selected building.
function getVisibleNavigationItems() {
  return navigationItems.filter((item) =>
    isSectionAvailable(item.section)
  );
}

// Ignore an old or invalid building value saved in the browser.
if (!["interweave", "glitch"].includes(state.building)) {
  state.building = "interweave";
  localStorage.setItem("glitchwayve-building", "interweave");
}


// Return the full building name for the current building key.
/**
 * PURPOSE: Returns the visible name of Interweave or Glitch Tower.
 * CONNECTED FROM: renderTopbar(), renderHomePage(), service and search result cards.
 * USES / HANDS OFF TO: The current building key in state.
 */
function getBuildingName(buildingKey = state.building) {
  return buildingKey === "glitch"
    ? "CIIT Glitch Tower"
    : "CIIT Interweave";
}

// Return the local date as YYYY-MM-DD for date inputs.
/**
 * PURPOSE: Creates a date string used as the minimum date in date fields.
 * CONNECTED FROM: openBookingDialog(), openAppointmentDialog(), openBorrowDialog(), and form validators.
 * USES / HANDS OFF TO: The JavaScript Date object.
 */
function getTodayString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

// Convert a date value into a readable date for the dashboard.
/**
 * PURPOSE: Converts a saved date into a readable date for the student.
 * CONNECTED FROM: renderAnnouncementList(), renderHandbookPage(), renderPulsePage(), and Innovation Hub records.
 * USES / HANDS OFF TO: A date value from Supabase.
 */
function formatDate(dateValue) {
  if (!dateValue) return "Date not provided";
  return new Date(`${dateValue}T00:00:00`).toLocaleDateString("en-PH", {
    year: "numeric", month: "short", day: "numeric"
  });
}

// Safely escape database text before placing it inside an HTML string.
/**
 * PURPOSE: Escapes text before placing it inside HTML so database text cannot become HTML or script code.
 * CONNECTED FROM: Most page rendering functions and dialogs.
 * USES / HANDS OFF TO: A text value; returns a safe HTML string.
 */
function escapeHTML(value) {
  return String(value ?? "").replace(/[&<>"']/g, function (character) {
    const characters = {
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    };
    return characters[character];
  });
}

// Accept only normal web links before placing a database URL in an anchor.
/**
 * PURPOSE: Allows only HTTP or HTTPS document links from the database.
 * CONNECTED FROM: renderHandbookPage().
 * USES / HANDS OFF TO: The browser URL parser; returns an empty string for an invalid link.
 */
function safeWebUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.href : "";
  } catch (error) {
    return "";
  }
}

// Ask Lucide to draw icons after a page has been inserted into the document.
/**
 * PURPOSE: Tells Lucide to draw icons inside the HTML that was just rendered.
 * CONNECTED FROM: Shared display functions and every page/dialog renderer.
 * USES / HANDS OFF TO: The Lucide CDN script loaded in index.html.
 */
function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}

// Apply text-size and high-contrast preferences saved in this browser.
/**
 * PURPOSE: Applies the text-size and high-contrast preferences saved in localStorage.
 * CONNECTED FROM: startGlitchwayve(), openDashboard(), and the Settings click actions.
 * USES / HANDS OFF TO: state.textSize, state.highContrast, and CSS variables/classes.
 */
function applyAccessibilitySettings() {
  document.documentElement.style.setProperty("--font-size", state.textSize);
  document.documentElement.classList.toggle("high-contrast", state.highContrast);
}

// =========================================================
// 3. SMALL REUSABLE DISPLAY FUNCTIONS
// =========================================================

// Return a consistent page heading for each dashboard section.
/**
 * PURPOSE: Builds the repeated heading and description at the top of each page.
 * CONNECTED FROM: Home-independent page renderers such as renderServiceCategoryPage(), renderMovingPage(), and renderDirectoryPage().
 * USES / HANDS OFF TO: A page title, description, and optional button HTML.
 */
function renderPageHeader(title, description, actionHTML = "") {
  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">${escapeHTML(title)}</h1>
        <p class="page-description">${escapeHTML(description)}</p>
      </div>
      ${actionHTML}
    </div>`;
}

// Return a reusable message when a database table has no matching records.
/**
 * PURPOSE: Builds a clear message when a Supabase table has no matching records.
 * CONNECTED FROM: Home, services, floors, rooms, handbook, PULSE, Innovation Hub, search, and notifications.
 * USES / HANDS OFF TO: A title, message, and Lucide icon name.
 */
function renderEmptyState(title, message, iconName = "inbox") {
  return `
    <div class="empty-state">
      <div class="empty-icon"><i data-lucide="${escapeHTML(iconName)}" size="30"></i></div>
      <h3>${escapeHTML(title)}</h3>
      <p>${escapeHTML(message)}</p>
    </div>`;
}

// Return loading cards while a page is waiting for Supabase.
/**
 * PURPOSE: Shows skeleton cards while a page waits for Supabase data.
 * CONNECTED FROM: The asynchronous page rendering functions.
 * USES / HANDS OFF TO: A number of placeholder loading cards; no database records are created.
 */
function renderLoadingCards(numberOfCards = 3) {
  return `<div class="loading-grid">${Array.from({ length: numberOfCards }, () => '<div class="skeleton" aria-hidden="true"></div>').join("")}</div>`;
}

// Show a short message at the bottom-right corner of the screen.
/**
 * PURPOSE: Shows a temporary success or error message.
 * CONNECTED FROM: Form submission functions and the global click handler.
 * USES / HANDS OFF TO: A message and an optional error flag.
 */
function showToast(message, isError = false) {
  const toastRoot = document.getElementById("toastRoot");
  const toast = document.createElement("div");
  toast.className = isError ? "toast error" : "toast";
  toast.textContent = message;
  toastRoot.appendChild(toast);
  window.setTimeout(() => toast.remove(), 3800);
}

// Display a dialog and put its supplied HTML inside the dialog container.
/**
 * PURPOSE: Opens a reusable modal dialog and places the supplied form or content inside it.
 * CONNECTED FROM: openRequestDialog(), openBookingDialog(), openAppointmentDialog(), openProjectDialog(), openBorrowDialog(), search, notifications, profile and confirmation dialogs.
 * USES / HANDS OFF TO: A title, description, HTML body and optional wide-dialog setting.
 */
function showDialog(title, description, bodyHTML, wide = false) {
  const dialogRoot = document.getElementById("dialogRoot");
  dialogRoot.innerHTML = `
    <div class="dialog-backdrop">
      <section class="dialog ${wide ? "dialog-wide" : ""}" role="dialog" aria-modal="true" aria-labelledby="dialogTitle" data-dialog-content>
        <div class="dialog-header">
          <div>
            <h2 id="dialogTitle">${escapeHTML(title)}</h2>
            <p>${escapeHTML(description)}</p>
          </div>
          <button class="icon-button dialog-close" type="button" data-action="close-dialog" aria-label="Close dialog"><i data-lucide="x"></i></button>
        </div>
        ${bodyHTML}
      </section>
    </div>`;
  refreshIcons();
  const firstInput = dialogRoot.querySelector("input, select, textarea, button");
  if (firstInput) firstInput.focus();
}

// Remove the currently open dialog from the page.
/**
 * PURPOSE: Clears the currently open modal dialog.
 * CONNECTED FROM: The global click handler and Escape-key handler.
 * USES / HANDS OFF TO: The dialogRoot element in index.html.
 */
function closeDialog() {
  document.getElementById("dialogRoot").innerHTML = "";
}

// Show a clear page-level error when a database request fails.
/**
 * PURPOSE: Displays a friendly error state when a page cannot load data.
 * CONNECTED FROM: The catch blocks in page renderers.
 * USES / HANDS OFF TO: The error returned by Supabase or JavaScript.
 */
function showPageError(error) {
  const message = error && error.message ? error.message : "Please try again or contact the school office.";
  document.getElementById("mainContent").innerHTML = `
    <div class="empty-state">
      <div class="empty-icon"><i data-lucide="cloud-off" size="30"></i></div>
      <h3>We couldn't load this information.</h3>
      <p>${escapeHTML(message)}</p>
      <div class="card-actions" style="justify-content:center">
        <button class="btn btn-primary" data-action="reload-page" type="button">Try again</button>
      </div>
    </div>`;
  refreshIcons();
}

// =========================================================
// 4. SUPABASE DATABASE FUNCTIONS
// All database communication is kept here in this one file.
// =========================================================

// Get published announcements for the selected building.
/**
 * PURPOSE: Reads announcements for the active building, including announcements that apply to both buildings.
 * CONNECTED FROM: renderHomePage().
 * USES / HANDS OFF TO: The announcements table in Supabase.
 */
async function getAnnouncements() {
  const { data, error } = await supabaseClient
    .from("announcements")
    .select("*")
    .or(`building_key.is.null,building_key.eq.${state.building}`)
    .order("published_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Get the IDs of announcements hidden by the signed-in student.
/**
 * PURPOSE: Reads the announcement IDs hidden by the signed-in student.
 * CONNECTED FROM: renderHomePage().
 * USES / HANDS OFF TO: The dismissed_announcements table and the current user ID.
 */
async function getDismissedAnnouncementIds() {
  const { data, error } = await supabaseClient
    .from("dismissed_announcements")
    .select("announcement_id")
    .eq("student_id", state.user.id);
  if (error) throw error;
  return (data || []).map((record) => record.announcement_id);
}

// Get service cards for one building and one category.
/**
 * PURPOSE: Reads the services in one category for the active building.
 * CONNECTED FROM: renderServiceCategoryPage(), which is used by Academics, Requests, Careers, Student Life, Health and Support.
 * USES / HANDS OFF TO: The services table, active building key and selected category.
 */

async function getServices(category) {

  // Do not load Interweave-only services in Glitch Tower.
  if (
    state.building === "glitch" &&
    interweaveOnlyServiceCategories.has(category)
  ) {
    return [];
  }

  const { data, error } = await supabaseClient
    .from("services")
    .select("*")
    .eq("building_key", state.building)
    .eq("category", category)
    .eq("is_active, true")
    .order("name");

  if (error) throw error;

  return data || [];
}


// Get all floors for the selected building, from top floor to bottom floor.
/**
 * PURPOSE: Reads the floor list for the active building.
 * CONNECTED FROM: renderMovingPage().
 * USES / HANDS OFF TO: The floors table in Supabase.
 */
async function getFloors() {
  const { data, error } = await supabaseClient
    .from("floors")
    .select("*")
    .eq("building_key", state.building)
    .order("floor_number", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Get every room in the selected building.
/**
 * PURPOSE: Reads the rooms for the active building.
 * CONNECTED FROM: renderMovingPage() and openBookingDialog().
 * USES / HANDS OFF TO: The rooms table in Supabase.
 */
async function getRooms() {
  const { data, error } = await supabaseClient
    .from("rooms")
    .select("*")
    .eq("building_key", state.building)
    .order("room_number");
  if (error) throw error;
  return data || [];
}

// Get school offices for the selected building.
/**
 * PURPOSE: Reads the office directory for the active building.
 * CONNECTED FROM: renderDirectoryPage().
 * USES / HANDS OFF TO: The offices table in Supabase.
 */
async function getOffices() {
  const { data, error } = await supabaseClient
    .from("offices")
    .select("*")
    .eq("building_key", state.building)
    .order("name");
  if (error) throw error;
  return data || [];
}


/**
 * PURPOSE:
 * Retrieves documents belonging to a selected category.
 *
 * Examples:
 * Handbook = College Handbook
 * Online Library = Online Library
 */
async function getDocuments(category = "Handbook") {

  const { data, error } = await supabaseClient
    .from("documents")
    .select("*")
    .eq("category", category)
    .order("published_at", { ascending: false });

  if (error) throw error;

  // Shared documents have no building_key.
  // Otherwise, only return documents for the active building.
  return (data || []).filter((document) =>
    !document.building_key ||
    document.building_key === state.building
  );
}

// Get the signed-in student's requests, bookings, appointments and borrowed items.
/**
 * PURPOSE: Reads the signed-in student’s own requests, bookings, appointments and borrow records.
 * CONNECTED FROM: renderHomePage() and renderPulsePage().
 * USES / HANDS OFF TO: Personal tables protected by Row Level Security.
 */
async function getMyRecords() {
  const results = await Promise.all([
    supabaseClient.from("requests").select("*").eq("student_id", state.user.id).order("created_at", { ascending: false }),
    supabaseClient.from("bookings").select("*, rooms(room_number, name)").eq("student_id", state.user.id).order("created_at", { ascending: false }),
    supabaseClient.from("appointments").select("*").eq("student_id", state.user.id).order("created_at", { ascending: false }),
    supabaseClient.from("borrow_records").select("*").eq("student_id", state.user.id).order("created_at", { ascending: false })
  ]);
  const errorResult = results.find((result) => result.error);
  if (errorResult) throw errorResult.error;
  return {
    requests: results[0].data || [],
    bookings: results[1].data || [],
    appointments: results[2].data || [],
    borrowRecords: results[3].data || []
  };
}

// Get unread notifications belonging to the signed-in student.
/**
 * PURPOSE: Reads in-app notifications belonging to the signed-in student.
 * CONNECTED FROM: renderHomePage() and openNotificationsDialog().
 * USES / HANDS OFF TO: The notifications table in Supabase.
 */
async function getNotifications() {
  const { data, error } = await supabaseClient
    .from("notifications")
    .select("*")
    .eq("student_id", state.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Get the equipment inventory entered by the school in Supabase.
/**
 * PURPOSE: Reads the equipment inventory for the active building.
 * CONNECTED FROM: renderInnovationPage().
 * USES / HANDS OFF TO: The equipment table in Supabase.
 */
async function getEquipment() {
  const { data, error } = await supabaseClient
    .from("equipment")
    .select("*")
    .eq("building_key", state.building)
    .order("name");
  if (error) throw error;
  return data || [];
}

// Get the signed-in student's project and idea submissions.
/**
 * PURPOSE: Reads the signed-in student’s project submissions.
 * CONNECTED FROM: renderInnovationPage().
 * USES / HANDS OFF TO: The projects table in Supabase.
 */
async function getMyProjects() {
  const { data, error } = await supabaseClient
    .from("projects")
    .select("*")
    .eq("student_id", state.user.id)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data || [];
}

// Save a new service request for the currently signed-in student.
/**
 * PURPOSE: Inserts a student request and returns the new record.
 * CONNECTED FROM: submitRequestForm().
 * USES / HANDS OFF TO: The requests table; Row Level Security checks student_id.
 */
async function createRequest(service, details) {
  const { data, error } = await supabaseClient
    .from("requests")
    .insert({
      student_id: state.user.id,
      service_id: service.id,
      service_name: service.name,
      building_key: state.building,
      details: details,
      status: "Submitted"
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Save a room booking request for the signed-in student.
/**
 * PURPOSE: Inserts a room-booking request for the signed-in student.
 * CONNECTED FROM: submitBookingForm().
 * USES / HANDS OFF TO: The bookings table; Row Level Security checks student_id.
 */
async function createBooking(formValues) {
  const { data, error } = await supabaseClient
    .from("bookings")
    .insert({
      student_id: state.user.id,
      room_id: formValues.roomId,
      date: formValues.date,
      start_time: formValues.startTime,
      end_time: formValues.endTime,
      purpose: formValues.purpose,
      people_count: Number(formValues.peopleCount),
      status: "Submitted"
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Save an appointment request for the signed-in student.
/**
 * PURPOSE: Inserts an appointment request.
 * CONNECTED FROM: submitAppointmentForm().
 * USES / HANDS OFF TO: The appointments table; Row Level Security checks student_id.
 */
async function createAppointment(formValues) {
  const { data, error } = await supabaseClient
    .from("appointments")
    .insert({
      student_id: state.user.id,
      appointment_type: formValues.type,
      appointment_date: formValues.date,
      time_slot: formValues.time,
      reason: formValues.reason,
      building_key: state.building,
      status: "Submitted"
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Save a new student project or idea in the Innovation Hub.
/**
 * PURPOSE: Inserts a student project or idea submission.
 * CONNECTED FROM: submitProjectForm().
 * USES / HANDS OFF TO: The projects table; Row Level Security checks student_id.
 */
async function createProject(formValues) {
  const { data, error } = await supabaseClient
    .from("projects")
    .insert({
      student_id: state.user.id,
      title: formValues.title,
      description: formValues.description,
      category: formValues.category,
      lab_or_tool: formValues.labOrTool,
      link: formValues.link,
      status: "Submitted"
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Create a borrowing record for a piece of equipment.
/**
 * PURPOSE: Inserts a request to borrow an equipment item.
 * CONNECTED FROM: submitBorrowForm().
 * USES / HANDS OFF TO: The borrow_records table; Row Level Security checks student_id.
 */
async function createBorrowRecord(equipment, pickupDate, purpose) {
  const { data, error } = await supabaseClient
    .from("borrow_records")
    .insert({
      student_id: state.user.id,
      equipment_id: equipment.id,
      equipment_name: equipment.name,
      pickup_date: pickupDate,
      purpose: purpose,
      status: "Submitted"
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

// Mark a borrowed item as returned in the signed-in student's record.
/**
 * PURPOSE: Updates the student’s borrow record to Returned and saves the return time.
 * CONNECTED FROM: The return-equipment action in handleClick().
 * USES / HANDS OFF TO: The borrow_records table and the current user ID.
 */
async function returnBorrowedItem(recordId) {
  const { error } = await supabaseClient
    .from("borrow_records")
    .update({ status: "Returned", returned_at: new Date().toISOString() })
    .eq("id", recordId)
    .eq("student_id", state.user.id);
  if (error) throw error;
}

// Save that the signed-in student has dismissed an announcement.
/**
 * PURPOSE: Saves that the current student dismissed an announcement.
 * CONNECTED FROM: The dismiss-announcement action in handleClick().
 * USES / HANDS OFF TO: The dismissed_announcements table.
 */
async function dismissAnnouncement(announcementId) {
  const { error } = await supabaseClient
    .from("dismissed_announcements")
    .insert({ student_id: state.user.id, announcement_id: announcementId });
  if (error) throw error;
}

// Remove an announcement dismissal so the announcement can be shown again.
/**
 * PURPOSE: Deletes the current student’s dismissal record so the announcement can be seen again.
 * CONNECTED FROM: The restore-announcement action in handleClick().
 * USES / HANDS OFF TO: The dismissed_announcements table.
 */
async function restoreAnnouncement(announcementId) {
  const { error } = await supabaseClient
    .from("dismissed_announcements")
    .delete()
    .eq("student_id", state.user.id)
    .eq("announcement_id", announcementId);
  if (error) throw error;
}

// Mark one notification as read.
/**
 * PURPOSE: Marks one notification as read.
 * CONNECTED FROM: The mark-notification-read action in handleClick().
 * USES / HANDS OFF TO: The notifications table.
 */
async function markNotificationRead(notificationId) {
  const { error } = await supabaseClient
    .from("notifications")
    .update({ is_read: true })
    .eq("id", notificationId)
    .eq("student_id", state.user.id);
  if (error) throw error;
}

// Mark every notification belonging to the signed-in student as read.
/**
 * PURPOSE: Marks all unread notifications for the current student as read.
 * CONNECTED FROM: The mark-all-read action in handleClick().
 * USES / HANDS OFF TO: The notifications table.
 */
async function markAllNotificationsRead() {
  const { error } = await supabaseClient
    .from("notifications")
    .update({ is_read: true })
    .eq("student_id", state.user.id)
    .eq("is_read", false);
  if (error) throw error;
}

// Delete only the current student's records from personal tables.
/**
 * PURPOSE: Deletes the current student’s rows from the personal tables listed in the function.
 * CONNECTED FROM: The reset-my-data action in handleClick(), after a confirmation dialog.
 * USES / HANDS OFF TO: Personal tables only; shared building, service, room and office data is not deleted.
 */
async function resetMyData() {
  const personalTables = [
    "requests", "bookings", "appointments", "borrow_records", "notifications",
    "projects", "dismissed_announcements", "wellness_checkins", "safety_declarations",
    "handbook_conformes", "practicum_logs"
  ];

  for (const tableName of personalTables) {
    const { error } = await supabaseClient
      .from(tableName)
      .delete()
      .eq("student_id", state.user.id);
    if (error) throw error;
  }
}

// Search services, rooms and offices across both buildings.
/**
 * PURPOSE: Searches service names, room numbers/names and office names across both buildings.
 * CONNECTED FROM: updateSearchResults().
 * USES / HANDS OFF TO: The services, rooms and offices tables.
 */

async function searchDatabase(searchText) {

  const cleanSearch = searchText.trim().replace(/[,%()]/g, " ");

  if (cleanSearch.length < 2) {
    return {
      services: [],
      rooms: [],
      offices: []
    };
  }

  const pattern = `%${cleanSearch}%`;

  const results = await Promise.all([

    // Services from both buildings.
    supabaseClient
      .from("services")
      .select("*")
      .ilike("name", pattern)
      .limit(20),

    // Rooms from both buildings.
    supabaseClient
      .from("rooms")
      .select("*")
      .or(`room_number.ilike.${pattern},name.ilike.${pattern}`)
      .limit(20),

    // School Directory is Interweave-only.
    supabaseClient
      .from("offices")
      .select("*")
      .eq("building_key", "interweave")
      .ilike("name", pattern)
      .limit(20)

  ]);

  const errorResult = results.find((result) => result.error);

  if (errorResult) throw errorResult.error;

  // Remove any Interweave-only service mistakenly saved under Glitch.
  const availableServices = (results[0].data || []).filter((service) => {
    return !(
      service.building_key === "glitch" &&
      interweaveOnlyServiceCategories.has(service.category)
    );
  });

  return {
    services: availableServices,
    rooms: results[1].data || [],
    offices: results[2].data || []
  };
}


// =========================================================
// 5. LOGIN AND AUTHENTICATION
// =========================================================

// Draw the login screen and explain when the Supabase connection is not configured.
/**
 * PURPOSE: Builds the sign-in screen and shows a setup message if Supabase is not configured.
 * CONNECTED FROM: startGlitchwayve(), checkExistingSession(), signOut(), and the auth state listener.
 * USES / HANDS OFF TO: The loginScreen element and the Supabase connection settings.
 */
function renderLoginScreen() {
  const loginScreen = document.getElementById("loginScreen");
  const connectionMessage = supabaseClient
    ? "Sign in using the student account created in your Supabase project."
    : "Add your Supabase project URL and publishable key near the top of script.js before signing in.";

  loginScreen.innerHTML = `
    <div class="login-card">
      <div class="brand-mark">
        <span class="brand-word">CIIT</span>
        <span class="brand-caption">College of Innovation and Integrated Technology</span>
      </div>
      <h1 id="loginTitle" class="login-title">Sign in to Glitchwayve</h1>
      <p class="login-subtitle">Access your student services, building information and requests in one place.</p>
      <form id="loginForm">
        <div class="form-field">
          <label for="loginEmail">CIIT email address</label>
          <input id="loginEmail" name="email" type="email" placeholder="name@ciit.edu.ph" autocomplete="username" required>
        </div>
        <div class="form-field" style="margin-top:14px">
          <label for="loginPassword">Password</label>
          <input id="loginPassword" name="password" type="password" placeholder="Enter your password" autocomplete="current-password" required>
        </div>
        <p id="loginError" class="form-error" role="alert" style="margin:12px 0"></p>
        <button class="btn btn-primary btn-block" type="submit" ${supabaseClient ? "" : "disabled"}>
          Sign in with CIIT account
        </button>
      </form>
      <div class="config-notice">${escapeHTML(connectionMessage)}</div>
      <p class="form-help" style="margin-top:16px">Use a test account for your class prototype. Do not ask classmates to enter real passwords unless your institution has approved the system.</p>
    </div>`;
}

// Check whether Supabase already has a saved login session.
/**
 * PURPOSE: Checks whether Supabase has already saved a signed-in session.
 * CONNECTED FROM: startGlitchwayve().
 * USES / HANDS OFF TO: Supabase Auth getSession(); opens the dashboard or login screen.
 */
async function checkExistingSession() {
  if (!supabaseClient) {
    renderLoginScreen();
    return;
  }

  const { data, error } = await supabaseClient.auth.getSession();
  if (error) {
    renderLoginScreen();
    showToast(error.message, true);
    return;
  }

  if (data.session) {
    state.user = data.session.user;
    await openDashboard();
  } else {
    renderLoginScreen();
  }
}

// Validate the CIIT email and sign in using Supabase Auth.
/**
 * PURPOSE: Checks the CIIT email format and signs in using Supabase Auth.
 * CONNECTED FROM: handleFormSubmit() when the login form is submitted.
 * USES / HANDS OFF TO: The login form and supabaseClient.auth.signInWithPassword().
 */
async function signIn(event) {
  event.preventDefault();
  const form = event.target;
  const email = form.elements.email.value.trim().toLowerCase();
  const password = form.elements.password.value;
  const errorMessage = document.getElementById("loginError");

  if (!email.endsWith("@ciit.edu.ph")) {
    errorMessage.textContent = "Use your CIIT email address ending in @ciit.edu.ph.";
    form.elements.email.focus();
    return;
  }
  if (!password) {
    errorMessage.textContent = "Enter your password.";
    form.elements.password.focus();
    return;
  }

  const submitButton = form.querySelector("button[type='submit']");
  submitButton.disabled = true;
  submitButton.textContent = "Signing in...";
  errorMessage.textContent = "";

  const { data, error } = await supabaseClient.auth.signInWithPassword({ email, password });
  if (error) {
    errorMessage.textContent = "We couldn't sign you in. Check your email and password, then try again.";
    submitButton.disabled = false;
    submitButton.textContent = "Sign in with CIIT account";
    return;
  }

  state.user = data.user;
  await openDashboard();
}

// Sign out through Supabase and return the student to the login screen.
/**
 * PURPOSE: Ends the current Supabase session and returns to the login screen.
 * CONNECTED FROM: The sign-out action in handleClick() and the profile dialog.
 * USES / HANDS OFF TO: Supabase Auth signOut().
 */
async function signOut() {
  const { error } = await supabaseClient.auth.signOut();
  if (error) {
    showToast(error.message, true);
    return;
  }
  state.user = null;
  document.getElementById("dashboard").hidden = true;
  document.getElementById("loginScreen").hidden = false;
  renderLoginScreen();
  closeDialog();
}

// Reveal the dashboard after a valid Supabase session is available.
/**
 * PURPOSE: Reveals the main dashboard after a valid user session is available.
 * CONNECTED FROM: checkExistingSession() and signIn().
 * USES / HANDS OFF TO: The current user, the route handler and the dashboard shell.
 */
async function openDashboard() {
  document.getElementById("loginScreen").hidden = true;
  document.getElementById("dashboard").hidden = false;
  applyAccessibilitySettings();

  if (!location.hash) {
    location.hash = `#/${state.building}/home`;
  } else {
    await handleRouteChange();
  }
}

// =========================================================
// 6. ROUTING AND BUILDING SWITCH
// =========================================================

// Change the hash URL so browser Back and Forward can move between sections.
/**
 * PURPOSE: Changes the URL to the selected section so browser Back and Forward work.
 * CONNECTED FROM: Navigation buttons, quick links and form success handlers.
 * USES / HANDS OFF TO: The current building and the section name.
 */
function navigateTo(section) {
  location.hash = `#/${state.building}/${section}`;
}

// Change buildings while keeping the student on the same dashboard section.
/**
 * PURPOSE: Changes Interweave/Glitch and keeps the current page section.
 * CONNECTED FROM: Building-switch buttons and keyboard arrow navigation.
 * USES / HANDS OFF TO: state.building, localStorage, document data attribute and the hash router.
 */
function setBuilding(buildingKey) {
  if (buildingKey !== "interweave" && buildingKey !== "glitch") return;
  if (state.building === buildingKey) return;

  state.building = buildingKey;
  localStorage.setItem("glitchwayve-building", buildingKey);
  document.documentElement.dataset.building = buildingKey;
  location.hash = `#/${state.building}/${state.section}`;
}


/**
 * PURPOSE:
 * Reads the URL and checks whether the requested page
 * is available in the selected building.
 */
async function handleRouteChange() {
  if (!state.user) return;

  const pathParts = location.hash.replace(/^#\/?/, "").split("/");

  const buildingKey = pathParts[0] || state.building;
  const requestedSection = pathParts[1] || "home";

  // Only two buildings are supported.
  state.building =
    buildingKey === "glitch" ? "glitch" : "interweave";

  // Check whether the requested page exists.
  const sectionExists = navigationItems.some(
    (item) => item.section === requestedSection
  );

  // Also check whether the page is permitted in this building.
  if (
    sectionExists &&
    isSectionAvailable(requestedSection, state.building)
  ) {
    state.section = requestedSection;
  } else {
    state.section = "home";
  }

  document.documentElement.dataset.building = state.building;

  localStorage.setItem("glitchwayve-building", state.building);

  renderAppShell();

  await renderCurrentPage();
}


// =========================================================
// 7. APP SHELL: SIDEBAR, TOP BAR AND MOBILE NAVIGATION
// =========================================================

// Draw the desktop navigation menu and highlight the current section.
/**
 * PURPOSE: Builds the desktop sidebar and marks the active navigation item.
 * CONNECTED FROM: renderAppShell().
 * USES / HANDS OFF TO: navigationItems and state.section/state.building.
 */
function renderSidebar() {
  const movingLabel =
  `Moving Around ${getBuildingName().replace("CIIT ", "")}`;
  const links = getVisibleNavigationItems().map((item) => `
    <button class="nav-link ${state.section === item.section ? "active" : ""}"
      type="button" data-section="${item.section}" ${state.section === item.section ? 'aria-current="page"' : ""}>
      <i data-lucide="${item.icon}"></i><span>${item.section === "moving" ? movingLabel : item.label}</span>
    </button>`).join("");

  document.getElementById("sidebar").innerHTML = `
    <div class="sidebar-brand">
      <div class="brand-mark"><span class="brand-word">CIIT</span><span class="brand-caption">College of Innovation and Integrated Technology</span></div>
    </div>
    <button class="sidebar-search" type="button" data-action="open-search"><i data-lucide="search"></i><span>Search services</span><span style="margin-left:auto;font-size:.7rem">Ctrl K</span></button>
    <div class="sidebar-divider"></div>
    <nav class="sidebar-nav">${links}</nav>
    <div class="sidebar-bottom">Glitchwayve student dashboard</div>`;
}

// Draw the sticky top bar, including the always-visible building switch.
/**
 * PURPOSE: Builds the sticky top bar, building switch, notifications and profile buttons.
 * CONNECTED FROM: renderAppShell().
 * USES / HANDS OFF TO: state.user and state.building.
 */
function renderTopbar() {
  const displayName = state.user?.user_metadata?.full_name || state.user?.email?.split("@")[0] || "Student";
  const initials = displayName.split(/[ ._-]+/).map((part) => part[0]).join("").slice(0, 2).toUpperCase();

  document.getElementById("topbar").innerHTML = `
    <div class="topbar-left">
      <div class="topbar-title"><span class="topbar-brand">CIIT · </span>${getBuildingName()}</div>
      <span class="sr-only" aria-live="polite">Now showing ${getBuildingName()}</span>
      <div class="building-switch" role="radiogroup" aria-label="Choose a CIIT building">
        <button class="building-option" type="button" role="radio" aria-checked="${state.building === "interweave"}" data-action="switch-building" data-building="interweave">
          <i data-lucide="building-2"></i> Interweave
        </button>
        <button class="building-option" type="button" role="radio" aria-checked="${state.building === "glitch"}" data-action="switch-building" data-building="glitch">
          <i data-lucide="building"></i> Glitch Tower
        </button>
      </div>
    </div>
    <div class="topbar-right">
      <button class="icon-button" type="button" data-action="open-notifications" aria-label="Notifications"><i data-lucide="bell"></i></button>
      <button class="profile-button" type="button" data-action="open-profile" aria-label="Open profile and sign out">
        <span class="avatar">${escapeHTML(initials)}</span><span class="profile-name">${escapeHTML(displayName)}</span><i data-lucide="chevron-down" size="15"></i>
      </button>
    </div>`;
}

// Draw the small mobile navigation bar with Menu on the far right.
/**
 * PURPOSE: Builds the five-item mobile bottom navigation with Menu on the right.
 * CONNECTED FROM: renderAppShell().
 * USES / HANDS OFF TO: state.section.
 */
function renderMobileNav() {
  const mobileItems = [
    { section: "home", label: "Home", icon: "house" },
    { section: "academics", label: "Services", icon: "grid-2x2" },
    { section: "search", label: "Search", icon: "search" },
    { section: "requests", label: "Requests", icon: "file-text" },
    { section: "menu", label: "Menu", icon: "menu" }
  ];

  document.getElementById("mobileNav").innerHTML = mobileItems.map((item) => `
    <button type="button" class="${state.section === item.section ? "active" : ""}" data-action="${item.section === "search" ? "open-search" : item.section === "menu" ? "open-menu" : "navigate"}" data-section="${item.section}">
      <i data-lucide="${item.icon}"></i><span>${item.label}</span>
    </button>`).join("");
}

// Refresh all shared navigation areas after the route or building changes.
/**
 * PURPOSE: Refreshes the sidebar, top bar and mobile navigation together.
 * CONNECTED FROM: handleRouteChange().
 * USES / HANDS OFF TO: renderSidebar(), renderTopbar(), renderMobileNav() and refreshIcons().
 */
function renderAppShell() {
  renderSidebar();
  renderTopbar();
  renderMobileNav();
  refreshIcons();
}

// =========================================================
// 8. HOME PAGE AND ANNOUNCEMENTS
// =========================================================

// Draw the home dashboard with announcements and counts from Supabase.
/**
 * PURPOSE: Loads and displays the greeting, quick links, record counts and announcements.
 * CONNECTED FROM: renderCurrentPage() and announcement dismiss/restore actions.
 * USES / HANDS OFF TO: getAnnouncements(), getDismissedAnnouncementIds(), getMyRecords() and getNotifications().
 */
async function renderHomePage() {
  const main = document.getElementById("mainContent");
  main.innerHTML = renderLoadingCards(3);

  try {
    const [announcements, dismissedIds, records, notifications] = await Promise.all([
      getAnnouncements(), getDismissedAnnouncementIds(), getMyRecords(), getNotifications()
    ]);

    const visibleAnnouncements = announcements.filter((announcement) =>
      state.showDismissed || !dismissedIds.includes(announcement.id)
    );
    const pendingCount = records.requests.filter((record) => !["Completed", "Cancelled"].includes(record.status)).length;
    const unreadCount = notifications.filter((notification) => !notification.is_read).length;
    const displayName = state.user?.user_metadata?.full_name || state.user?.email?.split("@")[0] || "Student";

    main.innerHTML = `
      <section class="welcome-card">
        <div class="welcome-content">
          <span class="badge badge-accent">${getBuildingName()}</span>
          <h1>Hello, ${escapeHTML(displayName)}</h1>
          <p>Welcome to your student dashboard. Find the information and services you need for what’s next.</p>
        </div>
        <button class="btn" type="button" data-section="innovation">Explore Innovation Hub <i data-lucide="arrow-up-right"></i></button>
      </section>

      <div class="section-heading"><div><h2>Quick access</h2><p>Open commonly used areas of your dashboard.</p></div></div>
      
<div class="quick-grid">

  <button class="quick-link" type="button" data-section="academics">
    <span class="quick-icon">
      <i data-lucide="graduation-cap"></i>
    </span>

    <span class="quick-content">
      <strong>Academics & Formation</strong>
      <small>Find academic services and learning resources.</small>
    </span>

    <i data-lucide="chevron-right" class="quick-arrow"></i>
  </button>

  <button class="quick-link" type="button" data-section="health">
    <span class="quick-icon">
      <i data-lucide="heart-pulse"></i>
    </span>

    <span class="quick-content">
      <strong>Health & Wellness</strong>
      <small>Find wellness services and appointment information.</small>
    </span>

    <i data-lucide="chevron-right" class="quick-arrow"></i>
  </button>

  <button class="quick-link" type="button" data-section="moving">
    <span class="quick-icon">
      <i data-lucide="map"></i>
    </span>

    <span class="quick-content">
      <strong>Floor Directory</strong>
      <small>Explore floors, rooms, and campus facilities.</small>
    </span>

    <i data-lucide="chevron-right" class="quick-arrow"></i>
  </button>

  <button class="quick-link" type="button" data-section="requests">
    <span class="quick-icon">
      <i data-lucide="file-text"></i>
    </span>

    <span class="quick-content">
      <strong>Student Requests</strong>
      <small>Access applications and available request forms.</small>
    </span>

    <i data-lucide="chevron-right" class="quick-arrow"></i>
  </button>

  <button class="quick-link" type="button" data-section="pulse">
    <span class="quick-icon">
      <i data-lucide="activity"></i>
    </span>

    <span class="quick-content">
      <strong>My PULSE Records</strong>
      <small>Track your requests, appointments, and bookings.</small>
    </span>

    <i data-lucide="chevron-right" class="quick-arrow"></i>
  </button>

  ${
    state.building === "interweave"
      ? `
        <button class="quick-link" type="button" data-section="directory">
          <span class="quick-icon">
            <i data-lucide="contact"></i>
          </span>

          <span class="quick-content">
            <strong>School Directory</strong>
            <small>Find school offices, locations, and contact details.</small>
          </span>

          <i data-lucide="chevron-right" class="quick-arrow"></i>
        </button>
      `
      : ""
  }

</div>


      <div class="section-heading"><div><h2>Today at a glance</h2><p>Counts from your own student records.</p></div></div>
      <div class="stat-grid">
        <div class="card stat-card"><div class="card-icon"><i data-lucide="clipboard-list"></i></div><div><div class="stat-number">${pendingCount}</div><p>Pending requests</p></div></div>
        <div class="card stat-card"><div class="card-icon"><i data-lucide="calendar-check"></i></div><div><div class="stat-number">${records.appointments.length}</div><p>Appointments</p></div></div>
        <div class="card stat-card"><div class="card-icon"><i data-lucide="bell"></i></div><div><div class="stat-number">${unreadCount}</div><p>Unread notifications</p></div></div>
      </div>

      <div class="section-heading">
        <div><h2>Announcements</h2><p>Published information for ${getBuildingName()}.</p></div>
        <button class="btn btn-small" type="button" data-action="toggle-dismissed">${state.showDismissed ? "Hide dismissed" : "Show dismissed"}</button>
      </div>
      <div class="announcement-list">${renderAnnouncementList(visibleAnnouncements, dismissedIds)}</div>`;
    refreshIcons();
  } catch (error) {
    showPageError(error);
  }
}

// Turn announcement records into cards and add a dismiss/restore action.
/**
 * PURPOSE: Converts announcement records into cards with dismiss or restore buttons.
 * CONNECTED FROM: renderHomePage().
 * USES / HANDS OFF TO: Announcement records and the student’s dismissed announcement IDs.
 */
function renderAnnouncementList(announcements, dismissedIds) {
  if (!announcements.length) {
    return renderEmptyState("You're all caught up", "There are no announcements to display for this building.", "check-check");
  }

  return announcements.map((announcement) => {
    const isDismissed = dismissedIds.includes(announcement.id);
    return `
      <article class="announcement-card">
        <div class="announcement-top">
          <div>
            <span class="badge">${escapeHTML(announcement.tag || "Announcement")}</span>
            <h3 style="margin-top:9px">${escapeHTML(announcement.title)}</h3>
            <div class="announcement-date">${formatDate(String(announcement.published_at || "").slice(0, 10))}</div>
          </div>
          <button class="btn btn-small" type="button" data-action="${isDismissed ? "restore-announcement" : "dismiss-announcement"}" data-id="${announcement.id}">
            ${isDismissed ? "Restore" : "Dismiss"}
          </button>
        </div>
        <div class="announcement-body">${escapeHTML(announcement.body || "No additional details were provided.")}</div>
      </article>`;
  }).join("");
}

// =========================================================
// 9. SERVICE PAGES
// =========================================================

// Turn one database service record into a service card.
/**
 * PURPOSE: Converts one service row from Supabase into a service card.
 * CONNECTED FROM: renderServiceCategoryPage().
 * USES / HANDS OFF TO: One service record; the Open service button starts a request.
 */

function renderServiceCard(service) {

  const location = [
    service.floor_label,
    service.room_number ? `Room ${service.room_number}` : ""
  ].filter(Boolean).join(" · ");

  return `
    <article class="card">

      <div class="card-icon">
        <i data-lucide="${escapeHTML(service.icon_name || "clipboard-list")}"></i>
      </div>

      <div class="service-badges">

        <span class="badge badge-accent">
          ${getBuildingName(service.building_key)} ${service.is_hypothetical ? '<span class="badge">Sample data</span>' : ""}
        </span>

        ${
          service.area_name
            ? `<span class="badge">${escapeHTML(service.area_name)}</span>`
            : ""
        }

      </div>

      <h3 style="margin-top:11px">
        ${escapeHTML(service.name)}
      </h3>

      <p>
        ${escapeHTML(
          service.description || "No service description has been added yet."
        )}
      </p>

      <div class="card-meta">

        <span>
          <i data-lucide="map-pin" size="15"></i>
          ${escapeHTML(location || "Location not provided")}
        </span>

        <span>
          <i data-lucide="clock" size="15"></i>
          ${escapeHTML(service.hours || "Hours not provided")}
        </span>

        <span>
          <i data-lucide="clipboard-check" size="15"></i>
          ${escapeHTML(service.requirements || "Requirements not provided")}
        </span>

        <span>
          <i data-lucide="contact" size="15"></i>
          Contact office: ${escapeHTML(
            service.contact_office || "Not provided"
          )}
        </span>

      </div>

      <div class="card-actions">

        <button
          class="btn btn-primary btn-block"
          type="button"
          data-action="start-request"
          data-id="${service.id}">

          Open service
          <i data-lucide="arrow-right"></i>

        </button>

      </div>

    </article>
  `;
}


// Load and display service cards for one category from the services table.
/**
 * PURPOSE: Loads one database category and renders the matching service cards.
 * CONNECTED FROM: renderCurrentPage() and renderRequestsPage().
 * USES / HANDS OFF TO: getServices(), renderServiceCard(), state.currentServices and the active building.
 */
async function renderServiceCategoryPage(sectionTitle, category, description, extraActions = "") {
  const main = document.getElementById("mainContent");
  main.innerHTML = renderPageHeader(sectionTitle, description, extraActions) + renderLoadingCards();

  try {
    const services = await getServices(category);
    state.currentServices = services;
    main.innerHTML = renderPageHeader(sectionTitle, description, extraActions) +
      (services.length
        ? `<div class="card-grid">${services.map(renderServiceCard).join("")}</div>`
        : renderEmptyState("No services have been added", `There are currently no ${category} records for ${getBuildingName()}. Add verified service information in the Supabase services table.`, "folder-open"));
    refreshIcons();
  } catch (error) {
    showPageError(error);
  }
}

// Display the Requests page and its service request options.
/**
 * PURPOSE: Shows services categorized as Requests and a link to the PULSE records.
 * CONNECTED FROM: renderCurrentPage().
 * USES / HANDS OFF TO: renderServiceCategoryPage() for the Requests category.
 */
async function renderRequestsPage() {
  const actions = '<button class="btn" type="button" data-section="pulse">Track my requests <i data-lucide="arrow-right"></i></button>';
  await renderServiceCategoryPage("Requests", "Requests", "Choose a service to begin a student request. Your submissions will appear in PULSE.", actions);
}

// =========================================================
// 10. MOVING AROUND: FLOOR DIRECTORY
// =========================================================

// Load floors and rooms for the active building and draw the floor directory.
/**
 * PURPOSE: Loads floors and rooms, then shows the selected floor and its room list.
 * CONNECTED FROM: renderCurrentPage() and the select-floor action.
 * USES / HANDS OFF TO: getFloors(), getRooms() and state.selectedFloorId.
 */
async function renderMovingPage() {
  const main = document.getElementById("mainContent");
  main.innerHTML = renderPageHeader(`Moving Around ${getBuildingName().replace("CIIT ", "")}`, "Find a floor, room, campus facility or service location.") + renderLoadingCards(2);

  try {
    const [floors, rooms] = await Promise.all([getFloors(), getRooms()]);
    if (!floors.length) {
      main.innerHTML = renderPageHeader(`Moving Around ${state.building === "glitch" ? "Glitch" : "Interweave"}`, "Find a floor, room, campus facility or service location.") +
        renderEmptyState("No floor information yet", `Add the verified floors and rooms for ${getBuildingName()} in the Supabase floors and rooms tables.`, "map");
      return;
    }

    if (!floors.some((floor) => floor.id === state.selectedFloorId)) {
      state.selectedFloorId = floors[0].id;
    }

    const selectedFloor = floors.find((floor) => floor.id === state.selectedFloorId);
    const floorRooms = rooms.filter((room) => room.floor_id === state.selectedFloorId);

    main.innerHTML = `
      ${renderPageHeader(`Moving Around ${state.building === "glitch" ? "Glitch" : "Interweave"}`, "Choose a floor to see its rooms, operating hours and purpose.")}
      <div class="floor-layout">
        <div class="floor-list" aria-label="Building floors">
          ${floors.map((floor) => `
            <button class="floor-button ${floor.id === state.selectedFloorId ? "active" : ""}" type="button" data-action="select-floor" data-id="${floor.id}">
              <span>${escapeHTML(floor.floor_label)}</span><i data-lucide="chevron-right" size="16"></i>
            </button>`).join("")}
        </div>
        <section>
          <div class="card" style="margin-bottom:14px">
            <span class="badge badge-accent">${getBuildingName()}</span>
            <h2 style="margin:10px 0 5px;color:var(--navy)">${escapeHTML(selectedFloor.floor_label)}</h2>
            <p>${selectedFloor.is_off_limits ? "This floor is marked as restricted. Follow campus safety instructions." : "Select a room below to review its details."}</p>
          </div>
          <div class="room-list">
            ${floorRooms.length ? floorRooms.map((room) => `
              <article class="room-row">
                <div><h3>${escapeHTML(room.room_number)} · ${escapeHTML(room.name)}</h3><p>${escapeHTML(room.room_type || "Room")} · ${escapeHTML(room.purpose || "Purpose not provided")}</p><p style="margin-top:5px">Hours: ${escapeHTML(room.hours || "Not provided")} · Capacity: ${room.capacity ?? "Not provided"}</p><p style="margin-top:5px">Requirements: ${escapeHTML(room.requirements || "Not provided")}</p></div>
                <span class="badge">${escapeHTML(room.room_number)}</span>
              </article>`).join("") : renderEmptyState("No rooms listed on this floor", "Add room information in Supabase to make this floor directory useful.", "door-closed")}
          </div>
        </section>
      </div>`;
    refreshIcons();
  } catch (error) {
    showPageError(error);
  }
}

// =========================================================
// 11. SCHOOL DIRECTORY
// =========================================================

// Load and display the offices stored for the selected building.
/**
 * PURPOSE: Loads and displays the offices for the active building.
 * CONNECTED FROM: renderCurrentPage().
 * USES / HANDS OFF TO: getOffices() and the offices table.
 */
async function renderDirectoryPage() {
  const main = document.getElementById("mainContent");
  main.innerHTML = renderPageHeader("School Directory", "Find the office responsible for a service and check its location and contact details.") + renderLoadingCards();

  try {
    const offices = await getOffices();
    main.innerHTML = renderPageHeader("School Directory", "Find the office responsible for a service and check its location and contact details.") +
      (offices.length ? `<div class="office-list">${offices.map((office) => `
        <article class="office-row">
          <div><h3>${escapeHTML(office.name)}</h3><p>${escapeHTML(office.description || "Office responsibilities not provided.")}</p><p style="margin-top:7px">${escapeHTML(office.floor_label || "Floor not provided")} · ${escapeHTML(office.room_number || "Room not provided")} · ${escapeHTML(office.hours || "Hours not provided")}</p><p style="margin-top:5px">What to bring: ${escapeHTML(office.what_to_bring || "Not provided")}</p><p style="margin-top:5px">${escapeHTML(office.email || "Email not provided")}</p></div>
          <div class="card-actions"><button class="btn btn-small" type="button" data-action="copy-email" data-email="${escapeHTML(office.email || "")}" ${office.email ? "" : "disabled"}><i data-lucide="copy"></i> Copy email</button></div>
        </article>`).join("")}</div>` : renderEmptyState("No offices have been added", `Add verified office details for ${getBuildingName()} in the Supabase offices table.`, "contact"));
    refreshIcons();
  } catch (error) {
    showPageError(error);
  }
}

// =========================================================
// 12. COLLEGE HANDBOOK
// =========================================================

// Load handbook and memorandum entries from the documents table.

/**
 * PURPOSE:
 * Displays documents from the documents table.
 * Reused by College Handbook and Online Library.
 */
async function renderDocumentPage(
  title,
  category,
  description,
  iconName = "book-open"
) {

  const main = document.getElementById("mainContent");

  main.innerHTML =
    renderPageHeader(title, description) +
    renderLoadingCards(2);

  try {

    const documents = await getDocuments(category);

    main.innerHTML =
      renderPageHeader(title, description) +

      (documents.length
        ? `
          <div class="card-grid">

            ${documents.map((document) => {

              const documentUrl =
                safeWebUrl(document.document_url);

              return `
                <article class="card">

                  <div class="card-icon">
                    <i data-lucide="${iconName}"></i>
                  </div>

                  <h3>${escapeHTML(document.title)}</h3>

                  <p>
                    ${escapeHTML(
                      document.description || "No description provided."
                    )}
                  </p>

                  <div class="card-meta">
                    <span>
                      <i data-lucide="calendar" size="15"></i>
                      ${formatDate(
                        String(document.published_at || "").slice(0, 10)
                      )}
                    </span>
                  </div>

                  <div class="card-actions">

                    ${
                      documentUrl
                        ? `
                          <a
                            class="btn btn-primary"
                            href="${escapeHTML(documentUrl)}"
                            target="_blank"
                            rel="noopener noreferrer">

                            Open document
                            <i data-lucide="external-link"></i>

                          </a>
                        `
                        : `
                          <span class="form-help">
                            A valid document link has not been added.
                          </span>
                        `
                    }

                  </div>

                </article>
              `;

            }).join("")}

          </div>
        `
        : renderEmptyState(
            `No ${title.toLowerCase()} available`,
            `Add approved ${title.toLowerCase()} records to the Supabase documents table.`,
            "book-open"
          )
      );

    refreshIcons();

  } catch (error) {
    showPageError(error);
  }
}


// College Handbook: available in both buildings.
async function renderHandbookPage() {

  return renderDocumentPage(
    "College Handbook",
    "Handbook",
    "Read the current student handbook and official memoranda."
  );

}


// Online Library: Interweave only.
async function renderOnlineLibraryPage() {

  return renderDocumentPage(
    "Online Library",
    "Online Library",
    "Access available online library resources and learning materials."
  );

}


// =========================================================
// 13. PULSE: PERSONAL STUDENT RECORDS
// =========================================================

// Display the signed-in student's requests, appointments, bookings and equipment records.
/**
 * PURPOSE: Combines the signed-in student’s requests, bookings, appointments and borrow records into one list.
 * CONNECTED FROM: renderCurrentPage() and successful request/booking/appointment flows.
 * USES / HANDS OFF TO: getMyRecords() and the personal tables.
 */
async function renderPulsePage() {
  const main = document.getElementById("mainContent");
  main.innerHTML = renderPageHeader("PULSE Dashboard", "Track your own requests, bookings, appointments and borrowed equipment.") + renderLoadingCards(3);

  try {
    const records = await getMyRecords();
    const allRecords = [
      ...records.requests.map((record) => ({ ...record, recordType: "Request", title: record.service_name, dateText: record.created_at })),
      ...records.bookings.map((record) => ({ ...record, recordType: "Room booking", title: `Room booking · ${record.rooms?.room_number || "Room"}`, dateText: record.date })),
      ...records.appointments.map((record) => ({ ...record, recordType: "Appointment", title: record.appointment_type, dateText: record.appointment_date })),
      ...records.borrowRecords.map((record) => ({ ...record, recordType: "Equipment", title: record.equipment_name, dateText: record.pickup_date }))
    ].sort((first, second) => new Date(second.created_at || second.dateText) - new Date(first.created_at || first.dateText));

    main.innerHTML = renderPageHeader("PULSE Dashboard", "Track your own requests, bookings, appointments and borrowed equipment.") +
      (allRecords.length ? `<div class="record-list">${allRecords.map((record) => `
        <article class="record-row">
          <div><span class="badge">${escapeHTML(record.recordType)}</span><h3 style="margin-top:8px">${escapeHTML(record.title || "Student record")}</h3><p>${formatDate(String(record.dateText || "").slice(0, 10))}</p><p style="margin-top:5px">${escapeHTML(record.details || record.purpose || record.reason || "No additional details.")}</p></div>
          <span class="status ${record.status === "Cancelled" ? "status-cancelled" : record.status === "Submitted" || record.status === "Under review" ? "status-pending" : ""}">${escapeHTML(record.status || "Submitted")}</span>
        </article>`).join("")}</div>` : renderEmptyState("You haven't made any requests yet", "Start with Requests or choose a service from one of the dashboard sections.", "clipboard-list"));
    refreshIcons();
  } catch (error) {
    showPageError(error);
  }
}

// =========================================================
// 14. INNOVATION HUB
// =========================================================

// Load lab equipment and the signed-in student's project submissions.
/**
 * PURPOSE: Displays equipment inventory, the student’s borrowed items and project submissions.
 * CONNECTED FROM: renderCurrentPage(), project submission and equipment return/borrow actions.
 * USES / HANDS OFF TO: getEquipment(), getMyProjects() and the borrow_records table.
 */
async function renderInnovationPage() {
  const main = document.getElementById("mainContent");
  const actions = '<button class="btn btn-primary" type="button" data-action="open-project-form"><i data-lucide="plus"></i> Submit a project or idea</button>';
  main.innerHTML = renderPageHeader("Innovation Hub", "Explore the facilities and tools available in your building, then share a project or idea.", actions) + renderLoadingCards(3);

  try {
    const [equipment, projects, borrowRecords] = await Promise.all([getEquipment(), getMyProjects(), supabaseClient.from("borrow_records").select("*").eq("student_id", state.user.id).order("created_at", { ascending: false })]);
    if (borrowRecords.error) throw borrowRecords.error;
    state.currentEquipment = equipment;

    main.innerHTML = `
      ${renderPageHeader("Innovation Hub", "Explore the facilities and tools available in your building, then share a project or idea.", actions)}
      <div class="section-heading"><div><h2>Equipment and tools</h2><p>Inventory information maintained by the school.</p></div></div>
      ${equipment.length ? `<div class="card-grid">${equipment.map((item) => `
        <article class="card"><div class="card-icon"><i data-lucide="wrench"></i></div><h3>${escapeHTML(item.name)}</h3><p>${escapeHTML(item.description || "No equipment description provided.")}</p><div class="card-meta"><span><i data-lucide="map-pin" size="15"></i>${escapeHTML(item.location || "Location not provided")}</span><span><i data-lucide="package" size="15"></i>${item.total_quantity ?? "Quantity not provided"} total</span><span>${escapeHTML(item.requirements || "Requirements not provided")}</span></div><div class="card-actions"><button class="btn btn-primary" type="button" data-action="borrow-equipment" data-id="${item.id}">Request to borrow</button></div></article>`).join("")}</div>` : renderEmptyState("No equipment listed", "Add verified equipment inventory in the Supabase equipment table.", "wrench")}
      <div class="section-heading"><div><h2>My borrowed equipment</h2><p>Return an item when you have handed it back to the office.</p></div></div>
      ${borrowRecords.data.length ? `<div class="record-list">${borrowRecords.data.map((record) => `
        <article class="record-row"><div><h3>${escapeHTML(record.equipment_name)}</h3><p>Pickup date: ${formatDate(record.pickup_date)}</p><p>${escapeHTML(record.purpose || "")}</p></div><div class="card-actions"><span class="status ${record.status === "Returned" ? "" : "status-pending"}">${escapeHTML(record.status)}</span>${record.status !== "Returned" ? `<button class="btn btn-small" data-action="return-equipment" data-id="${record.id}" type="button">Mark returned</button>` : ""}</div></article>`).join("")}</div>` : renderEmptyState("No borrowed equipment", "Your equipment requests will appear here.", "package")}
      <div class="section-heading"><div><h2>My projects and ideas</h2><p>Submissions saved to your account.</p></div></div>
      ${projects.length ? `<div class="record-list">${projects.map((project) => `<article class="record-row"><div><h3>${escapeHTML(project.title)}</h3><p>${escapeHTML(project.description || "")}</p></div><span class="status status-pending">${escapeHTML(project.status)}</span></article>`).join("")}</div>` : renderEmptyState("No projects submitted", "Use the button above to share a project or idea.", "lightbulb")}`;
    refreshIcons();
  } catch (error) {
    showPageError(error);
  }
}

// =========================================================
// 15. SETTINGS
// =========================================================

// Display accessibility preferences and the option to clear personal demo records.
/**
 * PURPOSE: Displays the signed-in account, accessibility controls and reset option.
 * CONNECTED FROM: renderCurrentPage() and the contrast/text-size actions.
 * USES / HANDS OFF TO: state.user, localStorage and resetMyData() through handleClick().
 */
function renderSettingsPage() {
  const main = document.getElementById("mainContent");
  const email = state.user?.email || "No email available";
  main.innerHTML = `
    ${renderPageHeader("Settings", "Adjust the dashboard display and manage your own saved records.")}
    <section class="card">
      <h2 style="margin:0;color:var(--navy);font-size:1.1rem">Account</h2>
      <p style="margin-top:6px">${escapeHTML(email)}</p>
      <div class="setting-row"><div><h3>Text size</h3><p>Make dashboard text easier to read.</p></div><div class="setting-controls"><button class="btn btn-small" data-action="text-size" data-size="15px">A−</button><button class="btn btn-small" data-action="text-size" data-size="16px">A</button><button class="btn btn-small" data-action="text-size" data-size="18px">A+</button><button class="btn btn-small" data-action="text-size" data-size="20px">A++</button></div></div>
      <div class="setting-row"><div><h3>High contrast</h3><p>Use stronger text and border contrast.</p></div><button class="btn btn-small" type="button" data-action="toggle-contrast">${state.highContrast ? "Turn off" : "Turn on"}</button></div>
      <div class="setting-row"><div><h3>Sign out</h3><p>End your current Supabase session on this device.</p></div><button class="btn" type="button" data-action="sign-out">Sign out</button></div>
      <div class="setting-row"><div><h3>Reset my records</h3><p>Delete only records that belong to your signed-in account. Shared school information will not be deleted.</p></div><button class="btn btn-danger" type="button" data-action="confirm-reset">Reset my data</button></div>
    </section>`;
  refreshIcons();
}

// =========================================================
// 16. SECTION ROUTER: CHOOSE WHICH PAGE TO DISPLAY
// =========================================================

// Select and render the page that matches the current navigation section.
/**
 * PURPOSE: Chooses which page-rendering function to call for the active section.
 * CONNECTED FROM: handleRouteChange().
 * USES / HANDS OFF TO: The section renderers and current section in state.
 */

async function renderCurrentPage() {

  const section = state.section;

  // Safety check in case an unavailable page is opened directly.
  if (!isSectionAvailable(section)) {

    const main = document.getElementById("mainContent");

    main.innerHTML = renderEmptyState(
      "This section is not available here",
      "Switch to Interweave to access this service.",
      "building-2"
    );

    refreshIcons();

    return;
  }

  if (section === "home") return renderHomePage();

  if (section === "moving") return renderMovingPage();

  if (section === "handbook") return renderHandbookPage();

  if (section === "academics") {
    return renderServiceCategoryPage(
      "Academics & Formation",
      "Academics & Formation",
      "Find academic services, learning platforms and room facilities.",
      '<button class="btn btn-primary" data-action="open-booking-form" type="button"><i data-lucide="calendar-plus"></i> Book a room</button>'
    );
  }

  if (section === "document-support") {
    return renderServiceCategoryPage(
      "Document Support",
      "Document Support",
      "Find document-related services and their requirements."
    );
  }

  if (section === "requests") {
    return renderRequestsPage();
  }

  if (section === "careers") {
    return renderServiceCategoryPage(
      "Careers",
      "Careers",
      "Find career guidance, practicum information and industry opportunities."
    );
  }

  if (section === "student-life") {
    return renderServiceCategoryPage(
      "Student Life",
      "Student Life",
      "Explore student organizations, activities and campus communities.",
      '<button class="btn btn-primary" data-action="open-project-form" type="button">Share a project</button>'
    );
  }

  if (section === "health") {
    return renderServiceCategoryPage(
      "Health & Wellness",
      "Health & Wellness",
      "Find student wellness services and request an appointment.",
      '<button class="btn btn-primary" data-action="open-appointment-form" type="button"><i data-lucide="calendar-plus"></i> Request appointment</button>'
    );
  }

  // The database category remains "Support" to preserve existing records.
  // Its displayed name is IT Support, following the HCI proposal.
  if (section === "support") {
    return renderServiceCategoryPage(
      "IT Support",
      "Support",
      "Find IT support services and the office that can help."
    );
  }

  if (section === "directory") {
    return renderDirectoryPage();
  }

  if (section === "online-library") {
    return renderOnlineLibraryPage();
  }

  if (section === "pulse") {
    return renderPulsePage();
  }

  if (section === "innovation") {
    return renderInnovationPage();
  }

  if (section === "settings") {
    return renderSettingsPage();
  }

  document.getElementById("mainContent").innerHTML =
    renderEmptyState(
      "Page not found",
      "Choose a section from the navigation menu.",
      "compass"
    );
}


// =========================================================
// 17. SERVICE AND FORM DIALOGS
// =========================================================

// Open the request form for the service card the student selected.
/**
 * PURPOSE: Opens a simple request form for the selected service.
 * CONNECTED FROM: The start-request action and a service result from global search.
 * USES / HANDS OFF TO: state.selectedService and the requestForm submission handler.
 */
function openRequestDialog(service) {
  state.selectedService = service;
  showDialog(`Request: ${service.name}`, "Complete the form below. Your request is not approved until the responsible office reviews it.", `
    <form id="requestForm">
      <div class="form-field"><label for="requestDetails">Tell us what you need</label><textarea id="requestDetails" name="details" required maxlength="2000" placeholder="Describe your request and include the details the office needs."></textarea><span class="form-help">Only provide information needed to process this request.</span></div>
      <div class="form-actions"><button class="btn" type="button" data-action="close-dialog">Cancel</button><button class="btn btn-primary" type="submit">Submit request</button></div>
    </form>`);
}

// Open a room booking form using rooms loaded from the current building.
/**
 * PURPOSE: Loads rooms and opens the room-booking form.
 * CONNECTED FROM: The open-booking-form action in the Academics page.
 * USES / HANDS OFF TO: getRooms() and createBooking() after submission.
 */
async function openBookingDialog() {
  try {
    const rooms = await getRooms();
    if (!rooms.length) {
      showDialog("Book a room", "Room booking", renderEmptyState("No rooms are available to select", `Add verified rooms for ${getBuildingName()} in Supabase first.`, "door-closed"));
      return;
    }

    showDialog("Book a room", `Submit a booking request for ${getBuildingName()}. The office must confirm it.`, `
      <form id="bookingForm" class="form-grid">
        <div class="form-field full"><label for="bookingRoom">Room</label><select id="bookingRoom" name="roomId" required>${rooms.map((room) => `<option value="${room.id}">${escapeHTML(room.room_number)} · ${escapeHTML(room.name)}</option>`).join("")}</select></div>
        <div class="form-field"><label for="bookingDate">Date</label><input id="bookingDate" type="date" name="date" min="${getTodayString()}" required></div>
        <div class="form-field"><label for="bookingPeople">Number of people</label><input id="bookingPeople" type="number" name="peopleCount" min="1" step="1" required></div>
        <div class="form-field"><label for="bookingStart">Start time</label><input id="bookingStart" type="time" name="startTime" required></div>
        <div class="form-field"><label for="bookingEnd">End time</label><input id="bookingEnd" type="time" name="endTime" required></div>
        <div class="form-field full"><label for="bookingPurpose">Purpose</label><textarea id="bookingPurpose" name="purpose" required maxlength="1000"></textarea></div>
        <div class="form-actions form-field full"><button class="btn" type="button" data-action="close-dialog">Cancel</button><button class="btn btn-primary" type="submit">Send booking request</button></div>
      </form>`);
  } catch (error) {
    showToast(error.message, true);
  }
}

// Open the appointment form used by guidance, clinic and other offices.
/**
 * PURPOSE: Opens the appointment request form.
 * CONNECTED FROM: The open-appointment-form action in Health & Wellness.
 * USES / HANDS OFF TO: The appointmentForm submission handler.
 */
function openAppointmentDialog() {
  showDialog("Request an appointment", "Your request will be sent to the selected office for confirmation.", `
    <form id="appointmentForm" class="form-grid">
      <div class="form-field full"><label for="appointmentType">Appointment type</label><select id="appointmentType" name="type" required><option value="">Choose an office</option><option>Guidance appointment</option><option>Doctor consultation</option><option>Dentist consultation</option><option>School nurse appointment</option><option>Placement consultation</option></select></div>
      <div class="form-field"><label for="appointmentDate">Preferred date</label><input id="appointmentDate" type="date" name="date" min="${getTodayString()}" required></div>
      <div class="form-field"><label for="appointmentTime">Preferred time</label><input id="appointmentTime" type="time" name="time" required></div>
      <div class="form-field full"><label for="appointmentReason">Reason (optional)</label><textarea id="appointmentReason" name="reason" maxlength="1000"></textarea></div>
      <p class="form-help form-field full">This is a request only. Wait for the office to confirm the appointment. Do not use this form for emergencies.</p>
      <div class="form-actions form-field full"><button class="btn" type="button" data-action="close-dialog">Cancel</button><button class="btn btn-primary" type="submit">Send appointment request</button></div>
    </form>`);
}

// Open the form for a new project or idea submission.
/**
 * PURPOSE: Opens the Innovation Hub project/idea form.
 * CONNECTED FROM: The open-project-form action in Student Life and Innovation Hub.
 * USES / HANDS OFF TO: The projectForm submission handler.
 */
function openProjectDialog() {
  showDialog("Submit a project or idea", "Share a project that uses a campus lab, facility or tool.", `
    <form id="projectForm" class="form-grid">
      <div class="form-field full"><label for="projectTitle">Project title</label><input id="projectTitle" name="title" maxlength="150" required></div>
      <div class="form-field"><label for="projectCategory">Category</label><select id="projectCategory" name="category" required><option value="">Choose a category</option><option>Software</option><option>Hardware</option><option>Design</option><option>Research</option><option>Other</option></select></div>
      <div class="form-field"><label for="projectLab">Lab or tool used</label><input id="projectLab" name="labOrTool" maxlength="150"></div>
      <div class="form-field full"><label for="projectDescription">Short description</label><textarea id="projectDescription" name="description" maxlength="2000" required></textarea></div>
      <div class="form-field full"><label for="projectLink">Project link (optional)</label><input id="projectLink" name="link" type="url" placeholder="https://"></div>
      <div class="form-actions form-field full"><button class="btn" type="button" data-action="close-dialog">Cancel</button><button class="btn btn-primary" type="submit">Submit project</button></div>
    </form>`);
}

// Open an equipment request form for the chosen inventory record.
/**
 * PURPOSE: Opens the borrowing request form for a selected equipment record.
 * CONNECTED FROM: The borrow-equipment action in handleClick().
 * USES / HANDS OFF TO: An equipment record from state.currentEquipment.
 */
function openBorrowDialog(equipment) {
  showDialog(`Borrow ${equipment.name}`, "Send a borrowing request to the responsible office.", `
    <form id="borrowForm">
      <input type="hidden" name="equipmentId" value="${equipment.id}">
      <div class="form-field"><label for="borrowDate">Preferred pickup date</label><input id="borrowDate" type="date" name="pickupDate" min="${getTodayString()}" required></div>
      <div class="form-field" style="margin-top:14px"><label for="borrowPurpose">Purpose</label><textarea id="borrowPurpose" name="purpose" required maxlength="1000"></textarea></div>
      <div class="form-actions"><button class="btn" type="button" data-action="close-dialog">Cancel</button><button class="btn btn-primary" type="submit">Send borrow request</button></div>
    </form>`);
}

// =========================================================
// 18. GLOBAL SEARCH AND NOTIFICATIONS
// =========================================================

// Open the search dialog and give the search field keyboard focus.
/**
 * PURPOSE: Opens the global search dialog.
 * CONNECTED FROM: The sidebar search, mobile Search button and Ctrl/Cmd+K shortcut.
 * USES / HANDS OFF TO: updateSearchResults() through the global input listener.
 */
function openSearchDialog() {
  showDialog("Search Glitchwayve", "Search service names, room numbers and school offices across both buildings.", `
    <div class="form-field"><label for="globalSearchInput">Search</label><input id="globalSearchInput" class="search-input" type="search" placeholder="Enter at least two characters" autocomplete="off"></div>
    <div id="searchResults" style="margin-top:16px">${renderEmptyState("Start typing to search", "Results from both buildings will appear here.", "search")}</div>`, true);
}

// Find matching service, room and office records while the student types.
/**
 * PURPOSE: Runs the database search and displays matching services, rooms and offices.
 * CONNECTED FROM: handleInput() after the user pauses typing.
 * USES / HANDS OFF TO: searchDatabase() and the searchResults element.
 */
async function updateSearchResults(searchText) {
  const resultContainer = document.getElementById("searchResults");
  if (!resultContainer) return;
  if (searchText.trim().length < 2) {
    resultContainer.innerHTML = renderEmptyState("Start typing to search", "Enter at least two characters.", "search");
    refreshIcons();
    return;
  }

  resultContainer.innerHTML = "<p class='form-help'>Searching both buildings...</p>";
  try {
    const results = await searchDatabase(searchText);
    const resultCards = [
      ...results.services.map((record) => ({ ...record, type: "service", heading: record.name, detail: `${getBuildingName(record.building_key)}${record.area_name ? ` · ${record.area_name}` : ""} · ${record.category || "Service"}` })),
      ...results.rooms.map((record) => ({ ...record, type: "room", heading: `${record.room_number} · ${record.name}`, detail: `${getBuildingName(record.building_key)} · Room ${record.room_number}` })),
      ...results.offices.map((record) => ({ ...record, type: "office", heading: record.name, detail: `${getBuildingName(record.building_key)} · ${record.floor_label || "Floor not provided"}` }))
    ];

    resultContainer.innerHTML = resultCards.length ? `<div class="record-list">${resultCards.map((record) => `
      <button class="record-row" style="width:100%;text-align:left" type="button" data-action="open-search-result" data-kind="${record.type}" data-id="${record.id}">
        <div><h3>${escapeHTML(record.heading)}</h3><p>${escapeHTML(record.detail)}</p></div><i data-lucide="arrow-up-right"></i>
      </button>`).join("")}</div>` : renderEmptyState("No matching results", "Try another keyword or check the spelling.", "search-x");
    refreshIcons();
  } catch (error) {
    resultContainer.innerHTML = renderEmptyState("Search is unavailable", error.message, "cloud-off");
    refreshIcons();
  }
}

// Open the notification panel and show messages belonging to the signed-in student.
/**
 * PURPOSE: Loads and displays in-app notifications and read controls.
 * CONNECTED FROM: The topbar notification button and notification read actions.
 * USES / HANDS OFF TO: getNotifications(), markNotificationRead() and markAllNotificationsRead().
 */
async function openNotificationsDialog() {
  try {
    const notifications = await getNotifications();
    const unread = notifications.filter((notification) => !notification.is_read).length;
    showDialog("Notifications", "In-app notifications for your account.", `
      <div class="card-actions" style="margin-top:0;margin-bottom:12px"><button class="btn btn-small" type="button" data-action="mark-all-read" ${unread ? "" : "disabled"}>Mark all read</button></div>
      ${notifications.length ? `<div class="record-list">${notifications.map((notification) => `
        <article class="record-row"><div><h3>${escapeHTML(notification.title)}</h3><p>${escapeHTML(notification.message || "")}</p></div><div class="card-actions">${notification.is_read ? '<span class="badge">Read</span>' : `<button class="btn btn-small" data-action="mark-notification-read" data-id="${notification.id}" type="button">Mark read</button>`}</div></article>`).join("")}</div>` : renderEmptyState("No notifications", "New account notifications will appear here.", "bell")}
      <p class="form-help" style="margin-top:14px">In-app notifications only. Push notifications are not enabled.</p>`);
  } catch (error) {
    showToast(error.message, true);
  }
}

// Open a small profile dialog with the current account and sign-out option.
/**
 * PURPOSE: Displays the current account and sign-out/settings actions.
 * CONNECTED FROM: The topbar profile button.
 * USES / HANDS OFF TO: state.user and the shared dialog.
 */
function openProfileDialog() {
  showDialog("My profile", "Account currently signed in to Glitchwayve.", `
    <div class="card"><h3>${escapeHTML(state.user?.user_metadata?.full_name || "Student")}</h3><p>${escapeHTML(state.user?.email || "")}</p></div>
    <div class="card-actions"><button class="btn btn-danger" type="button" data-action="sign-out">Sign out</button><button class="btn" type="button" data-section="settings">Settings</button></div>`);
}

// Open the full navigation list from the mobile Menu button.
/**
 * PURPOSE: Displays the full navigation list in a mobile dialog.
 * CONNECTED FROM: The right-most Menu button in the mobile bottom bar.
 * USES / HANDS OFF TO: navigationItems and navigateTo().
 */

function openMobileMenu() {

  const links = getVisibleNavigationItems()
    .map((item) => `
      <button
        class="nav-link ${state.section === item.section ? "active" : ""}"
        type="button"
        data-section="${item.section}">

        <i data-lucide="${item.icon}"></i>
        ${item.label}

      </button>
    `)
    .join("");

  showDialog(
    "Dashboard menu",
    "Choose a section.",
    `<div class="sidebar-nav">${links}</div>`
  );
}


// =========================================================
// 19. FORM SUBMISSION HANDLERS
// =========================================================

// Check the booking dates and times before sending them to Supabase.
/**
 * PURPOSE: Checks that a booking date is not in the past and its end time is after its start time.
 * CONNECTED FROM: submitBookingForm().
 * USES / HANDS OFF TO: The room booking form values.
 */
function validateBooking(form) {
  const date = form.elements.date.value;
  const startTime = form.elements.startTime.value;
  const endTime = form.elements.endTime.value;
  if (date < getTodayString()) return "Choose today or a future date.";
  if (endTime <= startTime) return "The end time must be later than the start time.";
  return "";
}

// Save a service request and send the student to PULSE after success.
/**
 * PURPOSE: Checks and saves the request form, then navigates to PULSE.
 * CONNECTED FROM: handleFormSubmit() when requestForm is submitted.
 * USES / HANDS OFF TO: createRequest() and navigateTo("pulse").
 */
async function submitRequestForm(event) {
  event.preventDefault();
  const details = event.target.elements.details.value.trim();
  if (!details || !state.selectedService) return;

  try {
    const button = event.target.querySelector("button[type='submit']");
    button.disabled = true;
    button.textContent = "Submitting...";
    await createRequest(state.selectedService, details);
    closeDialog();
    showToast("Your request was submitted. It has not been approved yet.");
    navigateTo("pulse");
  } catch (error) {
    showToast(error.message, true);
    const button = event.target.querySelector("button[type='submit']");
    if (button) { button.disabled = false; button.textContent = "Submit request"; }
  }
}

// Validate and save a room booking request.
/**
 * PURPOSE: Validates and saves a room booking request.
 * CONNECTED FROM: handleFormSubmit() when bookingForm is submitted.
 * USES / HANDS OFF TO: validateBooking(), createBooking() and navigateTo("pulse").
 */
async function submitBookingForm(event) {
  event.preventDefault();
  const form = event.target;
  const validationMessage = validateBooking(form);
  if (validationMessage) { showToast(validationMessage, true); return; }

  try {
    const values = {
      roomId: form.elements.roomId.value,
      date: form.elements.date.value,
      startTime: form.elements.startTime.value,
      endTime: form.elements.endTime.value,
      purpose: form.elements.purpose.value.trim(),
      peopleCount: form.elements.peopleCount.value
    };
    await createBooking(values);
    closeDialog();
    showToast("Booking request received. Wait for the office to confirm.");
    navigateTo("pulse");
  } catch (error) {
    showToast(error.message, true);
  }
}

// Validate and save an appointment request.
/**
 * PURPOSE: Validates and saves an appointment request.
 * CONNECTED FROM: handleFormSubmit() when appointmentForm is submitted.
 * USES / HANDS OFF TO: createAppointment() and navigateTo("pulse").
 */
async function submitAppointmentForm(event) {
  event.preventDefault();
  const form = event.target;
  if (form.elements.date.value < getTodayString()) { showToast("Choose today or a future date.", true); return; }

  try {
    await createAppointment({
      type: form.elements.type.value,
      date: form.elements.date.value,
      time: form.elements.time.value,
      reason: form.elements.reason.value.trim()
    });
    closeDialog();
    showToast("Appointment request received. Waiting for the office to confirm.");
    navigateTo("pulse");
  } catch (error) {
    showToast(error.message, true);
  }
}

// Validate and save a project or idea submission.
/**
 * PURPOSE: Validates and saves a project submission, then refreshes Innovation Hub.
 * CONNECTED FROM: handleFormSubmit() when projectForm is submitted.
 * USES / HANDS OFF TO: createProject() and renderInnovationPage().
 */
async function submitProjectForm(event) {
  event.preventDefault();
  const form = event.target;
  try {
    await createProject({
      title: form.elements.title.value.trim(),
      category: form.elements.category.value,
      labOrTool: form.elements.labOrTool.value.trim(),
      description: form.elements.description.value.trim(),
      link: form.elements.link.value.trim()
    });
    closeDialog();
    showToast("Your project was submitted.");
    await renderInnovationPage();
  } catch (error) {
    showToast(error.message, true);
  }
}

// Save an equipment borrowing request.
/**
 * PURPOSE: Checks the chosen equipment and pickup date, then saves the borrow request.
 * CONNECTED FROM: handleFormSubmit() when borrowForm is submitted.
 * USES / HANDS OFF TO: state.currentEquipment and createBorrowRecord().
 */
async function submitBorrowForm(event) {
  event.preventDefault();
  const form = event.target;
  const equipment = state.currentEquipment?.find((item) => item.id === form.elements.equipmentId.value);
  if (!equipment) { showToast("This equipment could not be found. Refresh the page and try again.", true); return; }
  if (form.elements.pickupDate.value < getTodayString()) { showToast("Choose today or a future pickup date.", true); return; }

  try {
    await createBorrowRecord(equipment, form.elements.pickupDate.value, form.elements.purpose.value.trim());
    closeDialog();
    showToast("Borrowing request received. Wait for the office to confirm.");
    await renderInnovationPage();
  } catch (error) {
    showToast(error.message, true);
  }
}

// Route each submitted form to the matching form function.
/**
 * PURPOSE: Checks which form was submitted and calls the matching form function.
 * CONNECTED FROM: The document-level submit event listener registered by startGlitchwayve().
 * USES / HANDS OFF TO: signIn(), submitRequestForm(), submitBookingForm(), submitAppointmentForm(), submitProjectForm() and submitBorrowForm().
 */
async function handleFormSubmit(event) {
  if (event.target.id === "loginForm") return signIn(event);
  if (event.target.id === "requestForm") return submitRequestForm(event);
  if (event.target.id === "bookingForm") return submitBookingForm(event);
  if (event.target.id === "appointmentForm") return submitAppointmentForm(event);
  if (event.target.id === "projectForm") return submitProjectForm(event);
  if (event.target.id === "borrowForm") return submitBorrowForm(event);
}

// =========================================================
// 20. CLICK AND INPUT EVENT HANDLERS
// =========================================================

// Handle navigation clicks and all buttons that use data-action attributes.
/**
 * PURPOSE: Handles navigation and button actions across the entire website.
 * CONNECTED FROM: The document-level click event listener registered by startGlitchwayve().
 * USES / HANDS OFF TO: Routing functions, Supabase write functions, dialogs, settings and toast messages.
 */
async function handleClick(event) {
  if (event.target.classList.contains("dialog-backdrop")) return closeDialog();

  const sectionButton = event.target.closest("[data-section]");
  if (sectionButton && !sectionButton.dataset.action) {
    const section = sectionButton.dataset.section;
    if (section === "search") { openSearchDialog(); return; }
    closeDialog();
    navigateTo(section);
    return;
  }

  const button = event.target.closest("[data-action]");
  if (!button) return;
  const action = button.dataset.action;
  const id = button.dataset.id;

  if (action === "switch-building") return setBuilding(button.dataset.building);
  if (action === "open-search") return openSearchDialog();
  if (action === "open-menu") return openMobileMenu();
  if (action === "open-notifications") return openNotificationsDialog();
  if (action === "open-profile") return openProfileDialog();
  if (action === "close-dialog") return closeDialog();
  if (action === "navigate") { closeDialog(); return navigateTo(button.dataset.section); }
  if (action === "sign-out") return signOut();
  if (action === "reload-page") return renderCurrentPage();
  if (action === "toggle-dismissed") {
    state.showDismissed = !state.showDismissed;
    return renderHomePage();
  }
  if (action === "dismiss-announcement") {
    try { await dismissAnnouncement(id); showToast("Announcement hidden."); await renderHomePage(); }
    catch (error) { showToast(error.message, true); }
    return;
  }
  if (action === "restore-announcement") {
    try { await restoreAnnouncement(id); showToast("Announcement restored."); await renderHomePage(); }
    catch (error) { showToast(error.message, true); }
    return;
  }
  if (action === "select-floor") { state.selectedFloorId = id; return renderMovingPage(); }
  if (action === "start-request") {
    const service = state.currentServices.find((item) => item.id === id);
    if (service) openRequestDialog(service);
    return;
  }
  if (action === "open-booking-form") return openBookingDialog();
  if (action === "open-appointment-form") return openAppointmentDialog();
  if (action === "open-project-form") return openProjectDialog();
  if (action === "borrow-equipment") {
    const equipment = state.currentEquipment?.find((item) => item.id === id);
    if (equipment) openBorrowDialog(equipment);
    return;
  }
  if (action === "return-equipment") {
    try { await returnBorrowedItem(id); showToast("Item marked as returned."); await renderInnovationPage(); }
    catch (error) { showToast(error.message, true); }
    return;
  }
  if (action === "mark-notification-read") {
    try { await markNotificationRead(id); await openNotificationsDialog(); }
    catch (error) { showToast(error.message, true); }
    return;
  }
  if (action === "mark-all-read") {
    try { await markAllNotificationsRead(); await openNotificationsDialog(); showToast("Notifications marked as read."); }
    catch (error) { showToast(error.message, true); }
    return;
  }
  if (action === "copy-email") {
    try { await navigator.clipboard.writeText(button.dataset.email); showToast("Email address copied."); }
    catch (error) { showToast("The email address could not be copied.", true); }
    return;
  }
  if (action === "text-size") {
    state.textSize = button.dataset.size;
    localStorage.setItem("glitchwayve-text-size", state.textSize);
    applyAccessibilitySettings();
    showToast("Text size updated.");
    return;
  }
  if (action === "toggle-contrast") {
    state.highContrast = !state.highContrast;
    localStorage.setItem("glitchwayve-high-contrast", String(state.highContrast));
    applyAccessibilitySettings();
    return renderSettingsPage();
  }
  if (action === "confirm-reset") {
    showDialog("Reset my data?", "This cannot be undone. Shared services, offices, rooms and announcements will not be deleted.", `
      <p>Only personal records connected to your signed-in account will be removed.</p>
      <div class="form-actions"><button class="btn" type="button" data-action="close-dialog">Cancel</button><button class="btn btn-danger" type="button" data-action="reset-my-data">Delete my records</button></div>`);
    return;
  }
  if (action === "reset-my-data") {
    try { await resetMyData(); closeDialog(); showToast("Your personal records have been deleted."); navigateTo("pulse"); }
    catch (error) { showToast(error.message, true); }
    return;
  }
  if (action === "open-search-result") {
    const kind = button.dataset.kind;
    closeDialog();
    if (kind === "service") {
      const serviceResult = await supabaseClient.from("services").select("*").eq("id", id).maybeSingle();
      if (serviceResult.error) { showToast(serviceResult.error.message, true); return; }
      if (serviceResult.data) {
        state.building = serviceResult.data.building_key;
        document.documentElement.dataset.building = state.building;
        location.hash = `#/${state.building}/requests`;
        state.currentServices = [serviceResult.data];
        window.setTimeout(() => openRequestDialog(serviceResult.data), 100);
      }
    } else if (kind === "room") {
      const roomResult = await supabaseClient.from("rooms").select("*").eq("id", id).maybeSingle();
      if (roomResult.error) { showToast(roomResult.error.message, true); return; }
      if (roomResult.data) {
        state.building = roomResult.data.building_key;
        state.selectedFloorId = roomResult.data.floor_id;
        document.documentElement.dataset.building = state.building;
        navigateTo("moving");
      }
    } else if (kind === "office") {
      const officeResult = await supabaseClient.from("offices").select("*").eq("id", id).maybeSingle();
      if (officeResult.error) { showToast(officeResult.error.message, true); return; }
      if (officeResult.data) {
        state.building = officeResult.data.building_key;
        document.documentElement.dataset.building = state.building;
        navigateTo("directory");
      }
    }
    return;
  }
}

// Wait briefly after each search keystroke before sending a database query.
/**
 * PURPOSE: Waits briefly after the user types in global search, then updates results.
 * CONNECTED FROM: The document-level input event listener registered by startGlitchwayve().
 * USES / HANDS OFF TO: updateSearchResults() and searchDatabase().
 */
function handleInput(event) {
  if (event.target.id !== "globalSearchInput") return;
  window.clearTimeout(state.searchTimer);
  const searchText = event.target.value;
  state.searchTimer = window.setTimeout(() => updateSearchResults(searchText), 250);
}

// =========================================================
// 21. START THE WEBSITE
// =========================================================

// Connect the page events, restore accessibility settings and check Supabase login.
/**
 * PURPOSE: Starts the application by registering events, applying saved settings and checking the login session.
 * CONNECTED FROM: Called once at the bottom of script.js.
 * USES / HANDS OFF TO: All global event handlers, Supabase Auth and checkExistingSession().
 */
function startGlitchwayve() {
  applyAccessibilitySettings();
  document.addEventListener("submit", handleFormSubmit);
  document.addEventListener("click", handleClick);
  document.addEventListener("input", handleInput);
  window.addEventListener("hashchange", handleRouteChange);

  // Ctrl+K or Command+K opens the global search dialog.
  document.addEventListener("keydown", function (event) {
    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "k") {
      event.preventDefault();
      if (state.user) openSearchDialog();
    }
    if (event.key === "Escape") closeDialog();

    // Arrow keys move between the two building choices for keyboard users.
    if (event.target.matches(".building-option") && ["ArrowLeft", "ArrowRight"].includes(event.key)) {
      event.preventDefault();
      const nextBuilding = state.building === "interweave" ? "glitch" : "interweave";
      setBuilding(nextBuilding);
    }
  });

  // Keep the current user in memory when Supabase changes the login session.
  if (supabaseClient) {
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      state.user = session?.user || null;
      if (!session) {
        document.getElementById("dashboard").hidden = true;
        document.getElementById("loginScreen").hidden = false;
        renderLoginScreen();
      }
    });
  }

  checkExistingSession();
}

// Run the application after the HTML and CDN scripts have loaded.
startGlitchwayve();

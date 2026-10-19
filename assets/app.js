import {
  auth,
  db,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
 collection,
addDoc,
onSnapshot,
doc,
  getDoc,
  getDocs,
  query,
  where,
  writeBatch,
  updateDoc,
   setDoc,
  serverTimestamp
} from "./firebase-config.js";


/*
  Lesego Electrical Services Website

  Firebase Authentication:
  - Customer registration
  - Customer login
  - Logout
  - Persistent authentication sessions

  IMPORTANT:
  Bookings, messages, quotations, enquiries and reviews
  are currently browser-only demonstrations.
  Firestore integration will be added separately.
*/

(() => {
  "use strict";

  const KEY = "lesego_web_demo_v1";

  const services = [
    ["⚡", "Fault finding & repairs",
      "Diagnose tripping circuits, power outages and faulty sockets."],
    ["⌂", "Residential installations",
      "Lighting, rewiring, DB boards and home improvements."],
    ["▤", "Commercial electrical",
      "Electrical maintenance and upgrades for workplaces."],
    ["☀", "Solar & backup power",
      "Solar, inverters and backup-power consultations."],
    ["◉", "Safety inspections",
      "Electrical inspections and compliance assessments."],
    ["✦", "Preventive maintenance",
      "Planned servicing to keep systems running safely."]
  ];

  const seed = () => ({
    bookings: [],
    messages: [],
    reviews: [],
    enquiries: [],
    applications: []
  });

 let demoDb;

  try {
    demoDb = JSON.parse(localStorage.getItem(KEY)) || seed();
  } catch {
     demoDb = seed();
  }

  const save = () => {
    localStorage.setItem(KEY, JSON.stringify(db));
  };

  let session = null;
  let tab = "bookings";
  let authReady = false;

  const el = () => document.getElementById("main");

  const esc = value =>
    String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;"
    }[char]));

  const toast = message => {
    const element = document.getElementById("toast");

    if (!element) {
      console.log(message);
      return;
    }

    element.textContent = message;
    element.classList.add("show");

    clearTimeout(window.__lesegoToast);

    window.__lesegoToast = setTimeout(() => {
      element.classList.remove("show");
    }, 4300);
  };

  const id = () =>
    "LES-" +
    Date.now().toString(36).toUpperCase() +
    Math.random().toString(36).slice(2, 6).toUpperCase();

  const formatDate = value =>
    value
      ? new Date(value).toLocaleDateString("en-ZA")
      : "—";

  const badge = value => {
    const status = String(value || "—");

    const style = ["Completed", "Accepted", "Approved"].includes(status)
      ? "done"
      : ["Cancelled", "Declined"].includes(status)
        ? "bad"
        : ["Pending", "Requested"].includes(status)
          ? "warn"
          : "";

    return `<span class="tag ${style}">${esc(status)}</span>`;
  };

  const header = (title, description) => `
    <section class="page-hero">
      <div class="container">
        <div class="eyebrow">LESEGO / ${esc(title)}</div>
        <h1>${esc(title)}</h1>
        <p>${esc(description)}</p>
      </div>
    </section>
  `;

  const section = (content, extra = "") => `
    <section class="section ${extra}">
      <div class="container">${content}</div>
    </section>
  `;

  const btn = (label, route, style = "btn-primary") => `
    <a class="btn ${style}" href="#${route}">
      ${label}
    </a>
  `;

  const card = (title, content) => `
    <article class="card">
      <h3>${title}</h3>
      ${content}
    </article>
  `;

  const notice = text => `
    <div class="notice">${text}</div>
  `;

  const illustration = `
    <svg
      class="illustration"
      viewBox="0 0 500 460"
      role="img"
      aria-label="Illustration of a home"
    >
      <defs>
        <linearGradient id="homeGradient" x1="0" y1="0" x2="1" y2="1">
          <stop stop-color="#274d6e"/>
          <stop offset="1" stop-color="#0b1e36"/>
        </linearGradient>
      </defs>

      <circle cx="250" cy="218" r="188"
        fill="#ffffff" opacity=".055"/>

      <circle cx="250" cy="218" r="155"
        fill="#ffffff" opacity=".05"/>

      <path d="M70 219 250 77 430 219"
        stroke="#ffcf40"
        stroke-width="25"
        stroke-linecap="round"
        stroke-linejoin="round"
        fill="none"/>

      <path d="M113 215 250 108 387 215V378H113Z"
        fill="url(#homeGradient)"
        stroke="#7fa2c0"
        stroke-width="4"/>

      <path d="M210 378V265h80v113" fill="#ffd459"/>

      <rect x="141" y="242" width="55" height="57"
        rx="5" fill="#c3e8ff"/>

      <rect x="304" y="242" width="55" height="57"
        rx="5" fill="#c3e8ff"/>

      <path d="m269 151-51 81h37l-22 65 63-91h-38z"
        fill="#ffcf40"/>
    </svg>
  `;

  const pages = {
notifications: () => notificationsPage(),

    home: () => `
      <section class="hero">
        <div class="container hero-inner">
          <div>
            <div class="eyebrow">
              Dependable power. Everyday peace of mind.
            </div>

            <h1>
              Electrical care that
              <span>keeps life moving.</span>
            </h1>

            <p>
              From small home repairs to commercial maintenance,
              Lesego makes it simpler to request, manage and
              track electrical services.
            </p>

            <div class="actions">
              ${btn("Book a service →", "booking")}
              ${btn("Explore services", "services", "btn-outline")}
            </div>

            <p style="font-size:12px;margin-top:25px">
              Demonstration website — actual appointments require confirmation.
            </p>
          </div>

          <div class="hero-visual">
            ${illustration}
            <div class="float-card one">⚡ Simple online booking</div>
            <div class="float-card two">✓ Track every job</div>
          </div>
        </div>
      </section>

      <div class="trust-strip">
        <div class="container trust-items">
          <span>✓ Clear service requests</span>
          <span>✓ Transparent quotations</span>
          <span>✓ Job progress tracking</span>
          <span>✓ Direct communication</span>
        </div>
      </div>

      ${section(`
        <div class="section-heading">
          <div>
            <div class="eyebrow">What we do</div>
            <h2>Solutions for every space.</h2>
          </div>
          ${btn("All services →", "services", "btn-outline-dark")}
        </div>

        <div class="grid grid-3">
          ${services.slice(0, 3).map(service => `
            <article class="card">
              <div class="service-icon">${service[0]}</div>
              <h3>${service[1]}</h3>
              <p>${service[2]}</p>
              <a class="link-arrow" href="#booking">
                Request service →
              </a>
            </article>
          `).join("")}
        </div>
      `)}

      ${section(`
        <div class="feature-panel">
          <div>
            <div class="eyebrow">A better way to book</div>
            <h2>One place. From request to resolution.</h2>
            <p>
              Describe your issue, follow your requests and
              manage your service information.
            </p>
            ${btn("Get started →", "register")}
          </div>

          <div class="steps">
            <div class="step">
              <span class="step-num">1</span>
              <div>
                <h3>Describe your request</h3>
                <p>Choose a service and preferred appointment.</p>
              </div>
            </div>

            <div class="step">
              <span class="step-num">2</span>
              <div>
                <h3>Review your quotation</h3>
                <p>Quotation management is demonstrated locally.</p>
              </div>
            </div>

            <div class="step">
              <span class="step-num">3</span>
              <div>
                <h3>Follow the progress</h3>
                <p>Track demonstration booking statuses.</p>
              </div>
            </div>
          </div>
        </div>
      `, "alt")}

      ${section(`
        <div class="cta">
          <div>
            <div class="eyebrow">Ready when you are</div>
            <h2>Let's get your power sorted.</h2>
            <p>Start with a quick service request.</p>
          </div>
          ${btn("Request a booking →", "booking", "btn-dark")}
        </div>
      `)}
    `,

    services: () =>
      header(
        "Our services",
        "Electrical solutions for homes and businesses."
      ) +
      section(`
        <div class="grid grid-3">
          ${services.map(service => `
            <article class="card">
              <div class="service-icon">${service[0]}</div>
              <h3>${service[1]}</h3>
              <p>${service[2]}</p>
              <a class="link-arrow" href="#booking">
                Book this service →
              </a>
            </article>
          `).join("")}
        </div>

        ${notice(
          "All electrical work must be performed by appropriately qualified professionals. Prices and availability require confirmation."
        )}
      `),

    about: () =>
      header(
        "About Lesego",
        "Service, safety and simplicity."
      ) +
      section(`
        <div class="split">
          <div>
            <div class="eyebrow">Our approach</div>
            <h2>Reliable service, without the guesswork.</h2>

            <p>
              Lesego Electrical Services is a digital
              service-management concept designed to help
              customers request electrical work.
            </p>

            <p>
              The platform supports customer accounts,
              service bookings and organised communication.
            </p>

            <ul class="check-list">
              <li>Customer-centred service</li>
              <li>Organised bookings</li>
              <li>Clear service records</li>
              <li>Web and mobile support</li>
            </ul>
          </div>

          <div class="portrait" aria-hidden="true">ϟ</div>
        </div>
      `),

    contractors: () =>
      header(
        "Our electricians",
        "Electrical service support and assignment tracking."
      ) +
      section(`
        <div class="grid grid-3">
          ${card(
            "⚡ Residential expertise",
            "<p>Home electrical repairs, lighting and installations.</p>"
          )}

          ${card(
            "▤ Business support",
            "<p>Maintenance and fault finding for workplaces.</p>"
          )}

          ${card(
            "✓ Job coordination",
            "<p>Organised service requests and assignments.</p>"
          )}
        </div>

        ${notice(
          "Individual electrician qualifications and availability have not been verified for this demonstration."
        )}

        ${btn("Request a booking", "booking")}
      `),

    register: () =>
      header(
        "Create an account",
        "Register securely with Firebase Authentication."
      ) +
      section(`
        <div class="form-shell card">
          <h2>Create your customer account</h2>

          <p>
            Register to access your Lesego customer dashboard.
          </p>

          <form id="registerForm">
            <div class="form-grid">
              <div class="field">
                <label for="regName">Full name *</label>
                <input
                  id="regName"
                  name="name"
                  type="text"
                  autocomplete="name"
                  maxlength="80"
                  required
                >
              </div>

              <div class="field">
                <label for="regEmail">Email address *</label>
                <input
                  id="regEmail"
                  name="email"
                  type="email"
                  autocomplete="email"
                  maxlength="120"
                  required
                >
              </div>
            </div>

            <div class="field">
              <label for="regPhone">Phone number (optional)</label>
              <input
                id="regPhone"
                name="phone"
                type="tel"
                autocomplete="tel"
                maxlength="25"
              >
            </div>

            <div class="field">
              <label for="regPassword">Password *</label>
              <input
                id="regPassword"
                name="password"
                type="password"
                autocomplete="new-password"
                minlength="6"
                required
              >
            </div>

            <div class="field">
              <label for="regConfirmPassword">
                Confirm password *
              </label>
              <input
                id="regConfirmPassword"
                name="confirmPassword"
                type="password"
                autocomplete="new-password"
                minlength="6"
                required
              >
            </div>

            <button class="btn btn-primary" type="submit">
              Create account →
            </button>
          </form>

          <p class="hint" style="margin-top:15px">
            Already registered?
            <a href="#login">Sign in here</a>
          </p>
        </div>
      `),

    login: () =>
      header(
        "Welcome back",
        "Sign in to your Lesego customer account."
      ) +
      section(`
        <div class="form-shell card">
          <h2>Customer login</h2>

          <p>Sign in using your registered email and password.</p>

          <form id="loginForm">
            <div class="field">
              <label for="loginEmail">Email address *</label>
              <input
                id="loginEmail"
                name="email"
                type="email"
                autocomplete="email"
                required
              >
            </div>

            <div class="field">
              <label for="loginPassword">Password *</label>
              <input
                id="loginPassword"
                name="password"
                type="password"
                autocomplete="current-password"
                required
              >
            </div>

            <button class="btn btn-primary" type="submit">
              Sign in →
            </button>
          </form>

          <p class="hint" style="margin-top:15px">
            Don't have an account?
            <a href="#register">Register here</a>
          </p>
        </div>
      `),

    booking: () => {
      if (!session) {
        return header(
          "Book an electrical service",
          "Sign in to request a service."
        ) + section(`
          <div class="form-shell card">
            <h2>Sign in to book</h2>
            <p>Bookings are linked to your customer account.</p>
            ${btn("Sign in", "login")}
            ${btn("Create account", "register", "btn-outline-dark")}
          </div>
        `);
      }

      return header(
        "Book an electrical service",
        "Create a demonstration service request."
      ) + section(`
        <div class="form-shell card">
          <h2>New service request</h2>

          <form id="bookingForm">
            <div class="form-grid">
              <div class="field">
                <label for="service">Service *</label>
                <select id="service" name="service" required>
                  <option value="">Select a service</option>
                  
${firebaseServices.map(service => `
  <option value="${esc(service.id)}">
    ${esc(service.title)}
  </option>
`).join("")}

                </select>
              </div>

              <div class="field">
                <label for="date">Preferred date *</label>
                <input
                  id="date"
                  name="date"
                  type="date"
                  min="${new Date().toLocaleDateString("en-CA")}"
                  required
                >
              </div>

              <div class="field">
                <label for="time">Preferred time *</label>
                <select id="time" name="time" required>
                  <option value="">Select time</option>
                  ${[
                    "08:00", "09:00", "10:00", "11:00",
                    "12:00", "13:00", "14:00", "15:00",
                    "16:00"
                  ].map(t => `<option>${t}</option>`).join("")}
                </select>
              </div>

              <div class="field">
                <label for="phone">Phone number *</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  pattern="[0-9+ ()-]{9,18}"
                  required
                >
              </div>
            </div>

            <div class="field">
              <label for="address">Service address *</label>
              <input
                id="address"
                name="address"
                maxlength="200"
                required
              >
            </div>

            <div class="field">
              <label for="details">Describe the issue *</label>
              <textarea
                id="details"
                name="details"
                maxlength="1000"
                required
              ></textarea>
            </div>

            ${notice(
              "Demo booking only: this request is stored in this browser, not Firebase. No electrician is notified."
            )}

            <button class="btn btn-primary" type="submit">
              Submit demo request →
            </button>
          </form>
        </div>
      `);
    },

    contact: () =>
      header(
        "Get in touch",
        "Questions about our services?"
      ) +
      section(`
        <div class="split">
          <div>
            <div class="eyebrow">Contact Lesego</div>
            <h2>Let's talk about your project.</h2>

            <p>
              Send a demonstration enquiry about bookings,
              quotations or electrical services.
            </p>

            ${notice(
              "This form does not send email. Official contact details must be verified before public launch."
            )}
          </div>

          <div class="card">
            <form id="contactForm">
              <div class="field">
                <label>Name *</label>
                <input name="name" maxlength="80" required>
              </div>

              <div class="field">
                <label>Email *</label>
                <input name="email" type="email" required>
              </div>

              <div class="field">
                <label>Topic *</label>
                <select name="topic" required>
                  <option value="">Select</option>
                  <option>General enquiry</option>
                  <option>Booking support</option>
                  <option>Quotation</option>
                  <option>Other</option>
                </select>
              </div>

              <div class="field">
                <label>Message *</label>
                <textarea
                  name="message"
                  maxlength="1500"
                  required
                ></textarea>
              </div>

              <button class="btn btn-primary" type="submit">
                Save demo enquiry →
              </button>
            </form>
          </div>
        </div>
      `),

    support: () =>
      header(
        "Help & support",
        "Answers to common questions."
      ) +
      section(`
        <div class="grid grid-2">
          <div>
            <h2>Frequently asked questions</h2>

            <div class="faq">
              <details>
                <summary>How do I register?</summary>
                <p>
                  Open Register and create a customer account
                  using your email address and password.
                </p>
              </details>

              <details>
                <summary>How do I sign in?</summary>
                <p>
                  Open Sign in and enter your Firebase
                  account credentials.
                </p>
              </details>

              <details>
                <summary>Can I book an electrician?</summary>
                <p>
                  You can create a demonstration booking.
                  Live booking integration is still in development.
                </p>
              </details>

              <details>
                <summary>Where are my bookings saved?</summary>
                <p>
                  Currently in this browser only.
                  Cloud Firestore integration is planned.
                </p>
              </details>

              <details>
                <summary>Are passwords stored in the browser?</summary>
                <p>
                  No. Customer passwords are handled through
                  Firebase Authentication.
                </p>
              </details>
            </div>
          </div>

          <div>
            ${card(
              "Need help?",
              `<p>Contact us using the enquiry form.</p>
               ${btn("Contact us", "contact")}`
            )}

            <div style="height:20px"></div>

            ${card(
              "Electrical safety",
              "<p>Keep clear of exposed wires, smoke, sparks and unsafe equipment. Contact a qualified emergency service provider when necessary.</p>"
            )}
          </div>
        </div>
      `),

    careers: () =>
      header(
        "Careers & opportunities",
        "Interested in electrical services?"
      ) +
      section(`
        <div class="split">
          <div>
            <h2>Build a career with purpose.</h2>
            <p>
              Electricians, apprentices and support staff
              contribute to safe electrical services.
            </p>

            ${notice(
              "This is a demonstration interest form, not a formal job application."
            )}
          </div>

          <div class="card">
            <h3>Register your interest</h3>

            <form id="careerForm">
              <div class="field">
                <label>Name *</label>
                <input name="name" required>
              </div>

              <div class="field">
                <label>Email *</label>
                <input name="email" type="email" required>
              </div>

              <div class="field">
                <label>Area of interest *</label>
                <select name="area" required>
                  <option value="">Select</option>
                  <option>Electrician</option>
                  <option>Apprenticeship</option>
                  <option>Customer support</option>
                  <option>Administration</option>
                </select>
              </div>

              <div class="field">
                <label>Introduction</label>
                <textarea
                  name="intro"
                  maxlength="1000"
                ></textarea>
              </div>

              <button class="btn btn-primary" type="submit">
                Save demo interest →
              </button>
            </form>
          </div>
        </div>
      `),

    privacy: () =>
      header(
        "Privacy information",
        "How this website handles information."
      ) +
      section(`
        <div class="card">
          <h2>Authentication and demonstration data</h2>

          <p>
            Firebase Authentication manages customer
            email/password accounts.
          </p>

          <p>
            Demonstration bookings, messages, enquiries and
            reviews are currently saved in browser localStorage.
          </p>

          <p>
            A complete privacy notice, retention policy and
            POPIA review are required before public launch.
          </p>
        </div>
      `),

    terms: () =>
      header(
        "Terms of use",
        "Important service limitations."
      ) +
      section(`
        <div class="card">
          <h2>Demonstration website</h2>

          <p>
            Booking requests and service records are illustrative.
            No real appointment or payment is processed.
          </p>

          <p>
            Firebase Authentication is used for customer accounts.
            Other backend features remain under development.
          </p>
        </div>
      `)
  };


let firebaseBookings = [];
let bookingsLoading = false;
let bookingsError = "";

function myBookings() {
  return session ? firebaseBookings : [];
}

let firebaseQuotes = [];

let firebaseChangeRequests = [];
let firebaseNotifications = [];
let firebaseMessages = [];
let firebaseReviews = [];
let loadedMessagesBookingId = null;
let unsubscribeMessages = null;



async function sendFirebaseMessage(bookingId, messageText) {
  const user = auth.currentUser;

  if (!user) {
    toast("Please sign in first.");
    return false;
  }

  const booking = myBookings().find(
    item => item.id === bookingId
  );

  if (!booking) {
    toast("Booking not found.");
    return false;
  }

  const text = messageText.trim();

  if (!text || text.length > 2000) {
    toast("Please enter a message of up to 2000 characters.");
    return false;
  }

  try {
    await addDoc(
      collection(db, "booking_messages", bookingId, "messages"),
      {
        bookingId: bookingId,
        senderId: user.uid,
        text: text,
        createdAt: serverTimestamp()
      }
    );

    toast("Message sent successfully!");

    await loadFirebaseMessages(bookingId);

    return true;

  } catch (error) {
    console.error("Unable to send message:", error);
    toast("Unable to send message: " + error.message);
    return false;
  }
}


function listenToFirebaseMessages(bookingId) {
  const user = auth.currentUser;

  // Stop listening to the previous conversation.
  if (unsubscribeMessages) {
    unsubscribeMessages();
    unsubscribeMessages = null;
  }

  firebaseMessages = [];
  loadedMessagesBookingId = bookingId;

  if (!user) return;

  const userId = user.uid;

  const messagesRef = collection(
    db,
    "booking_messages",
    bookingId,
    "messages"
  );

  unsubscribeMessages = onSnapshot(
    messagesRef,
    snapshot => {
      if (
        auth.currentUser?.uid !== userId ||
        loadedMessagesBookingId !== bookingId
      ) {
        return;
      }

      firebaseMessages = snapshot.docs.map(messageDoc => ({
        id: messageDoc.id,
        ...messageDoc.data()
      }));

      firebaseMessages.sort((a, b) => {
        return (a.createdAt?.seconds || 0) -
               (b.createdAt?.seconds || 0);
      });

      // Update the conversation when a new message arrives.
      if (
        decodeURIComponent(location.hash.slice(1)) ===
        `messages/${bookingId}`
      ) {
        render();
      }
    },
    error => {
      console.error("Real-time messaging error:", error);
      toast("Unable to receive live messages.");
    }
  );
}

async function loadFirebaseReviews() {
  const user = auth.currentUser;

  if (!user) {
    firebaseReviews = [];
    return;
  }

  try {
    const reviewsRef = collection(db, "reviews");

    const reviewsQuery = query(
      reviewsRef,
      where("customerId", "==", user.uid)
    );

    const snapshot = await getDocs(reviewsQuery);

    // Prevent reviews from another account appearing.
    if (auth.currentUser?.uid !== user.uid) return;

    firebaseReviews = snapshot.docs.map(reviewDoc => ({
      id: reviewDoc.id,
      ...reviewDoc.data()
    }));

    firebaseReviews.sort((a, b) =>
      (b.createdAt?.seconds || 0) -
      (a.createdAt?.seconds || 0)
    );

    render();

  } catch (error) {
    console.error("Error loading reviews:", error);
    toast("Unable to load your reviews.");
  }
}

async function loadFirebaseMessages(bookingId) {
  const user = auth.currentUser;

  if (!user) {
    firebaseMessages = [];
    return;
  }

  const booking = myBookings().find(
    item => item.id === bookingId
  );

  if (!booking) {
    firebaseMessages = [];
    toast("Booking not found.");
    return;
  }

 
const requestedUserId = user.uid;

loadedMessagesBookingId = bookingId;
firebaseMessages = [];


  try {
    const messagesRef = collection(
      db,
      "booking_messages",
      bookingId,
      "messages"
    );

    const snapshot = await getDocs(messagesRef);

    if (auth.currentUser?.uid !== requestedUserId) {
      return;
    }

    firebaseMessages = snapshot.docs.map(messageDoc => ({
      id: messageDoc.id,
      ...messageDoc.data()
    }));
   loadedMessagesBookingId = bookingId;
    firebaseMessages.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;

      return timeA - timeB;
    });

    console.log(
      "Firebase messages loaded:",
      firebaseMessages.length
    );

    render();

  } catch (error) {
    console.error("Unable to load Firebase messages:", error);
    toast("Unable to load messages from Firebase.");
  }
}

async function loadFirebaseNotifications() {
  const user = auth.currentUser;

  if (!user) {
    firebaseNotifications = [];
    return;
  }

  const userId = user.uid;

  try {
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("userId", "==", userId)
    );

    const snapshot = await getDocs(notificationsQuery);

    if (auth.currentUser?.uid !== userId) return;

    firebaseNotifications = snapshot.docs.map(
      notificationDoc => ({
        id: notificationDoc.id,
        ...notificationDoc.data()
      })
    );

    firebaseNotifications.sort((a, b) => {
      const timeA = a.createdAt?.seconds || 0;
      const timeB = b.createdAt?.seconds || 0;
      return timeB - timeA;
    });

    console.log(
      "Firebase notifications loaded:",
      firebaseNotifications.length
    );

    render();

  } catch (error) {
    if (auth.currentUser?.uid !== userId) return;

    console.error(
      "Unable to load notifications:",
      error
    );
  }
}

async function loadFirebaseChangeRequests() {
  const user = auth.currentUser;

  if (!user) {
    firebaseChangeRequests = [];
    return;
  }

  const userId = user.uid;

  try {
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("userId", "==", userId)
    );

    const bookingSnapshot = await getDocs(bookingsQuery);

    const requestSnapshots = await Promise.all(
      bookingSnapshot.docs.map(bookingDoc =>
        getDoc(
          doc(
            db,
            "booking_change_requests",
            bookingDoc.id
          )
        )
      )
    );

    if (auth.currentUser?.uid !== userId) return;

    firebaseChangeRequests = requestSnapshots
      .filter(snapshot => snapshot.exists())
      .map(snapshot => ({
        id: snapshot.id,
        ...snapshot.data()
      }));

    console.log(
      "Firebase change requests loaded:",
      firebaseChangeRequests.length
    );

    render();

  } catch (error) {
    console.error(
      "Unable to load booking change requests:",
      error
    );
  }
}

async function loadFirebaseQuotes() {
  const user = auth.currentUser;

  if (!user) {
    firebaseQuotes = [];
    return;
  }

  const userId = user.uid;

  try {
    // Retrieve only bookings owned by this customer.
    const bookingQuery = query(
      collection(db, "bookings"),
      where("userId", "==", userId)
    );

    const bookingSnapshot = await getDocs(bookingQuery);

    // Each quotation uses its booking's document ID.
    const quoteSnapshots = await Promise.all(
      bookingSnapshot.docs.map(bookingDoc =>
        getDoc(doc(db, "quotes", bookingDoc.id))
      )
    );

    // Prevent results from appearing after account changes.
    if (auth.currentUser?.uid !== userId) return;

    firebaseQuotes = quoteSnapshots
      .filter(snapshot => snapshot.exists())
      .map(snapshot => ({
        id: snapshot.id,
        ...snapshot.data()
      }));

    console.log(
      "Firebase quotations loaded:",
      firebaseQuotes.length
    );

    render();

  } catch (error) {
    if (auth.currentUser?.uid !== userId) return;

    console.error("Unable to load quotations:", error);
    toast("Unable to load quotations from Firebase.");
  }
}


async function loadFirebaseBookings() {
  const user = auth.currentUser;

  if (!user) {
    firebaseBookings = [];
    bookingsError = "";
    render();
    return;
  }

  const requestedUserId = user.uid;

  bookingsLoading = true;
  bookingsError = "";
  render();

  try {
    const bookingsQuery = query(
      collection(db, "bookings"),
      where("userId", "==", requestedUserId)
    );

    const snapshot = await getDocs(bookingsQuery);

    // Avoid displaying another account's results if
    // the user signs out while the query is running.
    if (auth.currentUser?.uid !== requestedUserId) return;

    firebaseBookings = snapshot.docs.map(bookingDoc => {
      const data = bookingDoc.data();

      return {
        id: bookingDoc.id,
        reference: data.reference || bookingDoc.id,
        uid: data.userId,
        customer: data.customerName || "",
        service: data.serviceName || "",
        date: data.preferredDate || "",
        time: data.preferredTime || "",
        address: data.serviceAddress || "",
        details: data.notes || "",
        status: data.status || "pending",
        quote: data.price ?? null,
        quoteStatus: ""
      };
    });

    console.log(
      "Firebase bookings loaded:",
      firebaseBookings.length
    );

  } catch (error) {
    if (auth.currentUser?.uid !== requestedUserId) return;

    console.error("Unable to load Firebase bookings:", error);
    bookingsError = "Unable to load bookings from Firebase.";

  } finally {
    if (auth.currentUser?.uid === requestedUserId) {
      bookingsLoading = false;
      render();
    }
  }
}


  function bookingRows(bookings) {
    if (bookingsLoading) {
  return `<div class="card">Loading your bookings...</div>`;
}

if (bookingsError) {
  return `<div class="card">${esc(bookingsError)}</div>`;
}
    if (!bookings.length) {
      return `
        <div class="card empty">
         No bookings found. Create your first electrical service booking.
        </div>
      `;
    }

    return `
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Booking</th>
              <th>Service</th>
              <th>Appointment</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            ${bookings.map(booking => `
              <tr>
                <td><strong>${esc(booking.reference || booking.id)}</strong></td>
                <td>${esc(booking.service)}</td>
                <td>
                  ${esc(booking.date)}
                  <br>
                  ${esc(booking.time)}
                </td>
                <td>${badge(booking.status)}</td>
                <td>
                  <a
                    class="link-arrow"
                    href="#job/${encodeURIComponent(booking.id)}"
                  >
                    View details →
                  </a>
                </td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function dashboardTab() {
    if (!session) return "";

    if (tab === "bookings") {
      return bookingRows(myBookings());
    }

if (tab === "messages") {
  const bookings = myBookings();

  return `
    <div class="card">
      <h2>My Conversations</h2>

      <p class="muted">
        Select a booking to communicate with your assigned electrician.
      </p>

      ${bookings.length === 0 ? `
        <p>You have no bookings yet.</p>
      ` : bookings.map(booking => `
        <div class="card">
          <h3>${esc(booking.service)}</h3>

          <p>
            <strong>Booking:</strong>
            ${esc(booking.reference || booking.id)}
          </p>

          <p>
            <strong>Status:</strong>
            ${badge(booking.status)}
          </p>

          <a
            class="btn btn-outline-dark"
            href="#messages/${encodeURIComponent(booking.id)}"
          >
            💬 Open Conversation
          </a>
        </div>
      `).join("")}
    </div>
  `;
}


    if (tab === "reviews") {
     const reviews = firebaseReviews;

      
return `
  <div class="actions" style="margin-bottom: 20px;">
    <button
      class="btn btn-dark"
      id="writeReviewBtn"
      type="button"
    >
      ★ Write a Review
    </button>
  </div>

  <div class="grid grid-2">
          ${reviews.map(review => card(
            "★".repeat(review.rating),
            `<p>${esc(review.body)}</p>
             <p class="hint">${esc(review.booking)}</p>`
          )).join("") || `
            <div class="card empty">
              No demo reviews yet.
            </div>
          `}
        </div>
      `;
    }

    if (tab === "settings") {
      return `
        <div class="grid grid-2">
          ${card(
            "My account",
            `
              <p>
                <strong>${esc(session.name)}</strong>
                <br>
                ${esc(session.email)}
                <br>
                Role: Customer
              </p>

              <form id="profileForm">
                <div class="field">
                  <label>Display name</label>
                  <input
                    name="name"
                    value="${esc(session.name)}"
                    maxlength="80"
                    required
                  >
                </div>

                <button class="btn btn-dark" type="submit">
                  Save name
                </button>
              </form>
            `
          )}

          ${card(
            "Demo data",
            `
              <p>
                Clear the demonstration records saved in
                this browser.
              </p>

              <button
                class="btn btn-danger"
                id="resetDemo"
              >
                Reset demo data
              </button>
            `
          )}
        </div>
      `;
    }

    return "";
  }

  function dashboard() {
    if (!session) return pages.login();

    const bookings = myBookings();

    const completed = bookings.filter(
      b => b.status === "completed"
    ).length;

    const assigned = bookings.filter(
      b => Boolean(b.electrician)
    ).length;

    return header(
      "Customer dashboard",
      `Welcome back, ${session.name}.`
    ) + section(`
      
${notice(
  "Your customer dashboard is connected to Firebase. View your bookings, track service progress, manage quotations and receive notifications."
)}


      <div class="dashboard-head">
        <div>
          <h2>Overview</h2>
          <p class="muted">
            Your electrical service workspace
          </p>
        </div>

      
<div class="actions">
  ${btn("+ New booking", "booking")}
 
${btn(
  `🔔 My Notifications (${
    firebaseNotifications.filter(
      notification => notification.isRead !== true
    ).length
  })`,
  "notifications",
  "btn-outline-dark"
)}

</div>

      </div>

      <div class="stats">
        <div class="stat">
          <strong>${bookings.length}</strong>
          <span>My bookings</span>
        </div>

        <div class="stat">
          <strong>${completed}</strong>
          <span>Completed</span>
        </div>

        <div class="stat">
          <strong>${assigned}</strong>
          <span>Assigned</span>
        </div>

        <div class="stat">
          <strong>
            ${bookings.filter(b => b.status === "pending").length}
          </strong>
          <span>Awaiting review</span>
        </div>
      </div>

      <div class="tabs">
        ${[
          ["bookings", "Bookings"],
          ["messages", "Messages"],
          ["reviews", "Reviews"],
          ["settings", "Settings"]
        ].map(([key, label]) => `
          <button
            class="tab ${tab === key ? "active" : ""}"
            data-tab="${key}"
          >
            ${label}
          </button>
        `).join("")}
      </div>

      <div id="tabContent">
        ${dashboardTab()}
      </div>
    `);
  }

async function respondToQuotation(bookingId, decision) {
  const user = auth.currentUser;

  if (!user) {
    toast("Please sign in first.");
    return;
  }

  if (!["accepted", "declined"].includes(decision)) {
    return;
  }

  const quotation = firebaseQuotes.find(
    q => q.bookingId === bookingId
  );

  if (!quotation || quotation.status !== "sent") {
    toast("This quotation is no longer awaiting a response.");
    return;
  }

  const confirmed = window.confirm(
    decision === "accepted"
      ? "Are you sure you want to accept this quotation?"
      : "Are you sure you want to decline this quotation?"
  );

  if (!confirmed) return;

  try {
    await updateDoc(
      doc(db, "quotes", bookingId),
      {
        status: decision,
        respondedAt: serverTimestamp()
      }
    );

    toast(
      decision === "accepted"
        ? "Quotation accepted successfully!"
        : "Quotation declined successfully."
    );

    await loadFirebaseQuotes();

  } catch (error) {
    console.error("Quotation response failed:", error);
    toast("Unable to update quotation: " + error.message);
  }
}

async function requestBookingCancellation(bookingId) {
  const user = auth.currentUser;

  if (!user) {
    toast("Please log in first.");
    return;
  }

  const booking = myBookings().find(
    b => b.id === bookingId
  );

  if (!booking) {
    toast("Booking not found.");
    return;
  }

  if (!["pending", "confirmed"].includes(booking.status)) {
    toast("This booking cannot be cancelled.");
    return;
  }

  const confirmed = window.confirm(
    "Would you like to submit a cancellation request? " +
    "Your booking will remain active until an administrator approves it."
  );

  if (!confirmed) return;

  try {
    const requestRef = doc(
      db,
      "booking_change_requests",
      bookingId
    );

    const existingRequest = await getDoc(requestRef);

    if (existingRequest.exists()) {
      toast("A change request already exists for this booking.");
      return;
    }

    await setDoc(requestRef, {
      bookingId: bookingId,
      customerId: user.uid,
      type: "cancel",
      requestedDate: "",
      requestedTime: "",
      status: "pending",
      createdAt: serverTimestamp()
    });

    toast("Cancellation request submitted successfully!");
    await loadFirebaseChangeRequests();

  } catch (error) {
    console.error("Cancellation request failed:", error);
    toast("Unable to submit request: " + error.message);
  }
}
async function requestBookingReschedule(bookingId) {
  const user = auth.currentUser;

  if (!user) {
    toast("Please log in first.");
    return;
  }

  const booking = myBookings().find(
    b => b.id === bookingId
  );

  if (!booking) {
    toast("Booking not found.");
    return;
  }

  if (!["pending", "confirmed"].includes(booking.status)) {
    toast("This booking cannot be rescheduled.");
    return;
  }

  const requestedDate = window.prompt(
    "Enter your preferred new date (YYYY-MM-DD):"
  );

  if (requestedDate === null) return;

  const date = requestedDate.trim();

 
const datePattern = /^\d{4}-\d{2}-\d{2}$/;

if (!datePattern.test(date)) {
  toast("Please use YYYY-MM-DD, for example 2026-11-10.");
  return;
}

const [year, month, day] = date.split("-").map(Number);

const parsedDate = new Date(Date.UTC(year, month - 1, day));

const validDate =
  parsedDate.getUTCFullYear() === year &&
  parsedDate.getUTCMonth() === month - 1 &&
  parsedDate.getUTCDate() === day;

if (!validDate) {
  toast("Please enter a real calendar date.");
  return;
}


  const requestedTime = window.prompt(
    "Enter your preferred new time (HH:MM, 24-hour format):"
  );

  if (requestedTime === null) return;

  const time = requestedTime.trim();

  if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(time)) {
    toast("Please enter a valid time, such as 14:30.");
    return;
  }

  if (
    date === booking.date &&
    time === booking.time
  ) {
    toast("Please choose a different appointment date or time.");
    return;
  }

  const confirmed = window.confirm(
    `Request a new appointment for ${date} at ${time}? ` +
    "Your current appointment will remain unchanged until approved."
  );

  if (!confirmed) return;

  try {
    const requestRef = doc(
      db,
      "booking_change_requests",
      bookingId
    );

    const existingRequest = await getDoc(requestRef);

    if (existingRequest.exists()) {
      toast("A change request already exists for this booking.");
      return;
    }

    await setDoc(requestRef, {
      bookingId: bookingId,
      customerId: user.uid,
      type: "reschedule",
      requestedDate: date,
      requestedTime: time,
      status: "pending",
      createdAt: serverTimestamp()
    });

    toast("Rescheduling request submitted successfully!");
    await loadFirebaseChangeRequests();

  } catch (error) {
    console.error("Rescheduling request failed:", error);
    toast("Unable to submit request: " + error.message);
  }
}


async function markNotificationAsRead(notificationId) {
  const user = auth.currentUser;

  if (!user) {
    toast("Please sign in first.");
    return;
  }

  const notification = firebaseNotifications.find(
    item => item.id === notificationId
  );

  if (!notification || notification.userId !== user.uid) {
    toast("Notification not found.");
    return;
  }

  if (notification.isRead === true) {
    return;
  }

  try {
    await updateDoc(
      doc(db, "notifications", notificationId),
      {
        isRead: true
      }
    );

    toast("Notification marked as read.");

    await loadFirebaseNotifications();

  } catch (error) {
    console.error("Unable to mark notification as read:", error);
    toast("Unable to update notification.");
  }
}

function notificationsPage() {
  if (!session) {
    return pages.login();
  }

  const notifications = firebaseNotifications;

  return header(
    "My Notifications",
    "Stay updated on your electrical service bookings."
  ) + section(`
    <div class="actions">
      ${btn(
        "← Back to dashboard",
        "dashboard",
        "btn-outline-dark"
      )}
    </div>

 
<div class="card">
  <div class="actions">
    <h2>Notifications</h2>

    <button
      type="button"
      class="btn btn-outline-dark"
      data-refresh-notifications
    >
      ↻ Refresh Notifications
    </button>
  </div>


      ${notifications.length === 0 ? `
        <p>You have no notifications yet.</p>
      ` : notifications.map(notification => {

        const date = notification.createdAt?.toDate
          ? notification.createdAt.toDate().toLocaleString()
          : "Date unavailable";

        return `
          <div class="card">
            <h3>${esc(notification.title || "Notification")}</h3>

            <p>${esc(notification.message || "")}</p>

            
<p>
  <strong>Status:</strong>
  ${notification.isRead ? "Read" : "Unread"}
</p>

${!notification.isRead ? `
  <button
    type="button"
    class="btn btn-primary"
    data-mark-notification-read="${esc(notification.id)}"
  >
    ✓ Mark as Read
  </button>
` : ""}

<p class="hint">${esc(date)}</p>
          </div>
        `;
      }).join("")}

    </div>
  `);
}

function messagesPage(bookingId) {
  if (!session) {
    return pages.login();
  }

  const booking = myBookings().find(
    item => item.id === bookingId
  );

  if (!booking) {
    return header(
      "Conversation unavailable",
      "We couldn't find this booking."
    ) + section(`
      <div class="card">
        <p>This booking is not available in your account.</p>
        ${btn("← Back to dashboard", "dashboard")}
      </div>
    `);
  }

  return header(
    "Booking Messages",
    `Conversation for ${booking.reference || booking.id}`
  ) + section(`
    <div class="actions">
      ${btn("← Back to Messages", "dashboard", "btn-outline-dark")}
      ${btn("View Booking", `job/${encodeURIComponent(booking.id)}`)}
    </div>

    <div class="card">
      <h2>💬 Conversation</h2>

      <p>
        <strong>Service:</strong> ${esc(booking.service)}
      </p>

      <p>
        <strong>Booking status:</strong> ${badge(booking.status)}
      </p>

      <div class="card">
        <h3>Messages</h3>

       
<div class="card">
  <h3>Messages</h3>

  <div class="actions">
    <button
      type="button"
      class="btn btn-outline-dark"
      data-load-messages="${esc(booking.id)}"
    >
      ↻ Load Messages
    </button>
  </div>

  ${loadedMessagesBookingId !== bookingId || firebaseMessages.length === 0 ? `
    <p class="muted">
      No messages loaded yet.
    </p>
  ` :
   
firebaseMessages.map(message => {
  const isMine = message.senderId === auth.currentUser?.uid;

  const messageDate = message.createdAt?.toDate
    ? message.createdAt.toDate().toLocaleString("en-ZA")
    : "";

  return `
    <div style="
      display: flex;
      justify-content: ${isMine ? "flex-end" : "flex-start"};
      margin: 12px 0;
    ">
      <div style="
        max-width: 75%;
        padding: 14px 18px;
        border-radius: 16px;
        background: ${isMine ? "#163b65" : "#f0f2f5"};
        color: ${isMine ? "#ffffff" : "#222222"};
        overflow-wrap: anywhere;
      ">
        <strong>${isMine ? "You" : "Electrician"}</strong>

        <p style="margin: 8px 0; white-space: pre-wrap;">
          ${esc(message.text)}
        </p>

        <small style="opacity: 0.75;">
          ${esc(messageDate)}
        </small>
      </div>
    </div>
  `;
}).join("")
  }
</div>

<form id="sendMessageForm"
      data-booking-id="${esc(booking.id)}">

  <div class="field">
    <label for="messageText">Write a message</label>

    <textarea
      id="messageText"
      name="message"
      placeholder="Type your message to the electrician..."
      maxlength="2000"
      required
    ></textarea>
  </div>

  <button
    type="submit"
    class="btn btn-primary"
  >
    💬 Send Message
  </button>

</form>


      <p class="hint">
        Messaging is available only when an electrician
        has been assigned to this booking.
      </p>
    </div>
  `);
}

function jobPage(bookingId) {
  if (!session) {
    return pages.login();
  }

  if (bookingsLoading) {
    return header(
      "Booking details",
      "Loading your booking information."
    ) + section(`
      <div class="card">
        <p>Loading booking details...</p>
      </div>
    `);
  }

  const booking = myBookings().find(
    b => b.id === bookingId
  );

  if (!booking) {
    return header(
      "Booking unavailable",
      "This booking could not be found in your Firebase records."
    ) + section(`
      <div class="card">
        <p>
          We couldn't find this booking in your account.
        </p>
        ${btn("← Back to dashboard", "dashboard")}
      </div>
    `);
  }

  const reference = booking.reference || booking.id;
  
const changeRequest = firebaseChangeRequests.find(
  request => request.id === booking.id
);

const changeRequestDetails = changeRequest
  ? `
    <div class="card">
      <h2>Booking Change Request</h2>

      <p>
        <strong>Request type:</strong>
        ${changeRequest.type === "cancel"
          ? "Cancellation"
          : "Rescheduling"}
      </p>

      <p>
        <strong>Request status:</strong>
        ${badge(changeRequest.status)}
      </p>

      ${changeRequest.type === "reschedule" ? `
        <p>
          <strong>Requested date:</strong>
          ${esc(changeRequest.requestedDate || "")}
        </p>

        <p>
          <strong>Requested time:</strong>
          ${esc(changeRequest.requestedTime || "")}
        </p>
      ` : ""}

      <p class="hint">
        ${changeRequest.status === "pending"
          ? "Your request is awaiting administrator approval."
          : changeRequest.status === "approved"
          ? "Your request has been approved."
          : changeRequest.status === "rejected"
          ? "Your request was not approved."
          : "Your request status is being reviewed."}
      </p>
    </div>
  `
  : "";

const quotation = firebaseQuotes.find(
  q => q.bookingId === booking.id
);

const money = cents => {
  return "R " + (Number(cents || 0) / 100).toFixed(2);
};

const quotationDetails = quotation
  ? `
    <p><strong>Description:</strong>
      ${esc(quotation.description || "Not provided")}
    </p>

    <p><strong>Labour:</strong>
      ${money(quotation.labourCents)}
    </p>

    <p><strong>Materials:</strong>
      ${money(quotation.materialsCents)}
    </p>

    <p><strong>Total quotation:</strong>
      ${money(quotation.totalCents)}
    </p>

    <p><strong>Quotation status:</strong>
      ${badge(quotation.status || "pending")}
    </p>
    
${quotation.status === "sent" ? `
  <div class="actions">
    <button
      type="button"
      class="btn btn-primary"
      data-quote-response="accepted"
      data-booking-id="${esc(booking.id)}">
      Accept quotation
    </button>

    <button
      type="button"
      class="btn btn-outline-dark"
      data-quote-response="declined"
      data-booking-id="${esc(booking.id)}">
      Decline quotation
    </button>
  </div>
` : ""}

  `
  : `
    <p>No quotation has been issued for this booking yet.</p>
  `;


  const amount =
    booking.quote != null && Number(booking.quote) > 0
      ? "R " + Number(booking.quote).toFixed(2)
      : "Awaiting quotation";

  return header(
    `Booking ${reference}`,
    "Your electrical service booking details."
  ) + section(`
   
<div class="actions">
  ${btn(
    "← Back to dashboard",
    "dashboard",
    "btn-outline-dark"
  )}

  ${btn(
    "💬 Messages",
    `messages/${bookingId}`,
    "btn-outline-dark"
  )}
</div>


    <div class="grid grid-2">

      <div class="card">
        <h2>Service information</h2>

        <p>
          <strong>Booking reference:</strong>
          ${esc(reference)}
        </p>

        <p>
          <strong>Service:</strong>
          ${esc(booking.service)}
        </p>

        <p>
          <strong>Status:</strong>
          ${badge(booking.status)}
        </p>

        <p>
          <strong>Preferred date:</strong>
          ${esc(booking.date)}
        </p>

        <p>
          <strong>Preferred time:</strong>
          ${esc(booking.time)}
        </p>
      </div>

      <div class="card">
        <h2>Service location</h2>

        <p>
          <strong>Address:</strong>
          ${esc(booking.address || "Not provided")}
        </p>

        <p>
          <strong>Description:</strong>
          ${esc(booking.details || "No additional notes")}
        </p>
      </div>

     
<div class="card">
  <h2>Quotation</h2>

  ${quotationDetails}

  <p class="hint">
    Quotations are retrieved from Firebase.
    Contact Lesego Electrical Services if you
    have questions about your quotation.
  </p>
</div>


<div class="card">
  <h2>Booking progress</h2>

  <p>
    <strong>Current status:</strong>
    ${badge(booking.status)}
  </p>

  <p>
    Your booking information is retrieved
    from Cloud Firestore.
  </p>

${["pending", "confirmed"].includes(booking.status) && !changeRequest ? `
    <div class="actions">
      <button
        type="button"
        class="btn btn-outline-dark"
        data-booking-action="reschedule"
        data-booking-id="${esc(booking.id)}">
        Request Rescheduling
      </button>

      <button
        type="button"
        class="btn btn-outline-dark"
        data-booking-action="cancel"
        data-booking-id="${esc(booking.id)}">
        Request Cancellation
      </button>
    </div>
  ` : `
    
<p class="hint">
  ${changeRequest
    ? "A booking change request has already been submitted. Please check its status below."
    : "Booking changes are unavailable for completed or cancelled bookings."}
</p>
  `}
</div>
  `);
}

  function render() {
    const route = decodeURIComponent(
      location.hash.slice(1) || "home"
    );
    
if (!route.startsWith("messages/") && unsubscribeMessages) {
  unsubscribeMessages();
  unsubscribeMessages = null;
  loadedMessagesBookingId = null;
  firebaseMessages = [];
}


    let html;

    if (!authReady) {
      html = section(`
        <div class="card">
          <h2>Loading...</h2>
          <p>Checking your Firebase session.</p>
        </div>
      `);
    
} else if (route.startsWith("job/")) {
  html = jobPage(route.slice(4));


} else if (route.startsWith("messages/")) {
  const bookingId = route.slice(9);

  html = messagesPage(bookingId);

  if (loadedMessagesBookingId !== bookingId) {
    setTimeout(() => {
      if (
        decodeURIComponent(location.hash.slice(1)) ===
        `messages/${bookingId}`
      ) {
        listenToFirebaseMessages(bookingId);
      }
    }, 0);
  }


} else if (route === "dashboard") {
  html = dashboard();
    } else {
      html = (pages[route] || pages.home)();
    }

    const main = el();

    if (main) {
      main.innerHTML = html;
    }

    const year = document.getElementById("year");

    if (year) {
      year.textContent = new Date().getFullYear();
    }

    const dashNav = document.getElementById("dashNav");

    if (dashNav) {
      dashNav.classList.toggle("hidden", !session);
    }

    const authBtn = document.getElementById("authBtn");

    if (authBtn) {
      authBtn.textContent = session
        ? "Sign out"
        : "Sign in";
    }

    document.querySelectorAll("nav a").forEach(link => {
      link.classList.toggle(
        "active",
        link.getAttribute("href") === "#" + route
      );
    });

    const nav = document.getElementById("nav");
    const menuToggle = document.getElementById("menuToggle");

    if (nav) nav.classList.remove("open");

    if (menuToggle) {
      menuToggle.setAttribute("aria-expanded", "false");
    }

    window.scrollTo(0, 0);
  }

  function friendlyAuthError(error) {
    const messages = {
      "auth/email-already-in-use":
        "This email address is already registered.",

      "auth/invalid-email":
        "Please enter a valid email address.",

      "auth/weak-password":
        "Please choose a stronger password.",

      "auth/invalid-credential":
        "Incorrect email or password.",

      "auth/wrong-password":
        "Incorrect email or password.",

      "auth/user-not-found":
        "Incorrect email or password.",

      "auth/too-many-requests":
        "Too many attempts. Please try again later.",

      "auth/network-request-failed":
        "Network error. Check your internet connection.",

      "auth/operation-not-allowed":
        "Email/password authentication is not enabled.",

      "auth/unauthorized-domain":
        "This website address is not authorised in Firebase."
    };

    return messages[error.code] ||
      "Something went wrong. Please try again.";
  }

  async function logout() {
    try {
      await signOut(auth);

      session = null;
      tab = "bookings";

      location.hash = "home";
      render();

      toast("You have signed out successfully.");
    } catch (error) {
      console.error("Logout error:", error.code);
      toast(friendlyAuthError(error));
    }
  }
  
let firebaseServices = [];

async function loadFirebaseServices() {
  try {
    const snapshot = await getDocs(
      collection(db, "services")
    );

    firebaseServices = snapshot.docs
      .map(serviceDoc => ({
        id: serviceDoc.id,
        ...serviceDoc.data()
      }))
      .filter(service => service.isavailable === true);

    console.log(
      "Firebase services loaded:",
      firebaseServices.length
    );

  } catch (error) {
    console.error("Unable to load services:", error);
    toast("Could not load available electrical services.");
  }
}

async function saveBookingToFirestore(v) {
  const user = auth.currentUser;

  if (!user) {
    throw new Error("Please sign in before booking.");
  }

  const bookingRef = doc(collection(db, "bookings"));
  const jobRef = doc(db, "electrical_jobs", bookingRef.id);

  const reference =
    "LE-" + bookingRef.id.slice(0, 8).toUpperCase();

  const customerName =
    user.displayName || session?.name || "Customer";

  
const selectedService = firebaseServices.find(
  service => service.id === v.service
);

if (!selectedService) {
  throw new Error(
    "Please select an available service from the list."
  );
}

if (!v.date || !v.time || !v.phone ||
    !v.address || !v.details) {
  throw new Error("Please complete all booking fields.");
}

const serviceName = selectedService.title;


  // Temporary safety check:
  // Service IDs must come from the existing services collection.
  const serviceQuery = query(
    collection(db, "services"),
   where("title", "==", serviceName)
  );

  const serviceResults = await getDocs(serviceQuery);

  if (serviceResults.empty) {
    throw new Error(
      "This service could not be matched to your Android app's services. Please check the service list."
    );
  }

  const serviceId = serviceResults.docs[0].id;

  const batch = writeBatch(db);

  batch.set(bookingRef, {
    userId: user.uid,
    customerName,
    customerEmail: user.email || "",
    customerPhone: String(v.phone).trim(),
    serviceId,
    serviceName,
    serviceAddress: String(v.address).trim(),
    preferredDate: v.date,
    preferredTime: v.time,
    notes: String(v.details).trim(),
    price: 0,
    reference,
    status: "pending",
    createdAt: serverTimestamp()
  });

  batch.set(jobRef, {
    bookingId: bookingRef.id,
    customerId: user.uid,
    contractorId: "",
    contractorName: "",
    serviceId,
    serviceName,
    serviceAddress: String(v.address).trim(),
    scheduledDate: v.date,
    scheduledTime: v.time,
    description: String(v.details).trim(),
    notes: String(v.details).trim(),
    estimatedCost: 0,
    finalCost: 0,
    status: "pending",
    completedAt: null,
    createdAt: serverTimestamp()
  });

  await batch.commit();

  return {
    id: bookingRef.id,
    reference
  };
}

  const fd = form =>
    Object.fromEntries(new FormData(form));

  document.addEventListener("click", async event => {
    
const loadMessagesButton = event.target.closest(
  "[data-load-messages]"
);

if (loadMessagesButton) {
  const bookingId = loadMessagesButton.dataset.loadMessages;

  loadMessagesButton.disabled = true;
  loadMessagesButton.textContent = "Loading messages...";

  try {
    await loadFirebaseMessages(bookingId);
  } finally {
    loadMessagesButton.disabled = false;
    loadMessagesButton.textContent = "↻ Load Messages";
  }

  return;
}
    
const refreshNotificationsButton = event.target.closest(
  "[data-refresh-notifications]"
);

if (refreshNotificationsButton) {
  event.preventDefault();

  refreshNotificationsButton.disabled = true;
  refreshNotificationsButton.textContent = "Refreshing...";

  await loadFirebaseNotifications();

  toast("Notifications refreshed.");

  return;
}

const markReadButton = event.target.closest(
  "[data-mark-notification-read]"
);

if (markReadButton) {
  event.preventDefault();

  const notificationId = markReadButton.dataset.markNotificationRead;

  markReadButton.disabled = true;
  markReadButton.textContent = "Updating...";

  await markNotificationAsRead(notificationId);

  return;
}

    

const quoteButton = event.target.closest(
  "[data-quote-response]"
);

if (quoteButton) {
  event.preventDefault();

  console.log("Quotation button clicked!");

  await respondToQuotation(
    quoteButton.dataset.bookingId,
    quoteButton.dataset.quoteResponse
  );

  return;
}

const bookingActionButton = event.target.closest(
  "[data-booking-action]"
);

if (bookingActionButton) {
  event.preventDefault();

  const action = bookingActionButton.dataset.bookingAction;
  const bookingId = bookingActionButton.dataset.bookingId;

  if (action === "cancel") {
    await requestBookingCancellation(bookingId);
  }
if (action === "reschedule") {
  await requestBookingReschedule(bookingId);
}
  return;
}


    const target = event.target.closest(
      "[data-tab], [data-quote], #authBtn, #resetDemo, #menuToggle"
    );

    if (!target) return;

    if (target.id === "menuToggle") {
      const nav = document.getElementById("nav");

      if (!nav) return;

      nav.classList.toggle("open");

      target.setAttribute(
        "aria-expanded",
        String(nav.classList.contains("open"))
      );

      return;
    }

    if (target.id === "authBtn") {
      if (session) {
        await logout();
      } else {
        location.hash = "login";
      }

      return;
    }

    if (target.dataset.tab) {
      tab = target.dataset.tab;
      if (tab === "reviews") {
  loadFirebaseReviews();
}
      render();
      return;
    }

    if (target.id === "resetDemo") {
      if (confirm("Reset all local demonstration records?")) {
        db = seed();
        save();
        render();
        toast("Demo data reset.");
      }

      return;
    }

    if (target.dataset.quote && session) {
      const booking = myBookings().find(
        b => b.id === target.dataset.id
      );

      if (!booking) return;

      booking.quoteStatus = target.dataset.quote;

      save();
      render();

      toast("Demo quotation response saved.");
    }
  });

  document.addEventListener("submit", async event => {
    
const messageForm = event.target.closest("#sendMessageForm");

if (messageForm) {
  event.preventDefault();

  const bookingId = messageForm.dataset.bookingId;
  const messageInput = messageForm.querySelector(
    '[name="message"]'
  );

  const messageText = messageInput.value.trim();

  if (!messageText) {
    toast("Please enter a message.");
    return;
  }

  const sendButton = messageForm.querySelector(
    'button[type="submit"]'
  );

  sendButton.disabled = true;
  sendButton.textContent = "Sending...";

  try {
    const sent = await sendFirebaseMessage(
      bookingId,
      messageText
    );

    if (sent) {
      messageInput.value = "";
    }
  } finally {
    sendButton.disabled = false;
    sendButton.textContent = "💬 Send Message";
  }

  return;
}

    const form = event.target;

    if (!form.id) return;

    event.preventDefault();

    const v = fd(form);

    // REAL FIREBASE CUSTOMER REGISTRATION
    if (form.id === "registerForm") {
      const name = String(v.name || "").trim();
      const email = String(v.email || "").trim();
      const password = String(v.password || "");
      const confirmPassword = String(v.confirmPassword || "");

      if (!name || !email || !password) {
        toast("Please complete all required fields.");
        return;
      }

      if (password.length < 6) {
        toast("Password must be at least 6 characters.");
        return;
      }

      if (password !== confirmPassword) {
        toast("Passwords do not match.");
        return;
      }

      const button = form.querySelector(
        'button[type="submit"]'
      );

      if (button) {
        button.disabled = true;
        button.textContent = "Creating account...";
      }

      try {
        const result = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );
        await loadFirebaseBookings();

        await updateProfile(result.user, {
          displayName: name
        });

        session = {
          id: result.user.uid,
          name,
          email: result.user.email,
          role: "customer"
        };

        tab = "bookings";

        location.hash = "dashboard";
        render();

        toast("Firebase account created successfully!");
      } catch (error) {
        console.error(
          "Firebase registration error:",
          error.code
        );

        toast(friendlyAuthError(error));
      } finally {
        if (button && button.isConnected) {
          button.disabled = false;
          button.textContent = "Create account →";
        }
      }

      return;
    }

    // REAL FIREBASE CUSTOMER LOGIN
    if (form.id === "loginForm") {
      const email = String(v.email || "").trim();
      const password = String(v.password || "");

      if (!email || !password) {
        toast("Enter your email and password.");
        return;
      }

      const button = form.querySelector(
        'button[type="submit"]'
      );

      if (button) {
        button.disabled = true;
        button.textContent = "Signing in...";
      }

      try {
        const result = await signInWithEmailAndPassword(
          auth,
          email,
          password
        );

        session = {
          id: result.user.uid,
          name: result.user.displayName ||
            result.user.email.split("@")[0],
          email: result.user.email,
          role: "customer"
        };

        tab = "bookings";

        location.hash = "dashboard";
        render();

        toast("Signed in successfully!");
      } catch (error) {
        console.error("Firebase login error:", error.code);
        toast(friendlyAuthError(error));
      } finally {
        if (button && button.isConnected) {
          button.disabled = false;
          button.textContent = "Sign in →";
        }
      }

      return;
    }

    // LOCAL DEMONSTRATION BOOKING
    
if (form.id === "bookingForm" && session) {
  const button = form.querySelector('button[type="submit"]');

  if (!auth.currentUser) {
    toast("Please sign in before making a booking.");
    return;
  }

  if (v.date < new Date().toLocaleDateString("en-CA")) {
    toast("Please choose today or a future date.");
    return;
  }

  if (button) {
    button.disabled = true;
    button.textContent = "Saving booking...";
  }

  try {
    const result = await saveBookingToFirestore(v);

    toast(
      "Booking " + result.reference +
      " successfully saved to Firebase!"
    );

    // Keep the customer on the dashboard for now.
    // The dashboard still needs to load bookings from Firestore.
    location.hash = "dashboard";
    render();

  } catch (error) {
    console.error("Firestore booking error:", error);

    if (error.code === "permission-denied") {
      toast("Booking permission denied. Please check your Firestore rules.");
    } else {
      toast(error.message || "Unable to save booking.");
    }

  } finally {
    if (button && button.isConnected) {
      button.disabled = false;
      button.textContent = "Submit request →";
    }
  }

  return;
}

    if (form.id === "contactForm") {
      db.enquiries.push({
        ...v,
        date: new Date().toISOString()
      });

      save();
      form.reset();

      toast("Demo enquiry saved. No email was sent.");
      return;
    }

    if (form.id === "careerForm") {
      db.applications.push({
        ...v,
        date: new Date().toISOString()
      });

      save();
      form.reset();

      toast("Demo interest saved.");
      return;
    }

    // UPDATE FIREBASE DISPLAY NAME
    if (form.id === "profileForm" && session) {
      const name = String(v.name || "").trim();

      if (!name || !auth.currentUser) return;

      try {
        await updateProfile(auth.currentUser, {
          displayName: name
        });

        session.name = name;

        render();
        toast("Firebase display name updated.");
      } catch (error) {
        console.error("Profile error:", error.code);
        toast(friendlyAuthError(error));
      }

      return;
    }

    if (form.id === "changeForm" && session) {
      const booking = myBookings().find(
        b => b.id === form.dataset.id
      );

      if (!booking) return;

      booking.changeRequest = {
        type: v.type,
        reason: v.reason,
        status: "Pending"
      };

      save();
      render();

      toast("Demo change request saved.");
      return;
    }

    if (form.id === "reviewForm" && session) {
      const booking = myBookings().find(
        b => b.id === form.dataset.id &&
             b.status === "Completed"
      );

      if (!booking) return;

      const exists = db.reviews.some(
        r => r.booking === booking.id
      );

      if (exists) return;

      db.reviews.push({
        booking: booking.id,
        uid: session.id,
        rating: Number(v.rating),
        body: String(v.body || "").trim(),
        date: new Date().toISOString()
      });

      save();
      render();

      toast("Demo review saved.");
    }
  });

  // RESTORE FIREBASE LOGIN AFTER REFRESH
  onAuthStateChanged(auth, user => {
    if (user) {
      session = {
        id: user.uid,
        name: user.displayName ||
          user.email?.split("@")[0] ||
          "Customer",
        email: user.email || "",
        role: "customer"
      };
    } else {
      session = null;
    }

    authReady = true;
render();

if (user) {
  loadFirebaseBookings();
loadFirebaseBookings();
loadFirebaseQuotes();
loadFirebaseChangeRequests();
loadFirebaseNotifications();
} else {
  firebaseBookings = [];
  firebaseQuotes = [];
  firebaseChangeRequests = [];
  firebaseNotifications = [];
  bookingsLoading = false;
  bookingsError = "";
}
  }, error => {
    console.error("Authentication state error:", error);
    authReady = true;
    session = null;
    render();
    toast("Unable to verify your Firebase session.");
  });

 window.addEventListener("hashchange", render);

loadFirebaseServices().then(() => render());

render();
})();

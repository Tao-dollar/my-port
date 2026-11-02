const root = document.documentElement;
const themeToggle = document.getElementById("theme-toggle");
const menuToggle = document.getElementById("menu-toggle");
const nav = document.getElementById("main-nav");
const FORM_ENDPOINT = "https://formspree.io/f/xaenkzry";

function setTheme(theme) {
  const selected = theme === "light" ? "light" : "dark";
  document.documentElement.dataset.theme = selected;
  document.body.dataset.theme = selected;
  document.body.classList.toggle("theme-light", selected === "light");
  document.body.classList.toggle("theme-dark", selected === "dark");
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", selected === "light" ? "#ffffff" : "#000000");

  if (themeToggle) {
    themeToggle.setAttribute(
      "aria-label",
      selected === "dark" ? "Switch to light mode" : "Switch to dark mode",
    );
    themeToggle.setAttribute("aria-pressed", String(selected === "light"));
  }

  try {
    localStorage.setItem("philo-theme", selected);
  } catch {
    // Ignore localStorage failures gracefully.
  }
}

let savedTheme = "light";
try {
  const stored = localStorage.getItem("philo-theme");
  if (stored === "light" || stored === "dark") {
    savedTheme = stored;
  }
} catch {
  savedTheme = "light";
}
setTheme(savedTheme);

themeToggle?.addEventListener("click", () => {
  const current = document.body.dataset.theme === "light" ? "light" : "dark";
  setTheme(current === "dark" ? "light" : "dark");
});

menuToggle?.addEventListener("click", () => {
  const open = nav?.classList.toggle("open");
  menuToggle.setAttribute("aria-expanded", String(open));
  menuToggle.setAttribute(
    "aria-label",
    open ? "Close navigation" : "Open navigation",
  );
});

const navLinks = [...(nav?.querySelectorAll('a[href^="#"]') || [])];
const navSections = navLinks
  .map((link) => document.querySelector(link.getAttribute("href")))
  .filter(Boolean);

function setActiveNavigation(sectionId) {
  navLinks.forEach((link) => {
    if (link.hash === `#${sectionId}`) {
      link.setAttribute("aria-current", "location");
    } else {
      link.removeAttribute("aria-current");
    }
  });
}

nav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    if (link.hash) setActiveNavigation(link.hash.slice(1));
    nav.classList.remove("open");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "Open navigation");
  });
});

if ("IntersectionObserver" in window) {
  const navigationObserver = new IntersectionObserver(
    (entries) => {
      const currentSection = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (currentSection) setActiveNavigation(currentSection.target.id);
    },
    { rootMargin: "-25% 0px -60% 0px", threshold: [0, 0.1, 0.5, 1] },
  );
  navSections.forEach((section) => navigationObserver.observe(section));
}

const revealItems = document.querySelectorAll(".reveal");
if (
  "IntersectionObserver" in window &&
  !window.matchMedia("(prefers-reduced-motion: reduce)").matches
) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.12 },
  );
  document.body.classList.add("reveal-enabled");
  revealItems.forEach((item) => observer.observe(item));
} else {
  revealItems.forEach((item) => item.classList.add("is-visible"));
}

const filterButtons = document.querySelectorAll(".filter-btn");
const projectCards = document.querySelectorAll(".project-card");
filterButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    filterButtons.forEach((btn) => {
      const isActive = btn === button;
      btn.classList.toggle("active", isActive);
      btn.setAttribute("aria-pressed", String(isActive));
    });
    projectCards.forEach((card) => {
      const match = filter === "all" || card.dataset.category === filter;
      card.hidden = !match;
    });
  });
});

const form = document.getElementById("contact-form");
if (form) {
  form.action = FORM_ENDPOINT;
}

const fields = {
  name: document.getElementById("name"),
  email: document.getElementById("email"),
  message: document.getElementById("message"),
};
const status = document.getElementById("form-status");

const successParam = new URLSearchParams(window.location.search).get("success");
if (successParam === "1" && status) {
  status.dataset.state = "success";
  status.textContent =
    "Thanks! Your message has been sent. I’ll get back to you soon.";
  const url = new URL(window.location.href);
  url.searchParams.delete("success");
  window.history.replaceState({}, "", url);
}

function showError(field, message) {
  const error = document.getElementById(`${field}-error`);
  if (error) error.textContent = message;
  const input = fields[field];
  if (input) {
    input.setAttribute("aria-invalid", message ? "true" : "false");
  }
}

function validateField(fieldName) {
  const value = fields[fieldName].value.trim();
  let message = "";

  if (fieldName === "name" && value.length < 2) {
    message = "Please enter your name.";
  } else if (
    fieldName === "email" &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
  ) {
    message = "Please enter a valid email address.";
  } else if (fieldName === "message" && value.length < 10) {
    message = "Tell me a little more so I can understand.";
  }

  showError(fieldName, message);
  return !message;
}

Object.entries(fields).forEach(([fieldName, field]) => {
  if (!field) return;
  field.addEventListener("blur", () => validateField(fieldName));
  field.addEventListener("input", () => {
    if (status) status.textContent = "";
    if (field.getAttribute("aria-invalid") === "true") {
      validateField(fieldName);
    }
  });
});

form?.addEventListener("submit", async (event) => {
  const valid = Object.keys(fields).every((fieldName) =>
    validateField(fieldName),
  );
  if (!valid) {
    event.preventDefault();
    if (status) status.textContent = "A few details still need attention.";
    form.querySelector('[aria-invalid="true"]')?.focus();
    return;
  }

  event.preventDefault();

  const submitButton = form.querySelector('button[type="submit"]');
  if (submitButton) {
    submitButton.disabled = true;
    submitButton.textContent = "Sending...";
  }

  if (status) {
    status.dataset.state = "sending";
    status.textContent = "Sending your message...";
  }

  try {
    const formData = new FormData(form);
    const response = await fetch(form.action, {
      method: "POST",
      body: formData,
      headers: {
        Accept: "application/json",
      },
    });

    if (response.ok) {
      form.reset();
      Object.entries(fields).forEach(([fieldName, field]) => {
        if (!field) return;
        field.setAttribute("aria-invalid", "false");
        showError(fieldName, "");
      });

      if (status) {
        status.dataset.state = "success";
        status.textContent =
          "Thanks! Your message has been sent. I’ll get back to you soon.";
      }
    } else {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage =
        errorData?.errors?.[0]?.message ||
        "Something went wrong. Please email me directly instead.";

      if (status) {
        status.dataset.state = "error";
        status.textContent = errorMessage;
      }
    }
  } catch (error) {
    if (status) {
      status.dataset.state = "error";
      status.textContent =
        "Something went wrong. Please email me directly instead.";
    }
  } finally {
    if (submitButton) {
      submitButton.disabled = false;
      submitButton.innerHTML =
        'Send your note <span aria-hidden="true">↗</span>';
    }
  }
});

const currentYear = document.getElementById("current-year");
if (currentYear) currentYear.textContent = String(new Date().getFullYear());

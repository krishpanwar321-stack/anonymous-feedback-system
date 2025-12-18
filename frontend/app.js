console.log("app.js loaded");

/* =========================
   CONFIG
========================= */
const API = "/api";
 
function requireAuth() {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      window.location.href = "/login.html";
    }
  }  
/* =========================
   AUTH
========================= */
async function login() {
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
  
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });
  
    const data = await res.json();
  
    if (res.ok) {
      localStorage.setItem("userId", data.userId);
      window.location.href = "/dashboard.html";
    } else {
      document.getElementById("error").innerText = data.error;
    }
  }
  

function logout() {
  localStorage.clear();
  window.location.href = "/login.html";
}

function goCreate() {
  window.location.href = "/create-form.html";
}

/* =========================
   CREATE FORM (ADMIN)
========================= */
async function createForm() {
  const titleEl = document.getElementById("title");
  const descEl = document.getElementById("description");
  const resultEl = document.getElementById("result");

  const userId = localStorage.getItem("userId");
  if (!titleEl.value.trim()) {
    resultEl.innerText = "Title is required";
    return;
  }
  
  if (!userId) {
    alert("Please login again");
    window.location.href = "/login.html";
    return;
  }
  

  const res = await fetch(`${API}/forms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userId,
      title: titleEl.value,
      description: descEl?.value || ""
    })
  });

  const data = await res.json();

  if (res.ok) {
    window.location.href = `/add-questions.html?formId=${data.form.id}`;
  } else {
    resultEl.innerText = data.error;
  }
}

/* =========================
   ADD QUESTIONS (ADMIN)
========================= */
async function addQuestion() {
  const params = new URLSearchParams(window.location.search);
  const formId = params.get("formId");

  const textEl = document.getElementById("questionText");
  const typeEl = document.getElementById("questionType");
  const statusEl = document.getElementById("status");

  if (!formId || !textEl) {
    statusEl.innerText = "Missing data";
    return;
  }

  const res = await fetch(`${API}/forms/${formId}/questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
        questionText: textEl.value,
        questionType: typeEl.value,
        options:
          typeEl.value === "single_choice" ||
          typeEl.value === "multiple_choice"
            ? options
            : null
      })      
  });

  const data = await res.json();

  statusEl.innerText = res.ok
    ? "Question added successfully"
    : data.error;

  textEl.value = "";
}

function goToResponses() {
  const params = new URLSearchParams(window.location.search);
  const formId = params.get("formId");
  window.location.href = `/responses.html?formId=${formId}`;
}
let options = [];

function handleTypeChange() {
  const type = document.getElementById("questionType").value;
  const optionsBox = document.getElementById("optionsBox");

  if (type === "single_choice" || type === "multiple_choice") {
    optionsBox.style.display = "block";
  } else {
    optionsBox.style.display = "none";
    options = [];
    document.getElementById("optionsList").innerHTML = "";
  }
}

function addOption() {
  const optionsList = document.getElementById("optionsList");

  const index = options.length;

  options.push("");

  const div = document.createElement("div");
  div.style.display = "flex";
  div.style.gap = "8px";
  div.style.marginBottom = "8px";

  div.innerHTML = `
    <input
      placeholder="Option text"
      oninput="options[${index}] = this.value"
    />
    <button type="button" class="danger-btn" onclick="removeOption(${index})">
      ✕
    </button>
  `;

  optionsList.appendChild(div);
}

function removeOption(index) {
  options.splice(index, 1);
  renderOptions();
}

function renderOptions() {
  const optionsList = document.getElementById("optionsList");
  optionsList.innerHTML = "";

  options.forEach((opt, i) => {
    const div = document.createElement("div");
    div.style.display = "flex";
    div.style.gap = "8px";
    div.style.marginBottom = "8px";

    div.innerHTML = `
      <input
        value="${opt}"
        oninput="options[${i}] = this.value"
      />
      <button type="button" class="danger-btn" onclick="removeOption(${i})">
        ✕
      </button>
    `;

    optionsList.appendChild(div);
  });
}

/* =========================
   PUBLIC FORM LOAD
========================= */
const params = new URLSearchParams(window.location.search);
const formId = params.get("formId");
async function loadForm() {
    if (!formId) return;
  
    const res = await fetch(`/api/forms/${formId}`);
    const data = await res.json();
  
    // ✅ HARD GUARD — THIS FIXES EVERYTHING
    if (!res.ok || !data.form || !Array.isArray(data.questions)) {
      document.getElementById("questions").innerHTML =
        "<p>Form not found or unavailable.</p>";
      return;
    }
  
    document.getElementById("title").innerText = data.form.title;
    document.getElementById("description").innerText =
      data.form.description || "";
  
    const qDiv = document.getElementById("questions");
    qDiv.innerHTML = "";
  
    data.questions.forEach(q => {
      let html = `<p><strong>${q.question_text}</strong></p>`;
  
      // TEXT
      if (q.question_type === "short_text" || q.question_type === "long_text") {
        html += `<input data-id="${q.id}" />`;
      }
  
      // RATING
      if (q.question_type === "rating") {
        html += `<div class="rating-group" data-id="${q.id}">`;
        for (let i = 1; i <= 10; i++) {
          html += `
            <label>
              <input type="radio" name="rating-${q.id}" value="${i}">
              ${i}
            </label>
          `;
        }
        html += `</div>`;
      }      
  
      // SINGLE CHOICE
      if (q.question_type === "single_choice" && Array.isArray(q.options)) {
        q.options.forEach(opt => {
          html += `
            <label>
              <input type="radio" name="choice-${q.id}" value="${opt}">
              ${opt}
            </label>
          `;
        });
      }
  
      // MULTIPLE CHOICE
      if (q.question_type === "multiple_choice" && Array.isArray(q.options)) {
        q.options.forEach(opt => {
          html += `
            <label>
              <input type="checkbox" data-question="${q.id}" value="${opt}">
              ${opt}
            </label>
          `;
        });
      }
  
      qDiv.innerHTML += html;
    });
  }   
if (document.getElementById("questions")) {
    loadForm();
}  
/* =========================
   SUBMIT FEEDBACK (PUBLIC)
========================= */
async function submitFeedback() {
    const params = new URLSearchParams(window.location.search);
    const formId = params.get("formId");
  
    if (!formId) {
      alert("Invalid form link");
      return;
    }
  
    const answers = [];
  
    // TEXT answers
    document.querySelectorAll("input[data-id]").forEach(input => {
      if (input.value.trim()) {
        answers.push({
          questionId: input.dataset.id,
          answerText: input.value
        });
      }
    });
  
    // RATING answers
    document.querySelectorAll(".rating-group").forEach(group => {
      const selected = group.querySelector("input:checked");
      if (selected) {
        answers.push({
          questionId: group.dataset.id,
          answerText: selected.value
        });
      }
    });
  
    // SINGLE choice
    document.querySelectorAll("input[type=radio]:checked").forEach(input => {
      const qId = input.name.replace("choice-", "").replace("rating-", "");
      answers.push({
        questionId: qId,
        answerText: input.value
      });
    });
  
    // MULTIPLE choice
    const multiMap = {};
    document.querySelectorAll("input[type=checkbox]:checked").forEach(input => {
      const qId = input.dataset.question;
      if (!multiMap[qId]) multiMap[qId] = [];
      multiMap[qId].push(input.value);
    });
  
    Object.keys(multiMap).forEach(qId => {
      answers.push({
        questionId: qId,
        answerText: multiMap[qId].join(", ")
      });
    });
  
    if (answers.length === 0) {
      alert("Please answer at least one question");
      return;
    }
  
    try {
      const res = await fetch("/api/responses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ formId, answers })
      });
  
      if (!res.ok) throw new Error();
  
      alert("Thank you for your feedback");
    } catch {
      alert("Submission failed");
    }
  }  
  
/* =========================
   VIEW RESPONSES (ADMIN)
========================= */
async function loadResponses(formId) {
  const res = await fetch(`${API}/responses/${formId}`);
  const data = await res.json();

  const div = document.getElementById("responses");
  div.innerHTML = "";

  data.questions.forEach(q => {
    div.innerHTML += `<h3>${q.question_text}</h3>`;
    q.answers.forEach(a => {
      div.innerHTML += `<p>- ${a}</p>`;
    });
  });
}
function copyLink() {
    const linkEl = document.getElementById("link");
  
    if (!linkEl) return;
  
    const text = linkEl.innerText;
  
    navigator.clipboard.writeText(text)
      .then(() => {
        alert("Link copied to clipboard");
      })
      .catch(() => {
        alert("Failed to copy link");
      });
  }
  
/* =========================
   QR CODE
========================= */
function generateQRCode(formId) {
    const publicUrl = `${window.location.origin}/feedback.html?formId=${formId}`;
  
    const qrImg = document.getElementById("qrcode");
    const linkEl = document.getElementById("link");
  
    if (!qrImg || !linkEl) return;
  
    linkEl.innerText = publicUrl;
  
    qrImg.src =
      "https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=" +
      encodeURIComponent(publicUrl);
  }  

/* =========================
   AUTO PAGE INIT
========================= */
document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    const formId = params.get("formId");
  
    const questionsDiv = document.getElementById("questions");
  
    if (formId && questionsDiv) {
      loadForm();
    }
  });  
// responses.html

if (formId) {
    const responsesDiv = document.getElementById("responses");
    const qrDiv = document.getElementById("qrcode");
  
    if (responsesDiv) {
      loadResponses(formId);
    }
  
    if (qrDiv) {
      generateQRCode(formId);
    }
  }
  async function loadForms() {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
  
    const res = await fetch(`${API}/forms/user/${userId}`);
    const data = await res.json();
  
    const ul = document.getElementById("forms");
    if (!ul) return;
  
    ul.innerHTML = "";
  
    data.forms.forEach(form => {
        ul.innerHTML += `
          <li class="form-card">
            <div class="form-info">
              <h3>${form.title}</h3>
              <p>${form.response_count} responses</p>
            </div>
      
            <div class="form-actions">
             <button onclick="openResponses('${form.id}')">View</button>
              <button class="danger-btn" onclick="deleteForm('${form.id}')">
              Delete
                </button>
            </div>
          </li>
        `;
      });
      
  }
  
  function openResponses(formId) {
    window.location.href = `/responses.html?formId=${formId}`;
  }
  if (document.getElementById("forms")) {
    loadForms();
  }
  async function signup() {
    const name = document.getElementById("name").value;
    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;
    const confirm = document.getElementById("confirm").value;
  
    if (password !== confirm) {
      document.getElementById("error").innerText = "Passwords do not match";
      return;
    }
  
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password })
    });
  
    const data = await res.json();
  
    if (res.ok) {
      window.location.href = "/login.html";
    } else {
      document.getElementById("error").innerText = data.error;
    }
  }
  
  if (
    document.getElementById("dashboard") ||
    document.getElementById("create-form") ||
    document.getElementById("add-questions") ||
    document.getElementById("responses")
  ) {
    requireAuth();
  }
  async function deleteForm(formId) {
    const confirmDelete = confirm(
      "Are you sure you want to delete this form?\nThis action cannot be undone."
    );
  
    if (!confirmDelete) return;
  
    const res = await fetch(`/api/forms/${formId}`, {
      method: "DELETE"
    });
  
    const data = await res.json();
  
    if (res.ok) {
      alert("Form deleted");
      loadForms(); // refresh dashboard
    } else {
      alert(data.error || "Failed to delete form");
    }
  }
  async function loadProfile() {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      window.location.href = "/login.html";
      return;
    }
  
    const res = await fetch(`/api/auth/profile/${userId}`);
    const data = await res.json();
  
    if (!res.ok) {
      alert(data.error);
      return;
    }
  
    document.getElementById("email").innerText = data.email;
    document.getElementById("name").value = data.full_name || "";
  }
  
  async function updateProfile() {
    const userId = localStorage.getItem("userId");
    const full_name = document.getElementById("name").value;
  
    const res = await fetch(`/api/auth/profile/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ full_name })
    });
  
    const data = await res.json();
    document.getElementById("status").innerText =
      res.ok ? "Profile updated" : data.error;
  }
  if (document.getElementById("name") && document.getElementById("email")) {
    loadProfile();
  }
  async function changePassword() {
    const userId = localStorage.getItem("userId");
  
    const oldPassword = document.getElementById("oldPassword").value;
    const newPassword = document.getElementById("newPassword").value;
    const confirm = document.getElementById("confirmPassword").value;
  
    if (newPassword !== confirm) {
      document.getElementById("passwordStatus").innerText =
        "Passwords do not match";
      return;
    }
  
    const res = await fetch(`/api/auth/change-password/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPassword, newPassword })
    });
  
    const data = await res.json();
  
    document.getElementById("passwordStatus").innerText =
      res.ok ? "Password changed successfully" : data.error;
  }
  async function requestOtp() {
    const email = document.getElementById("email").value;
  
    const res = await fetch("/api/auth/request-reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email })
    });
  
    document.getElementById("status").innerText =
      "If the account exists, OTP has been sent";
  }
  
  async function resetPassword() {
    const email = document.getElementById("email").value;
    const otp = document.getElementById("otp").value;
    const newPassword = document.getElementById("newPassword").value;
  
    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, otp, newPassword })
    });
  
    const data = await res.json();
    document.getElementById("status").innerText =
      res.ok ? "Password reset successful" : data.error;
  }
  function goToReset() {
    window.location.href = "/reset-password.html";
 }
window.requestOtp = async function () {
    const emailEl = document.getElementById("email");
    const statusEl = document.getElementById("status");
  
    if (!emailEl) return;
  
    const email = emailEl.value.trim();
  
    if (!email) {
      if (statusEl) statusEl.innerText = "Please enter email";
      return;
    }
  
    if (statusEl) statusEl.innerText = "Sending OTP...";
  
    try {
      const res = await fetch("/api/auth/request-reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });
  
      const data = await res.json();
  
      if (res.ok) {
        if (statusEl) statusEl.innerText = "OTP sent to your email";
      } else {
        if (statusEl) statusEl.innerText = data.error || "Failed to send OTP";
      }
    } catch (err) {
      if (statusEl) statusEl.innerText = "Network error";
    }
  };

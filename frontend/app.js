console.log("app.js loaded");

/* =========================
   CONFIG
========================= */
const API = "http://localhost:3000/api";


/* =========================
   AUTH
========================= */
async function login() {
  const usernameEl = document.getElementById("username");
  const passwordEl = document.getElementById("password");
  const errorEl = document.getElementById("error");

  if (!usernameEl || !passwordEl) return;

  const username = usernameEl.value;
  const password = passwordEl.value;

  if (!username || !password) {
    errorEl.innerText = "Missing credentials";
    return;
  }

  const res = await fetch(`${API}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password })
  });

  const data = await res.json();

  if (res.ok) {
    localStorage.setItem("userId", data.userId);
    window.location.href = "/dashboard.html";
  } else {
    errorEl.innerText = data.error;
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
  if (!titleEl || !userId) return;

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
      questionType: typeEl?.value || "text"
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

/* =========================
   PUBLIC FORM LOAD
========================= */
const params = new URLSearchParams(window.location.search);
const formId = params.get("formId");

async function loadForm() {
  if (!formId) return;

  const res = await fetch(`${API}/forms/${formId}`);
  const data = await res.json();

  document.getElementById("title").innerText = data.form.title;
  document.getElementById("description").innerText = data.form.description;

  const qDiv = document.getElementById("questions");
  qDiv.innerHTML = "";

  data.questions.forEach(q => {
    qDiv.innerHTML += `
      <p>${q.question_text}</p>
      <input data-id="${q.id}" />
    `;
  });
}

/* =========================
   SUBMIT FEEDBACK (PUBLIC)
========================= */
async function submitFeedback() {
  const inputs = document.querySelectorAll("input[data-id]");

  const answers = Array.from(inputs).map(i => ({
    questionId: i.dataset.id,
    answerText: i.value
  }));

  await fetch(`${API}/responses`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formId, answers })
  });

  alert("Thank you for your feedback");
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

// feedback.html
if (formId && document.getElementById("questions")) {
  loadForm();
}

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
        <li>
          ${form.title}
          <button onclick="openResponses('${form.id}')">View</button>
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
  
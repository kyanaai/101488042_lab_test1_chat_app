const form = document.getElementById("loginForm");
const errorText = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  errorText.textContent = "";

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (!res.ok) {
      errorText.textContent = data.message || "Login failed";
      return;
    }

    // save session
    localStorage.setItem("user", JSON.stringify(data.user));

    // go to chat
    window.location.href = "/chat.html";
  } catch (err) {
    errorText.textContent = "Something went wrong. Try again.";
  }
});
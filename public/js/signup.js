const form = document.getElementById("signupForm");
const msg = document.getElementById("msg");
const errorText = document.getElementById("error");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  msg.textContent = "";
  errorText.textContent = "";

  const username = document.getElementById("username").value.trim();
  const firstname = document.getElementById("firstname").value.trim();
  const lastname = document.getElementById("lastname").value.trim();
  const password = document.getElementById("password").value;

  try {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, firstname, lastname, password })
    });

    const data = await res.json();

    if (!res.ok) {
      errorText.textContent = data.message || "Signup failed";
      return;
    }

    msg.textContent = "Signup successful! Redirecting to login...";
    setTimeout(() => (window.location.href = "/login.html"), 900);
  } catch (err) {
    errorText.textContent = "Something went wrong. Try again.";
  }
});
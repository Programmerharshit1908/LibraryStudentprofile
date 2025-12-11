
  // ================== PAGE NAVIGATION ==================
  // Nav links
  document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", function (e) {
      e.preventDefault();
      const pageId = this.getAttribute("data-page");
      showPage(pageId);

      // active class change
      document
        .querySelectorAll(".nav-link")
        .forEach((nav) => nav.classList.remove("active"));
      this.classList.add("active");
    });
  });

  // Home buttons
  document
    .getElementById("goToRegister")
    .addEventListener("click", () => showPage("register"));
  document
    .getElementById("goToLogin")
    .addEventListener("click", () => showPage("login"));
  document
    .getElementById("goToLoginFromProfile")
    .addEventListener("click", () => showPage("login"));
  document
    .getElementById("backFromRegister")
    .addEventListener("click", () => showPage("home"));
  document
    .getElementById("backFromLogin")
    .addEventListener("click", () => showPage("home"));

  function showPage(pageId) {
    // nav active
    document
      .querySelectorAll(".nav-link")
      .forEach((nav) => nav.classList.remove("active"));
    const navLink = document.querySelector(`[data-page="${pageId}"]`);
    if (navLink) navLink.classList.add("active");

    // pages show/hide
    document.querySelectorAll(".page").forEach((page) => {
      page.classList.remove("active");
    });
    document.getElementById(pageId).classList.add("active");

    // profile page par aane pe profile reload karo
    if (pageId === "profile") {
      loadProfile();
    }
  }

  // ================== REGISTRATION (SUPABASE) ==================
  document
    .getElementById("registrationForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const fullName = document.getElementById("fullName").value;
      const email = document.getElementById("email").value;
      const phone = document.getElementById("phone").value;
      // course / year fields abhi HTML me commented hain, isliye use nahi kar rahe
      const password = document.getElementById("password").value;
      const confirmPassword = document.getElementById("confirmPassword").value;

      if (password !== confirmPassword) {
        showMessage("registerMessage", "Passwords do not match!", "error");
        return;
      }

      try {
        // 1) Supabase Auth Signup
        const { data: signUpData, error: signUpError } =
          await supabase.auth.signUp({
            email,
            password,
          });

        if (signUpError) {
          showMessage("registerMessage", signUpError.message, "error");
          return;
        }

        const user = signUpData.user;

        // 2) students table me insert
        const { error: insertError } = await supabase.from("students").insert([
          {
            id: user.id, // auth user id
            full_name: fullName,
            email: email,
            phone: phone,
            // course/year optional, null rehne do
          },
        ]);

        if (insertError) {
          showMessage("registerMessage", insertError.message, "error");
          return;
        }

        showMessage(
          "registerMessage",
          "Registration successful! Please login.",
          "success"
        );
        document.getElementById("registrationForm").reset();

        setTimeout(() => {
          showPage("login");
        }, 1000);
      } catch (err) {
        console.error(err);
        showMessage(
          "registerMessage",
          "Something went wrong. Try again.",
          "error"
        );
      }
    });

  // ================== LOGIN (SUPABASE) ==================
  document
    .getElementById("loginForm")
    .addEventListener("submit", async function (e) {
      e.preventDefault();

      const email = document.getElementById("loginEmail").value;
      const password = document.getElementById("loginPassword").value;

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          showMessage("loginMessage", error.message, "error");
          return;
        }

        const user = data.user;

        // students table se profile nikaalna
        const { data: student, error: profileError } = await supabase
          .from("students")
          .select("*")
          .eq("id", user.id)
          .single();

        if (profileError || !student) {
          showMessage(
            "loginMessage",
            "Login successful but profile not found.",
            "error"
          );
          return;
        }

        // localStorage me currentStudent store karo
        localStorage.setItem("currentStudent", JSON.stringify(student));

        showMessage("loginMessage", "Login successful!", "success");

        setTimeout(() => {
          showPage("profile");
          loadProfile();
        }, 800);
      } catch (err) {
        console.error(err);
        showMessage("loginMessage", "Something went wrong. Try again.", "error");
      }

      document.getElementById("loginForm").reset();
    });

  // ================== PROFILE LOAD (SUPABASE) ==================
  async function loadProfile() {
    let student = null;

    // 1) localStorage se
    const stored = localStorage.getItem("currentStudent");
    if (stored) {
      student = JSON.parse(stored);
    }

    // 2) agar localStorage empty hai to Supabase se current user le aao
    if (!student) {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data: dbStudent } = await supabase
          .from("students")
          .select("*")
          .eq("id", user.id)
          .single();
        student = dbStudent;
        if (student) {
          localStorage.setItem("currentStudent", JSON.stringify(student));
        }
      }
    }

    // agar abhi bhi student nahi mila
    if (!student) {
      document.getElementById("profileContent").innerHTML = `
        <div style="text-align: center; padding: 40px 0;">
          <i class="fas fa-user-circle" style="font-size: 5rem; color: #bdc3c7;"></i>
          <p style="margin-top: 20px; color: #7f8c8d;">Please login to view your profile</p>
          <button class="btn" id="goToLoginFromProfile">Go to Login</button>
        </div>
      `;
      document
        .getElementById("goToLoginFromProfile")
        .addEventListener("click", () => showPage("login"));
      return;
    }

    // Sample borrowed books (abhi frontend se hi, DB se nahi)
    const sampleBooks = [
      {
        title: "Introduction to Algorithms",
        author: "Thomas H. Cormen",
        dueDate: "2025-12-15",
        fine: 0,
      },
      {
        title: "Clean Code",
        author: "Robert C. Martin",
        dueDate: "2025-12-10",
        fine: 50,
      },
      {
        title: "The Great Gatsby",
        author: "F. Scott Fitzgerald",
        dueDate: "2025-11-28",
        fine: 120,
      },
    ];

    const profileHTML = `
      <div class="profile-card">
        <div class="profile-pic">
          <i class="fas fa-user"></i>
        </div>

        <div class="profile-details">
          <div class="detail-row">
            <div class="detail-label">Student ID:</div>
            <div class="detail-value">${student.id}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Full Name:</div>
            <div class="detail-value">${student.full_name || ""}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Email:</div>
            <div class="detail-value">${student.email || ""}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Phone:</div>
            <div class="detail-value">${student.phone || ""}</div>
          </div>

          <div class="detail-row">
            <div class="detail-label">Registration Date:</div>
            <div class="detail-value">
              ${
                student.created_at
                  ? new Date(student.created_at).toLocaleDateString()
                  : "-"
              }
            </div>
          </div>
        </div>
      </div>

      <div class="books-list">
        <h3>Borrowed Books</h3>

        ${
          sampleBooks.length > 0
            ? sampleBooks
                .map(
                  (book) => `
          <div class="book-item">
            <div>
              <div class="book-title">${book.title}</div>
              <div style="color: #7f8c8d; font-size: 0.9rem;">by ${
                book.author
              }</div>
            </div>
            <div>
              <div class="book-due">Due: ${book.dueDate}</div>
              <div style="color: ${
                book.fine > 0 ? "#e74c3c" : "#27ae60"
              }; font-weight: 500;">
                Fine: ₹${book.fine}
              </div>
            </div>
          </div>
        `
                )
                .join("")
            : '<p style="text-align: center; padding: 20px; color: #7f8c8d;">No books currently borrowed.</p>'
        }
      </div>

      <div class="flex-buttons">
        <button class="btn" id="logoutBtn">Logout</button>
      </div>
    `;

    document.getElementById("profileContent").innerHTML = profileHTML;

    // Logout button
    document.getElementById("logoutBtn").addEventListener("click", async () => {
      localStorage.removeItem("currentStudent");
      await supabase.auth.signOut();
      showPage("home");

      document.getElementById("profileContent").innerHTML = `
        <div style="text-align: center; padding: 40px 0;">
          <i class="fas fa-user-circle" style="font-size: 5rem; color: #bdc3c7;"></i>
          <p style="margin-top: 20px; color: #7f8c8d;">Please login to view your profile</p>
          <button class="btn" id="goToLoginFromProfile">Go to Login</button>
        </div>
      `;
      document
        .getElementById("goToLoginFromProfile")
        .addEventListener("click", () => showPage("login"));
    });
  }

  // ================== MESSAGE HELPER ==================
  function showMessage(elementId, message, type) {
    const messageElement = document.getElementById(elementId);
    messageElement.textContent = message;
    messageElement.className = `message ${type}`;
    messageElement.style.display = "block";

    setTimeout(() => {
      messageElement.style.display = "none";
    }, 5000);
  }

  // ================== ON PAGE LOAD ==================
  window.addEventListener("DOMContentLoaded", async function () {
    // check existing session
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // get student from DB
      const { data: student } = await supabase
        .from("students")
        .select("*")
        .eq("id", user.id)
        .single();

      if (student) {
        localStorage.setItem("currentStudent", JSON.stringify(student));
        showPage("profile");
        loadProfile();
        return;
      }
    }

    // default: show home
    showPage("home");
  });

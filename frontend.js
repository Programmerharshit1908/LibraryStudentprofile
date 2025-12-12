// ================== UTILITIES & UI HELPERS ==================

// Helper to show loading state on buttons
function setLoading(buttonId, isLoading, defaultText) {
    const btn = document.getElementById(buttonId);
    if (!btn) return;

    if (isLoading) {
        btn.disabled = true;
        btn.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> Processing...`;
        btn.style.opacity = "0.7";
    } else {
        btn.disabled = false;
        btn.innerHTML = defaultText;
        btn.style.opacity = "1";
    }
}

// Helper to show messages (Success/Error)
function showMessage(elementId, message, type) {
    const messageElement = document.getElementById(elementId);
    if (!messageElement) return;
    
    // Icon based on type
    const icon = type === 'success' ? '<i class="fas fa-check-circle"></i>' : '<i class="fas fa-exclamation-circle"></i>';
    
    messageElement.innerHTML = `${icon} ${message}`;
    messageElement.className = `message ${type}`;
    messageElement.style.display = "block"; // Changed from flex to block to match CSS

    // Auto hide after 5 seconds
    setTimeout(() => {
        messageElement.style.display = "none";
    }, 5000);
}

// ================== PAGE NAVIGATION ==================

function showPage(pageId) {
    // 1. Update Navigation Links
    document.querySelectorAll(".nav-link").forEach((nav) => nav.classList.remove("active"));
    
    const activeLink = document.querySelector(`[data-page="${pageId}"]`);
    if (activeLink) activeLink.classList.add("active");

    // 2. Hide all pages & Show target page
    document.querySelectorAll(".page").forEach((page) => {
        page.classList.remove("active");
        // Reset scroll position when switching
        window.scrollTo(0, 0); 
    });
    
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add("active");

    // 3. Special Logic for Profile Page
    if (pageId === "profile") {
        loadProfile();
    }
}

// Event Listeners for Navigation
document.querySelectorAll(".nav-link").forEach((link) => {
    link.addEventListener("click", function (e) {
        e.preventDefault();
        const pageId = this.getAttribute("data-page");
        showPage(pageId);
    });
});

// Button Event Listeners
const navMap = {
    "goToRegister": "register",
    "goToLogin": "login",
    "backFromRegister": "home",
    "backFromLogin": "home"
};

for (const [btnId, pageId] of Object.entries(navMap)) {
    const btn = document.getElementById(btnId);
    if (btn) {
        btn.addEventListener("click", () => showPage(pageId));
    }
}

// ================== REGISTRATION LOGIC ==================

document.getElementById("registrationForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const fullName = document.getElementById("fullName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    if (password !== confirmPassword) {
        showMessage("registerMessage", "Passwords do not match!", "error");
        return;
    }

    if (password.length < 6) {
        showMessage("registerMessage", "Password must be at least 6 characters.", "error");
        return;
    }

    setLoading("btnRegisterSubmit", true, "Register");

    try {
        // 1. Supabase Auth Signup
        const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email,
            password,
            options: {
                data: { full_name: fullName, phone: phone } // Store metadata
            }
        });

        if (signUpError) throw signUpError;

        const user = signUpData.user;

        if (user) {
            // 2. Insert into 'students' table
            const { error: insertError } = await supabase.from("students").insert([
                {
                    id: user.id,
                    full_name: fullName,
                    email: email,
                    phone: phone,
                },
            ]);

            if (insertError) throw insertError;

            showMessage("registerMessage", "Registration Successful! Redirecting to login...", "success");
            document.getElementById("registrationForm").reset();

            setTimeout(() => {
                showPage("login");
            }, 2000);
        }

    } catch (err) {
        console.error("Registration Error:", err);
        showMessage("registerMessage", err.message || "Registration failed. Try again.", "error");
    } finally {
        setLoading("btnRegisterSubmit", false, "Register");
    }
});

// ================== LOGIN LOGIC ==================

document.getElementById("loginForm").addEventListener("submit", async function (e) {
    e.preventDefault();

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;

    setLoading("btnLoginSubmit", true, "Login");

    try {
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) throw error;

        const user = data.user;

        // Fetch user profile from 'students' table
        const { data: student, error: profileError } = await supabase
            .from("students")
            .select("*")
            .eq("id", user.id)
            .single();

        if (profileError || !student) {
            throw new Error("Login successful, but student profile not found.");
        }

        // Store session
        localStorage.setItem("currentStudent", JSON.stringify(student));
        
        showMessage("loginMessage", "Login Successful!", "success");
        document.getElementById("loginForm").reset();

        setTimeout(() => {
            showPage("profile");
        }, 1000);

    } catch (err) {
        console.error("Login Error:", err);
        showMessage("loginMessage", err.message || "Invalid login credentials.", "error");
    } finally {
        setLoading("btnLoginSubmit", false, "Login");
    }
});

// ================== PROFILE & DATA LOADING ==================

async function loadProfile() {
    const contentDiv = document.getElementById("profileContent");
    const logoutBtnTop = document.getElementById("logoutBtnTop");
    
    let student = null;

    // 1. Try Local Storage
    try {
        const stored = localStorage.getItem("currentStudent");
        if (stored) student = JSON.parse(stored);
    } catch (e) { console.error("Storage Error", e); }

    // 2. Fallback to Supabase Session
    if (!student) {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: dbStudent } = await supabase
                .from("students")
                .select("*")
                .eq("id", user.id)
                .single();
            student = dbStudent;
            if (student) localStorage.setItem("currentStudent", JSON.stringify(student));
        }
    }

    // 3. Not Logged In State
    if (!student) {
        if(logoutBtnTop) logoutBtnTop.style.display = 'none'; // Hide logout if not logged in
        contentDiv.innerHTML = `
            <div style="text-align: center; padding: 40px 0;">
                <div style="font-size: 5rem; color: #cfd8dc; margin-bottom: 20px;">
                    <i class="fas fa-lock"></i>
                </div>
                <h3>Access Restricted</h3>
                <p style="color: #78909c; margin-bottom: 30px;">Please login to view your student profile and book history.</p>
                <button class="btn" id="goToLoginFromProfile">
                    <i class="fas fa-sign-in-alt"></i> Go to Login
                </button>
            </div>
        `;
        document.getElementById("goToLoginFromProfile").addEventListener("click", () => showPage("login"));
        return;
    }

    // 4. Logged In State
    if(logoutBtnTop) {
        logoutBtnTop.style.display = 'inline-block';
        logoutBtnTop.onclick = handleLogout;
    }

    // Mock Data for UI demonstration
    const sampleBooks = [
        { title: "Introduction to Algorithms", author: "Thomas H. Cormen", dueDate: "15 Dec 2025", fine: 0 },
        { title: "Clean Code", author: "Robert C. Martin", dueDate: "10 Dec 2025", fine: 50 },
        { title: "The Great Gatsby", author: "F. Scott Fitzgerald", dueDate: "28 Nov 2025", fine: 120 },
    ];

    const profileHTML = `
        <div class="profile-card">
            <div class="profile-pic">
                <i class="fas fa-user-graduate"></i>
            </div>

            <div class="profile-details">
                <div class="detail-row">
                    <div class="detail-label">Student Name</div>
                    <div class="detail-value" style="font-size: 1.2rem;">${student.full_name || "N/A"}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Email</div>
                    <div class="detail-value">${student.email || "N/A"}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Phone</div>
                    <div class="detail-value">${student.phone || "N/A"}</div>
                </div>
                <div class="detail-row">
                    <div class="detail-label">Member Since</div>
                    <div class="detail-value">${student.created_at ? new Date(student.created_at).toLocaleDateString() : "-"}</div>
                </div>
            </div>
        </div>

        <div class="books-list">
            <h3 style="margin-bottom: 20px; display: flex; align-items: center; gap: 10px;">
                <i class="fas fa-book-reader" style="color: var(--primary);"></i> Borrowed Books
            </h3>

            ${sampleBooks.length > 0 ? sampleBooks.map(book => `
                <div class="book-item">
                    <div style="flex: 1;">
                        <div class="book-title">${book.title}</div>
                        <div style="color: #90a4ae; font-size: 0.9rem;">
                            <i class="fas fa-pen-nib" style="font-size: 0.8rem;"></i> ${book.author}
                        </div>
                    </div>
                    <div style="text-align: right; min-width: 120px;">
                        <div class="book-due">Due: ${book.dueDate}</div>
                        ${book.fine > 0 
                            ? `<div style="color: var(--error); font-weight: 600; font-size: 0.9rem; margin-top: 4px;">
                                <i class="fas fa-exclamation-triangle"></i> Fine: ₹${book.fine}
                               </div>` 
                            : `<div style="color: var(--success); font-size: 0.85rem; margin-top: 4px;">
                                <i class="fas fa-check"></i> No Fine
                               </div>`
                        }
                    </div>
                </div>
            `).join('') : `
                <div style="text-align: center; padding: 30px; background: #fafafa; border-radius: 8px; color: #90a4ae;">
                    <i class="fas fa-books" style="font-size: 2rem; margin-bottom: 10px; display: block;"></i>
                    No books currently borrowed.
                </div>
            `}
        </div>
        
        <div class="flex-buttons" style="margin-top: 30px;">
            <button class="btn btn-secondary" onclick="handleLogout()" style="width: 100%;">
                <i class="fas fa-sign-out-alt"></i> Logout
            </button>
        </div>
    `;

    contentDiv.innerHTML = profileHTML;
}

// Global Logout Handler
window.handleLogout = async function() {
    if(confirm("Are you sure you want to logout?")) {
        localStorage.removeItem("currentStudent");
        await supabase.auth.signOut();
        showPage("home");
        showMessage("loginMessage", "Logged out successfully.", "success"); // Show on login/home page if needed
    }
};

// ================== INITIALIZATION ==================
window.addEventListener("DOMContentLoaded", async function () {
    // Check for existing session silently
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        // If session exists, try to get student data
        const { data: student } = await supabase
            .from("students")
            .select("*")
            .eq("id", session.user.id)
            .single();

        if (student) {
            localStorage.setItem("currentStudent", JSON.stringify(student));
        }
    } else {
        localStorage.removeItem("currentStudent");
    }

    // Default to Home page
    showPage("home");
});

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('loginForm');
    const guestButton = document.getElementById('continueAsGuestBtn'); // Make sure this ID is on your button in login.html
    // Remove messageDiv logic for this minimal test if it's causing confusion

    if (loginForm) {
        loginForm.addEventListener('submit', function(event) {
            event.preventDefault(); 
            console.log("--- Login form submitted (script.js) ---");

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            fetch('/login-action', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email, password: password }),
            })
            .then(response => {
                console.log("--- Login action: Raw response object from fetch:", response);
                if (!response.ok) {
                    console.error("--- Login action: Network response was not ok", response.status, response.statusText);
                    response.json().then(errData => console.error("--- Login action: Error data from backend:", errData)).catch(() => {}); // Catch potential error if response isn't JSON
                    throw new Error('Network response was not ok for login.');
                }
                return response.json();
            })
            .then(data => {
                console.log("--- Login action: Parsed JSON data from backend:", data); 
                if (data && data.success) {
                    console.log("--- Login action: Success from backend. Message:", data.message);
                    // FORCING REDIRECT FOR TEST
                    console.log("--- Login action: REDIRECTING NOW to /dashboard (forced)");
                    window.location.href = '/dashboard';
                } else {
                    console.error("--- Login action: Backend reported failure or unexpected data structure.", data);
                }
            })
            .catch((error) => {
                console.error("--- Login action: FETCH CATCH BLOCK ERROR:", error);
            });
        });
    }
    
    // --- UNCOMMENT AND ACTIVATE THIS SECTION ---
    if (guestButton) {
        guestButton.addEventListener('click', function() {
            console.log("--- Continue as Guest button clicked (script.js) ---");

            fetch('/guest-login', { // Ensure this route exists in app.py
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}), // Empty body for guest login
            })
            .then(response => {
                console.log("--- Guest login: Raw response object from fetch:", response);
                 if (!response.ok) {
                    console.error("--- Guest login: Network response was not ok", response.status, response.statusText);
                    response.json().then(errData => console.error("--- Guest login: Error data from backend:", errData)).catch(() => {});
                    throw new Error('Network response was not ok for guest login.');
                }
                return response.json();
            })
            .then(data => {
                console.log("--- Guest login: Parsed JSON data from backend:", data);
                if (data && data.success) {
                    console.log("--- Guest login: Success from backend. Message:", data.message);
                    // FORCING REDIRECT FOR TEST
                    console.log("--- Guest login: REDIRECTING NOW to /dashboard (forced)");
                    window.location.href = '/dashboard';
                } else {
                    console.error("--- Guest login: Backend reported failure or unexpected data structure.", data);
                }
            })
            .catch((error) => {
                console.error("--- Guest login: FETCH CATCH BLOCK ERROR:", error);
            });
        });
        }
        // In script.js, for both login and guest .then(data => ...) blocks
    if (data.success) {
        // ... showMessage ...
        if (data.redirect_url) { // Use the URL from backend
            console.log('Redirecting to:', data.redirect_url);
            window.location.href = data.redirect_url;
        } else {
            console.error('Redirect URL missing! Fallback to /dashboard.');
            window.location.href = '/dashboard';
        }
    }
    // --- END OF GUEST BUTTON LISTENER ---
});
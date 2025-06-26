document.addEventListener('DOMContentLoaded', function() {
    const registerForm = document.getElementById('registerForm');
    const messageDiv = document.getElementById('registerMessage');

    if (registerForm) {
        registerForm.addEventListener('submit', function(event) {
            event.preventDefault(); // Prevent default form submission

            // Clear previous messages
            messageDiv.textContent = '';
            messageDiv.className = 'message'; // Reset class
            messageDiv.style.display = 'none';

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const confirm_password = document.getElementById('confirm_password').value;

            if (!name || !email || !password || !confirm_password) {
                messageDiv.textContent = 'All fields are required.';
                messageDiv.className = 'message error'; // Add your .error class style
                messageDiv.style.display = 'block';
                return;
            }

            if (password !== confirm_password) {
                messageDiv.textContent = 'Passwords do not match!';
                messageDiv.className = 'message error';
                messageDiv.style.display = 'block';
                return;
            }

            // Send data to the backend
            fetch('/register-action', { // This will be our new backend endpoint
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    name: name,
                    email: email,
                    password: password
                }),
            })
            .then(response => response.json())
            .then(data => {
                messageDiv.style.display = 'block';
                if (data.success) {
                    messageDiv.textContent = data.message || 'Registration successful! Redirecting to login...';
                    messageDiv.className = 'message success'; // Add your .success class style
                    // Redirect to login page after a short delay
                    setTimeout(function() {
                        window.location.href = data.redirect_url || '/login'; // Use redirect_url from backend
                    }, 1500); // 1.5 seconds delay
                } else {
                    messageDiv.textContent = data.message || 'Registration failed. Please try again.';
                    messageDiv.className = 'message error';
                }
            })
            .catch((error) => {
                console.error('Error:', error);
                messageDiv.style.display = 'block';
                messageDiv.textContent = 'An error occurred during registration. Please try again.';
                messageDiv.className = 'message error';
            });
        });
    }
});
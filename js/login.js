document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the form from submitting the traditional way

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    if (username === 'admin' && password === 'admin123') {
        // Display the success message
        const messageElement = document.createElement('div');
        messageElement.textContent = 'Login Successful...';
        messageElement.style.color = 'green';

        // Append the message below the login button
        const form = document.getElementById('loginForm');
        form.appendChild(messageElement);

        // Redirect after 3 seconds
        setTimeout(function() {
            window.location.href = 'index.html'; // Redirect to users.html
        }, 3000);
    } else {
        alert('Invalid username or password');
    }
});
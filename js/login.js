document.getElementById('loginForm').addEventListener('submit', function(event) {
    event.preventDefault();
    
    var username = document.getElementById('username').value;
    var password = document.getElementById('password').value;
    var message = document.getElementById('message');

    if (username === 'admin' && password === 'admin123') {
        message.style.color = 'green';
        message.textContent = 'Login successful!';
        setTimeout(function() {
            window.location.href = 'users.html';
        }, 1000); // Redirects after 1 second
    } else {
        message.style.color = 'red';
        message.textContent = 'Invalid username or password';
    }
});
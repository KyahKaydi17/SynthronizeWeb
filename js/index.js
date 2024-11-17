// Initialize loading bar
NProgress.configure({ showSpinner: false });

document.addEventListener('DOMContentLoaded', function() {
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    const iframe = document.getElementById('contentFrame');
    const sidebar = document.querySelector('.sidebar');
    const themeToggle = document.getElementById('themeToggle');
    
    // Theme handling
    const theme = localStorage.getItem('theme') || 'light';
    document.body.setAttribute('data-theme', theme);

    // Initialize tooltips
    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl)
    });

    // Hamburger menu
    const navbar = document.querySelector('.navbar');
    const hamburger = document.createElement('div');
    hamburger.className = 'hamburger';
    hamburger.innerHTML = '<i class="fas fa-bars"></i>';
    navbar.insertBefore(hamburger, navbar.firstChild);

    // Toggle sidebar
    hamburger.addEventListener('click', () => {
        sidebar.classList.toggle('active');
        // Add animation class
        sidebar.classList.add('sidebar-animate');
    });
    function logout() {
        firebase.auth().signOut().then(() => {
            window.location.href = 'login.html'; // Direct page redirect
        }).catch((error) => {
            console.error('Logout Error:', error);
        });
    }

    // Handle navigation
    sidebarLinks.forEach(link => {
        link.addEventListener('click', async function(event) {
            event.preventDefault();
            NProgress.start();
            
            try {
                iframe.src = this.getAttribute('href');
                if (window.innerWidth <= 768) {
                    sidebar.classList.remove('active');
                }
                // Show loading indicator
                showLoading();
            } catch (error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Navigation Error',
                    text: 'Failed to load the page'
                });
            }
        });
    });

    // Handle iframe load events
    iframe.addEventListener('load', () => {
        NProgress.done();
        hideLoading();
    });

    // Close sidebar when clicking outside
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 768 && 
            !sidebar.contains(e.target) && 
            !hamburger.contains(e.target)) {
            sidebar.classList.remove('active');
        }
    });

    // Handle notifications
    const notificationBtn = document.querySelector('.fa-bell');
    notificationBtn.addEventListener('click', () => {
        Swal.fire({
            title: 'Notifications',
            html: '<div class="notifications-list">No new notifications</div>',
            showConfirmButton: false,
            showCloseButton: true,
            customClass: {
                container: 'notification-popup'
            }
        });
    });
});

// Loading handlers
function showLoading() {
    const loader = document.createElement('div');
    loader.className = 'loader-overlay';
    loader.innerHTML = '<div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div>';
    document.body.appendChild(loader);
}

function hideLoading() {
    const loader = document.querySelector('.loader-overlay');
    if (loader) {
        loader.remove();
    }
}
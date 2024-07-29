document.addEventListener('DOMContentLoaded', function() {
    var menuToggle = document.querySelector('header .menu-toggle');
    var closeButton = document.querySelector('header nav .close-btn');
    var nav = document.querySelector('header nav');

    menuToggle.addEventListener('click', function() {
        nav.classList.add('open');
    });

    closeButton.addEventListener('click', function() {
        nav.classList.remove('open');
    });
});

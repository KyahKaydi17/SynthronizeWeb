// menu-toggle.js

document.addEventListener('DOMContentLoaded', function () {
    const menuToggle = document.querySelector('.menu-toggle');
    const nav = document.querySelector('header nav');
    const closeBtn = document.querySelector('header nav .close-btn');
    const accountButton = document.querySelector('.account-button');
    const accountMenu = document.querySelector('.account-menu');

    menuToggle.addEventListener('click', function () {
        nav.classList.toggle('open');
    });

    closeBtn.addEventListener('click', function () {
        nav.classList.remove('open');
    });

    accountButton.addEventListener('click', function () {
        accountMenu.classList.toggle('open');
    });

    document.addEventListener('click', function (event) {
        if (!accountButton.contains(event.target) && !accountMenu.contains(event.target)) {
            accountMenu.classList.remove('open');
        }
    });
});

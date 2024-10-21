document.addEventListener('DOMContentLoaded', function() {
    const toggleBtn = document.getElementById('toggleBtn');
    const sidebar = document.getElementById('sidebar');
    const content = document.querySelector('.content');
    const searchInput = document.getElementById('searchInput');
    const iframe = document.getElementById('contentFrame');
    let searchTimeout;

    // Toggle sidebar
    toggleBtn.addEventListener('click', function() {
        sidebar.classList.toggle('collapsed');
        if (sidebar.classList.contains('collapsed')) {
            content.style.marginLeft = "0";
        } else {
            content.style.marginLeft = "250px";
        }
    });

    // Handle search input event (trigger on typing)
    searchInput.addEventListener('input', function() {
        clearTimeout(searchTimeout);
        const query = searchInput.value.trim();
        
        // Introduce a small delay (300ms) to avoid too many requests
        searchTimeout = setTimeout(function() {
            if (query) {
                // Send the query to the currently loaded iframe for searching
                iframe.contentWindow.postMessage({ type: 'search', query: query }, '*');
            }
        }, 300);
    });
});

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyC1Ru73_PthZu4QjBzv9J8bqDr4rtaQWAM",
    authDomain: "synthronize.firebaseapp.com",
    databaseURL: "https://synthronize-default-rtdb.firebaseio.com",
    projectId: "synthronize",
    storageBucket: "synthronize.appspot.com",
    messagingSenderId: "360481503787",
    appId: "1:360481503787:web:2ed05b2c6ade021314886e"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

// Elements
const reportList = document.getElementById('list');
const reportInfo = document.getElementById('reportInfo');

// Load reports from Firebase
function loadReports() {
    db.collection('reports').get().then((querySnapshot) => {
        reportList.innerHTML = ''; // Clear previous list
        querySnapshot.forEach((doc) => {
            const data = doc.data();
            const listItem = document.createElement('li');
            listItem.textContent = `Report ID: ${doc.id}`;
            listItem.dataset.id = doc.id;
            listItem.addEventListener('click', () => loadReportDetails(doc.id));
            reportList.appendChild(listItem);
        });
    }).catch((error) => {
        console.error("Error loading reports: ", error);
    });
}

// Load report details
function loadReportDetails(reportId) {
    db.collection('reports').doc(reportId).get().then((doc) => {
        if (doc.exists) {
            const data = doc.data();
            const formattedDate = new Date(data.createdTimeStamp).toLocaleDateString(); // Format the date
            reportInfo.innerHTML = `
                <p><strong>OwnerID:</strong> ${data.ownerId}</p>
                <p><strong>Date of Report:</strong> ${formattedDate}</p>
                <p><strong>Reason:</strong> ${data.reason}</p>
                <p><strong>Report Type:</strong> ${data.reportType}</p>
                <p><strong>Reviewed Status:</strong> 
                    <select id="reviewedStatus">
                        <option value="true" ${data.reviewed ? 'selected' : ''}>True</option>
                        <option value="false" ${!data.reviewed ? 'selected' : ''}>False</option>
                    </select>
                </p>
                <button id="viewProfileButton">Save Changes</button>
            `;

            // Add event listener for the reviewed status dropdown
            const reviewedStatus = document.getElementById('reviewedStatus');
            reviewedStatus.addEventListener('change', (event) => {
                const newStatus = event.target.value === 'true';
                db.collection('reports').doc(reportId).update({ reviewed: newStatus })
                    .then(() => console.log("Reviewed status updated"))
                    .catch((error) => console.error("Error updating reviewed status: ", error));
            });

            // Add event listener for the view profile button
           
        } else {
            reportInfo.innerHTML = `<p>No details available for this report.</p>`;
        }
    }).catch((error) => {
        console.error("Error loading report details: ", error);
    });
}

// Toggle dark mode
function toggleDarkMode() {
    document.body.classList.toggle('dark-mode');
}

// Event listener for dark mode button
const darkModeButton = document.getElementById('darkModeButton');
if (darkModeButton) {
    darkModeButton.addEventListener('click', toggleDarkMode);
}

// Load reports on page load
window.onload = loadReports;
// Firebase configuration details
const firebaseConfig = {
    apiKey: "AIzaSyC1Ru73_PthZu4QjBzv9J8bqDr4rtaQWAM",
    authDomain: "synthronize.firebaseapp.com",
    databaseURL: "https://synthronize-default-rtdb.firebaseio.com",
    projectId: "synthronize",
    storageBucket: "synthronize.appspot.com",
    messagingSenderId: "360481503787",
    appId: "1:360481503787:web:2ed05b2c6ade021314886e"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Load all users and user counts on page load
window.onload = () => {
    loadUserCounts(); // Load user counts when the page loads
    loadUsers(); // Load user list when the page loads
};

// Load user counts
const loadUserCounts = () => {
    db.collection('users').get().then((querySnapshot) => {
        const totalUsersCount = querySnapshot.size; // Total users
        let activeUsersCount = 0; // Initialize active users count

        querySnapshot.forEach((doc) => {
            const userData = doc.data();
            if (userData.disabled !== true) { // Assuming that a user is active unless marked as disabled
                activeUsersCount++;
            }
        });

        // Update the displayed counts
        document.getElementById('totalUsers').innerText = totalUsersCount;
        document.getElementById('activeUsers').innerText = activeUsersCount;
    }).catch((error) => {
        console.error("Error getting user counts: ", error);
    });
};

// Load users into a table
const loadUsers = () => {
    db.collection('users').get().then((querySnapshot) => {
        const userTableBody = document.getElementById('userTableBody');
        userTableBody.innerHTML = ''; // Clear the table body

        querySnapshot.forEach((doc) => {
            const user = doc.data();
            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${user.fullName}</td>
                <td>${user.userType}</td>
                <td>${user.username}</td>
                <td>
                    <button class="deactivate" onclick="deactivateUser('${doc.id}')">Deactivate</button>
                </td>
            `;

            userTableBody.appendChild(row);
        });
    }).catch((error) => {
        console.error("Error getting documents: ", error);
    });
};

// Deactivate user
const deactivateUser = (userId) => {
    db.collection('users').doc(userId).update({ disabled: true })
        .then(() => {
            console.log("User successfully deactivated.");
            alert("User has been deactivated.");
            loadUsers(); // Reload users to reflect the changes
        })
        .catch((error) => {
            console.error("Error deactivating user: ", error);
        });
};

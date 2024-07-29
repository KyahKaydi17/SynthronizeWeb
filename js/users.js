// Your Firebase configuration details
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
// Reference to the Firestore database
var db = firebase.firestore();

// Function to display user info
function displayUserInfo(username) {
    db.collection('users').doc(username).get().then(function(doc) {
        if (doc.exists) {
            var userInfo = doc.data();
            var userInfoContainer = document.getElementById('userInfo');
            userInfoContainer.innerHTML = `
                <p><strong>Username:</strong> ${userInfo.username}</p>
                <p><strong>Full Name:</strong> ${userInfo.fullName}</p>
                <p><strong>Birthday:</strong> ${userInfo.birthday}</p>
            `;
        } else {
            document.getElementById('userInfo').innerHTML = '<p>No user information available.</p>';
        }
    }).catch(function(error) {
        console.error("Error getting document: ", error);
    });
}

// Function to search users
function searchUsers() {
    var input = document.getElementById('searchBar').value.toLowerCase();
    db.collection('users').get().then(function(querySnapshot) {
        var userList = document.getElementById('userList');
        userList.innerHTML = '';
        querySnapshot.forEach(function(doc) {
            var user = doc.data();
            // Convert both input and username to lowercase for case-insensitive search
            if (user.username.toLowerCase().includes(input)) {
                userList.innerHTML += `<li onclick="displayUserInfo('${doc.id}')">${user.username}</li>`;
            }
        });
    }).catch(function(error) {
        console.error("Error getting documents: ", error);
    });
}

// Load all users on page load
window.onload = function() {
    db.collection('users').get().then(function(querySnapshot) {
        var userList = document.getElementById('userList');
        userList.innerHTML = '';
        querySnapshot.forEach(function(doc) {
            var user = doc.data();
            userList.innerHTML += `<li onclick="displayUserInfo('${doc.id}')">${user.username}</li>`;
        });
    }).catch(function(error) {
        console.error("Error getting documents: ", error);
    });
};
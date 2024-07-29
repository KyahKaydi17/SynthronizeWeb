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

// Function to display community info
function displayCommunityInfo(communityID) {
    db.collection('communities').doc(communityID).get().then(function(doc) {
        if (doc.exists) {
            var communityInfo = doc.data();
            var communityInfoContainer = document.getElementById('communityInfo');
            communityInfoContainer.innerHTML = `
                <p><strong>Community Name:</strong> ${communityInfo.communityName}</p>
                <p><strong>Community Code:</strong> ${communityInfo.communityCode}</p>
                <p><strong>Description:</strong> ${communityInfo.communityDescription}</p>
            `;
        } else {
            document.getElementById('communityInfo').innerHTML = '<p>No community information available.</p>';
        }
    }).catch(function(error) {
        console.error("Error getting document: ", error);
    });
}

// Function to search communities
function searchCommunities() {
    var input = document.getElementById('searchBar').value.toLowerCase();
    db.collection('communities').get().then(function(querySnapshot) {
        var communityList = document.getElementById('communityList');
        communityList.innerHTML = '';
        querySnapshot.forEach(function(doc) {
            var community = doc.data();
            if (community.communityName.toLowerCase().includes(input)) {
                communityList.innerHTML += `<li onclick="displayCommunityInfo('${doc.id}')">${community.communityName}</li>`;
            }
        });
    }).catch(function(error) {
        console.error("Error getting documents: ", error);
    });
}

// Load all communities on page load
window.onload = function() {
    db.collection('communities').get().then(function(querySnapshot) {
        var communityList = document.getElementById('communityList');
        communityList.innerHTML = '';
        querySnapshot.forEach(function(doc) {
            var community = doc.data();
            communityList.innerHTML += `<li onclick="displayCommunityInfo('${doc.id}')">${community.communityName}</li>`;
        });
    }).catch(function(error) {
        console.error("Error getting documents: ", error);
    });
};

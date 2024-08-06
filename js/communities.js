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
           

                <p><strong>Community Name:</strong> <input type="text" id="editCommunityName" value="${communityInfo.communityName}"></p>
                <p><strong>Community Type:</strong>
                    <select id="roleSelect" disabled onchange="detectTypeChange()">
                        <option value="Private" ${communityInfo.communityType === 'Private' ? 'selected' : ''}>Private</option>
                        <option value="Public" ${communityInfo.communityType === 'Public' ? 'selected' : ''}>Public</option>
                        
                    </select>
                    <button onclick="enableEdit('communityType')">Edit</button> 
                </p>
                <p><strong>Community Code:</strong> <input type="text" id="editCommunityCode" value="${communityInfo.communityCode}" disabled></p>
                <button onclick="saveCommunityInfo('${communityID}')">Save</button>
                <button onclick="deleteCommunityInfo('${communityID}')">Delete</button>
            `;
        } else {
            document.getElementById('communityInfo').innerHTML = '<p>No community information available.</p>';
        }
    }).catch(function(error) {
        console.error("Error getting document: ", error);
    });
}


// Function to delete community data from Firestore
function deleteCommunityInfo(communityID) {
    var confirmDelete = confirm("Are you sure you want to delete this community? This action cannot be undone.");
    if (confirmDelete) {
        db.collection('communities').doc(communityID).delete()
            .then(function() {
                alert('Community deleted successfully');
                // Optionally, you can refresh the community list or redirect to another page
                loadCommunities(); // Replace with your actual function to refresh the community list
            })
            .catch(function(error) {
                console.error("Error deleting community: ", error);
                alert("Error deleting community: " + error.message);
            });
    }
}


//enable edit for types:
function enableEdit(field) {
    if (field === 'communityType') {
        document.getElementById('roleSelect').disabled = false;
        document.getElementById('saveRole').disabled = false;
    } else {
        document.getElementById('edit' + capitalizeFirstLetter(field)).removeAttribute('readonly');
        document.getElementById('save' + capitalizeFirstLetter(field)).disabled = false;
    }
}


// save community type
function saveType(communityName) {
    var role = document.getElementById('roleSelect').value;
    db.collection('communities').doc(communityName).update({
        userType:role
    }).then(function() {
        alert('Role updated successfully');
        displayUserInfo(communityName); // Refresh the displayed info
    }).catch(function(error) {
        console.error("Error updating document: ", error);
    });
}


// Function to save edited community info
function saveCommunityInfo(communityID) {
    var communityName = document.getElementById('editCommunityName').value;
    var communityType = document.getElementById('editCommunityType').value;
    var communityCode = document.getElementById('editCommunityCode').value;

    db.collection('communities').doc(communityID).update({
        communityName: communityName,
        communityType: communityType,
        communityCode: communityCode
    }).then(function() {
        alert('Community information updated successfully.');
    }).catch(function(error) {
        console.error("Error updating document: ", error);
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

// Function to create a new community
function createCommunity() {
    var communityName = document.getElementById('newCommunityName').value;
    var communityType = document.getElementById('newCommunityType').value;

    db.collection('communities').add({
        communityName: communityName,
        communityType: communityType,
        communityCode: generateCommunityCode(),
        communityCreatedTimestamp : firebase.firestore.FieldValue.serverTimestamp()
    }).then(function() {
        alert('Community created successfully.');
        closeCreateCommunityPopup();
        loadCommunities();
    }).catch(function(error) {
        console.error("Error adding document: ", error);
    });
}

// Generate a unique community code
function generateCommunityCode() {
    return 'COMM-' + Math.random().toString(36).substr(2, 9).toUpperCase();
}

// Function to open the create community popup
function openCreateCommunityPopup() {
    document.getElementById('createCommunityPopup').style.display = 'flex';
}

// Function to close the create community popup
function closeCreateCommunityPopup() {
    document.getElementById('createCommunityPopup').style.display = 'none';
}

// Load all communities on page load
window.onload = function() {
    loadCommunities();
}
// Function to show Create Community popup
function showCreateCommunityPopup() {
    document.getElementById('createCommunityPopup').style.display = 'flex';
}

// Function to hide Create Community popup
function hideCreateCommunityPopup() {
    document.getElementById('createCommunityPopup').style.display = 'none';
}


function loadCommunities() {
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
}

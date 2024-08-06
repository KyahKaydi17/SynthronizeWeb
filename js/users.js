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
const db = firebase.firestore();
const auth = firebase.auth();
// Function to display user info
function displayUserInfo(username) {
    db.collection('users').doc(username).get().then(function(doc) {
        if (doc.exists) {
            var userInfo = doc.data();
            var userInfoContainer = document.getElementById('userInfo');

            // Access profile_photo from userMedia
            var profilePhoto = userInfo.userMedia ? userInfo.userMedia.profile_photo : '';

            userInfoContainer.innerHTML = `
                <p><strong>Username:</strong> <input type="text" id="editUsername" value="${userInfo.username}" readonly>
                <button onclick="enableEdit('username')">Edit</button> 
                <button id="saveUsername" onclick="saveUsername('${username}')" disabled>Save</button></p>
                <p><strong>Full Name:</strong> <input type="text" id="editFullName" value="${userInfo.fullName}" readonly>
                <button onclick="enableEdit('fullName')">Edit</button> 
                <button id="saveFullName" onclick="saveFullName('${username}')" disabled>Save</button></p>
                
                <p><strong>Role:</strong>
                    <select id="roleSelect" disabled onchange="detectRoleChange()">
                        <option value="Not Set" ${userInfo.userType === 'Not Set' ? 'selected' : ''}>Not Set</option>
                        <option value="System Admin" ${userInfo.userType === 'System Admin' ? 'selected' : ''}>System Admin</option>
                        <option value="Teacher" ${userInfo.userType === 'Teacher' ? 'selected' : ''}>Teacher</option>
                        <option value="Moderator" ${userInfo.userType === 'Moderator' ? 'selected' : ''}>Moderator</option>
                        <option value="Student" ${userInfo.userType === 'Student' ? 'selected' : ''}>Student</option>
                    </select>
                    <button onclick="enableEdit('role')">Edit</button> 
                    <button id="saveRole" onclick="saveRole('${username}')" disabled>Save</button>
                </p>
                ${profilePhoto ? `<img id="profilePhoto" src="${profilePhoto}" alt="Profile Photo" style="width: 100px; height: 100px; border-radius: 50%;"><br>` : '<img id="profilePhoto" style="display:none;"><br>'}
                <input type="file" id="profilePhotoUpload" accept="image/*"><br>
                <button onclick="uploadProfilePhoto('${username}')">Upload Photo</button>
                <button onclick="deleteProfilePhoto('${username}')">Delete Photo</button>
                <button class="delete" onclick="deleteUser('${username}')">Delete User</button>
            `;
        } else {
            document.getElementById('userInfo').innerHTML = '<p>No user information available.</p>';
        }
    }).catch(function(error) {
        console.error("Error getting document: ", error);
    });
}

// Function to enable editing for a specific field
function enableEdit(field) {
    if (field === 'role') {
        document.getElementById('roleSelect').disabled = false;
        document.getElementById('saveRole').disabled = false;
    } else {
        document.getElementById('edit' + capitalizeFirstLetter(field)).removeAttribute('readonly');
        document.getElementById('save' + capitalizeFirstLetter(field)).disabled = false;
    }
}

// Function to save username
function saveUsername(username) {
    var newUsername = document.getElementById('editUsername').value;
    if (newUsername !== username) {
        db.collection('users').doc(username).update({
            username: newUsername
        }).then(function() {
            alert('Username updated successfully');
            displayUserInfo(newUsername); // Refresh the displayed info
        }).catch(function(error) {
            console.error("Error updating document: ", error);
        });
    }
}

// Function to save full name
function saveFullName(username) {
    var fullName = document.getElementById('editFullName').value;
    db.collection('users').doc(username).update({
        fullName: fullName
    }).then(function() {
        alert('Full name updated successfully');
        displayUserInfo(username); // Refresh the displayed info
    }).catch(function(error) {
        console.error("Error updating document: ", error);
    });
}

function capitalizeFirstLetter(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}



// Function to save role
function saveRole(username) {
    var role = document.getElementById('roleSelect').value;
    db.collection('users').doc(username).update({
        userType:role
    }).then(function() {
        alert('Role updated successfully');
        displayUserInfo(username); // Refresh the displayed info
    }).catch(function(error) {
        console.error("Error updating document: ", error);
    });
}

// Function to format date from dd/mm/yyyy to mm/dd/yyyy
function formatDateForFirestore(dateString) {
    var parts = dateString.split('/');
    return [parts[1], parts[0], parts[2]].join('/');
}

// Function to format date from mm/dd/yyyy to dd/mm/yyyy for display
function formatDate(dateString) {
    var parts = dateString.split('/');
    return [parts[1], parts[0], parts[2]].join('/');
}

// Function to upload profile photo
function uploadProfilePhoto(username) {
    var fileInput = document.getElementById('profilePhotoUpload');
    var file = fileInput.files[0];
    if (file) {
        var storageRef = firebase.storage().ref();
        var uploadTask = storageRef.child('profile_photos/' + username + '_' + file.name).put(file);

        uploadTask.on('state_changed', function(snapshot){
            // Observe state change events such as progress, pause, and resume
        }, function(error) {
            console.error("Error uploading file: ", error);
        }, function() {
            // Handle successful uploads on complete
            uploadTask.snapshot.ref.getDownloadURL().then(function(downloadURL) {
                db.collection('users').doc(username).update({
                    'userMedia.profile_photo': downloadURL
                }).then(function() {
                    alert('Profile photo uploaded successfully');
                    displayUserInfo(username); // Refresh the displayed info
                }).catch(function(error) {
                    console.error("Error updating document: ", error);
                });
            });
        });
    } else {
        alert('No file selected');
    }
}

// Function to delete profile photo
function deleteProfilePhoto(username) {
    db.collection('users').doc(username).update({
        'userMedia.profile_photo': firebase.firestore.FieldValue.delete()
    }).then(function() {
        alert('Profile photo deleted successfully');
        displayUserInfo(username); // Refresh the displayed info
    }).catch(function(error) {
        console.error("Error updating document: ", error);
    });
}

// Function to delete user
// Function to delete user
// Function to delete user
function deleteUser(username) {

    
    if (confirm('Are you sure you want to delete this user?')) {
                var password = prompt("Please enter your password to confirm user deletion:");
                if (password) {
                    var user = auth.currentUser;
                    var credentials = firebase.auth.EmailAuthProvider.credential(user.email, password);
                    user.reauthenticateWithCredential(credentials).then(function() {
                        db.collection('users').doc(username).delete().then(function() {
                            console.log("User deleted from Firestore.");
                            alert('User deleted successfully');
                            document.getElementById('userInfo').innerHTML = '<p>Select a user to see their information.</p>';
                            loadUsers(); // Refresh the users list
                            
                            // Delete the authenticated user
                            user.delete().then(function() {
                                console.log("Authenticated user deleted.");
                            }).catch(function(error) {
                                console.error("Error deleting authenticated user: ", error);
                            });
                        }).catch(function(error) {
                            console.error("Error deleting user from Firestore: ", error);
                        });

                        
                    }).catch(function(error) {
                        console.error("Error re-authenticating user: ", error);
                        alert("Re-authentication failed: " + error.message);
                    });

                    

                
                
                } else {
                    alert("Password is required to delete user.");
                }
            }
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

// Function to show Create User popup
function showCreateUserPopup() {
    document.getElementById('createUserPopup').style.display = 'flex';
}

// Function to hide Create User popup
function hideCreateUserPopup() {
    document.getElementById('createUserPopup').style.display = 'none';
}

// Function to create a new user
function createNewUser() {
    var email = document.getElementById('newUserEmail').value;
    var password = document.getElementById('newUserPassword').value;
    var role = document.getElementById('newUserRole').value;
    var username = generateRandomUsername();
    var defaultBirthday = '01/01/2001'; // Default birthday

    firebase.auth().fetchSignInMethodsForEmail(email)
        .then(function(signInMethods) {
            if (signInMethods.length === 0) {
                // Email is not registered, create new user
                firebase.auth().createUserWithEmailAndPassword(email, password)
                .then(function(userCredential) {
                    // Send verification email
                    userCredential.user.sendEmailVerification().then(() => {
                        alert('Verification email sent to ' + email);
                    }).catch((error) => {
                        console.error('Error sending verification email: ', error);
                    });

                    // Hide the popup and clear inputs
                    hideCreateUserPopup();
                    document.getElementById('newUserEmail').value = '';
                    document.getElementById('newUserPassword').value = '';

                    // Add the user to Firestore with initial data
                    db.collection('users').doc(userCredential.user.uid).set({
                        username: username,
                        userID: userCredential.user.uid, // Use Firebase user ID
                        userType: role,
                        birthday: defaultBirthday, // Set default birthday
                        createdTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        userMedia: {
                            profile_photo: '', // Default empty
                            profile_cover_photo: '' // Default empty
                        }
                    }).then(() => {
                        alert('User created and added to Firestore');
                        loadUsers(); // Refresh the users list
                    }).catch((error) => {
                        console.error('Error adding user to Firestore: ', error);
                    });
                })
                .catch((error) => {
                    console.error('Error creating user: ', error);
                    alert('Error creating user: ' + error.message);
                });
            } else {
                alert('Email is already registered.');
            }
        })
        .catch(function(error) {
            console.error('Error fetching sign-in methods: ', error);
        });
}

// Function to generate a random username
function generateRandomUsername() {
    var randomNum = Math.floor(Math.random() * 10000); // Generate a random number
    return 'User' + randomNum; // Return a random username
}

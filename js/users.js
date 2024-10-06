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

// Display user information
const displayUserInfo = (username) => {
    db.collection('users').doc(username).get().then((doc) => {
        if (doc.exists) {
            const userInfo = doc.data();
            const userInfoContainer = document.getElementById('userInfo');
            const profilePhoto = userInfo.userMedia?.profile_photo || '';

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
                        <option value="System Admin" ${userInfo.userType === 'Web Admin' ? 'selected' : ''}>Web Admin</option>
                        <option value="Teacher" ${userInfo.userType === 'Admin' ? 'selected' : ''}>Admin</option>
                        <option value="Moderator" ${userInfo.userType === 'Moderator' ? 'selected' : ''}>Moderator</option>
                        <option value="Student" ${userInfo.userType === 'Student' ? 'selected' : ''}>Student</option>
                    </select>
                    <button onclick="enableEdit('role')">Edit</button> 
                    <button id="saveRole" onclick="saveRole('${username}')" disabled>Save</button>
                </p>
                ${profilePhoto ? `<img id="profilePhoto" src="${profilePhoto}" alt="Profile Photo" class="profile-photo"><br>` : '<img id="profilePhoto" style="display:none;"><br>'}
                <input type="file" id="profilePhotoUpload" accept="image/*"><br>
                <button onclick="deleteProfilePhoto('${username}')">Delete Photo</button>
                <button class="deactivate" onclick="deactivateUser('${username}')">Deactivate User</button>
            `;
        } else {
            document.getElementById('userInfo').innerHTML = '<p>No user information available.</p>';
        }
    }).catch((error) => {
        console.error("Error getting document: ", error);
    });
};

// Deactivate user
const deactivateUser = (username) => {
    db.collection('users').doc(username).update({
        disabled: true
    }).then(() => {
        console.log("User successfully deactivated.");
        alert("User has been deactivated.");
    }).catch((error) => {
        console.error("Error deactivating user: ", error);
    });
};

// Enable editing for a specific field
const enableEdit = (field) => {
    if (field === 'role') {
        document.getElementById('roleSelect').disabled = false;
        document.getElementById('saveRole').disabled = false;
    } else {
        document.getElementById('edit' + capitalizeFirstLetter(field)).removeAttribute('readonly');
        document.getElementById('save' + capitalizeFirstLetter(field)).disabled = false;
    }
};

// Save username
const saveUsername = (username) => {
    const newUsername = document.getElementById('editUsername').value;
    if (newUsername !== username) {
        db.collection('users').doc(username).update({
            username: newUsername
        }).then(() => {
            alert('Username updated successfully');
            displayUserInfo(newUsername);
        }).catch((error) => {
            console.error("Error updating document: ", error);
        });
    }
};

// Save full name
const saveFullName = (username) => {
    const fullName = document.getElementById('editFullName').value;
    db.collection('users').doc(username).update({
        fullName: fullName
    }).then(() => {
        alert('Full name updated successfully');
        displayUserInfo(username);
    }).catch((error) => {
        console.error("Error updating document: ", error);
    });
};

// Capitalize first letter of a string
const capitalizeFirstLetter = (string) => {
    return string.charAt(0).toUpperCase() + string.slice(1);
};

// Save role
const saveRole = (username) => {
    const role = document.getElementById('roleSelect').value;
    db.collection('users').doc(username).update({
        userType: role
    }).then(() => {
        alert('Role updated successfully');
        displayUserInfo(username);
    }).catch((error) => {
        console.error("Error updating document: ", error);
    });
};

// Format date from dd/mm/yyyy to mm/dd/yyyy
const formatDateForFirestore = (dateString) => {
    const parts = dateString.split('/');
    return [parts[1], parts[0], parts[2]].join('/');
};

// Format date from mm/dd/yyyy to dd/mm/yyyy for display
const formatDate = (dateString) => {
    const parts = dateString.split('/');
    return [parts[1], parts[0], parts[2]].join('/');
};

// Upload profile photo
const uploadProfilePhoto = (username) => {
    const fileInput = document.getElementById('profilePhotoUpload');
    const file = fileInput.files[0];
    if (file) {
        const storageRef = firebase.storage().ref();
        const uploadTask = storageRef.child('profile_photos/' + username + '_' + file.name).put(file);

        uploadTask.on('state_changed', (snapshot) => {
            // Observe state change events such as progress, pause, and resume
        }, (error) => {
            console.error("Error uploading file: ", error);
        }, () => {
            uploadTask.snapshot.ref.getDownloadURL().then((downloadURL) => {
                db.collection('users').doc(username).update({
                    'userMedia.profile_photo': downloadURL
                }).then(() => {
                    alert('Profile photo uploaded successfully');
                    displayUserInfo(username);
                }).catch((error) => {
                    console.error("Error updating document: ", error);
                });
            });
        });
    } else {
        alert('No file selected');
    }
};

// Delete profile photo
const deleteProfilePhoto = (username) => {
    db.collection('users').doc(username).update({
        'userMedia.profile_photo': firebase.firestore.FieldValue.delete()
    }).then(() => {
        alert('Profile photo deleted successfully');
        displayUserInfo(username);
    }).catch((error) => {
        console.error("Error updating document: ", error);
    });
};

// Search users
const searchUsers = () => {
    const input = document.getElementById('searchBar').value.toLowerCase();
    db.collection('users').get().then((querySnapshot) => {
        const userList = document.getElementById('list');
        userList.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const user = doc.data();
            if (user.username.toLowerCase().includes(input)) {
                userList.innerHTML += `<li onclick="displayUserInfo('${doc.id}')">${user.username}</li>`;
            }
        });
    }).catch((error) => {
        console.error("Error getting documents: ", error);
    });
};

// Load all users on page load
window.onload = () => {
    db.collection('users').get().then((querySnapshot) => {
        const userList = document.getElementById('list');
        userList.innerHTML = '';
        querySnapshot.forEach((doc) => {
            const user = doc.data();
            userList.innerHTML += `<li onclick="displayUserInfo('${doc.id}')">${user.username}</li>`;
        });
    }).catch((error) => {
        console.error("Error getting documents: ", error);
    });
};

// Show Create User popup
const showCreateUserPopup = () => {
    document.getElementById('createUserPopup').style.display = 'flex';
};

// Hide Create User popup
const hideCreateUserPopup = () => {
    document.getElementById('createUserPopup').style.display = 'none';
};

// Create a new user
const createNewUser = () => {
    const email = document.getElementById('newUserEmail').value;
    const password = document.getElementById('newUserPassword').value;
    const role = document.getElementById('newUserRole').value;
    const username = generateRandomUsername();
    const defaultBirthday = '01/01/2001';

    firebase.auth().fetchSignInMethodsForEmail(email)
        .then((signInMethods) => {
            if (signInMethods.length === 0) {
                firebase.auth().createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    userCredential.user.sendEmailVerification().then(() => {
                        alert('Verification email sent to ' + email);
                    }).catch((error) => {
                        console.error('Error sending verification email: ', error);
                    });

                    hideCreateUserPopup();
                    document.getElementById('newUserEmail').value = '';
                    document.getElementById('newUserPassword').value = '';

                    db.collection('users').doc(userCredential.user.uid).set({
                        username: username,
                        userID: userCredential.user.uid,
                        userType: role,
                        birthday: defaultBirthday,
                        createdTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
                        userMedia: {
                            profile_photo: '',
                            profile_cover_photo: ''
                        }
                    }).then(() => {
                        alert('User created and added to Firestore');
                        loadUsers();
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
        .catch((error) => {
            console.error('Error fetching sign-in methods: ', error);
        });
};

// Generate a random username
const generateRandomUsername = () => {
    const randomNum = Math.floor(Math.random() * 10000);
    return 'User' + randomNum;
};

// Populate the user list
const populateUserList = (users) => {
    const userList = document.getElementById('list');
    users.forEach((user) => {
        const listItem = document.createElement('li');
        listItem.textContent = user.name;
        listItem.addEventListener('click', () => {
            Array.from(userList.children).forEach((li) => li.classList.remove('active'));
            listItem.classList.add('active');
            displayUserInfo(user);
        });
        userList.appendChild(listItem);
    });
};
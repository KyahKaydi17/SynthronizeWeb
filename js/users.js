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

let currentUserId = null;
let currentUserRole = null;

// Modify window.onload to properly handle auth state
window.onload = async () => {
    // Wait for auth state to be ready
    firebase.auth().onAuthStateChanged(async (user) => {
        if (user) {
            const userDoc = await db.collection('users').doc(user.uid).get();
            if (userDoc.exists) {
                currentUserRole = userDoc.data()?.userType;
                console.log('Current user role:', currentUserRole); // Debug log
            }
            loadUsers();
            loadRoleChangeRequests();
        } else {
            console.log('No user logged in');
            // Handle not logged in state
        }
    });
}

// Add this function after window.onload

const deleteInactiveUsers = async (userId, userData) => {
    // Check if user has lastSeen data
    if (!userData.currentStatus?.lastSeen) return;

    const lastSeenDate = new Date(userData.currentStatus.lastSeen.seconds * 1000);
    const currentDate = new Date();
    const daysDifference = (currentDate - lastSeenDate) / (1000 * 60 * 60 * 24);

    // Check if user is disabled and inactive for 30+ days
    if (daysDifference >= 30 && userData.userAccess?.Disabled === "") {
        try {
            // Delete from Firestore
            await db.collection("users").doc(userId).delete();
            
            // Delete from Firebase Auth
            await firebase.auth().deleteUser(userId);
            
            console.log(`Deleted inactive user: ${userId}`);
        } catch (error) {
            console.error(`Error deleting user ${userId}:`, error);
        }
    }
};

// Modify loadUsers function to include inactive user check
const loadUsers = () => {
    db.collection("users").get().then(async querySnapshot => {
        const tableBody = document.getElementById('userTableBody');
        tableBody.innerHTML = '';
        let activeCount = 0;

        for (const doc of querySnapshot.docs) {
            const user = doc.data();
            
            // Check and delete inactive users
            await deleteInactiveUsers(doc.id, user);
            
            // Continue with existing user loading code...
            const row = document.createElement('tr');
            
            // Try to get the user's email from Firebase Auth
            let userEmail = 'No email found';
            try {
                const userRecord = await firebase.auth().getUser(doc.id);
                userEmail = userRecord.email;
            } catch (error) {
                console.log(`Could not fetch email for user ${doc.id}`);
            }

            const isDisabled = user.userAccess?.Disabled;
            const statusClass = isDisabled ? 'status-inactive' : 'status-active';
            const statusText = isDisabled ? 'Disabled' : 'Active';
            const userRole = user.userType || 'No Role';
            
            const actionButtons = isSuperAdmin() ? `
                <i class="fas fa-info-circle me-2" onclick="showUserDetails('${doc.id}')" 
                   style="color: var(--jira-blue)" title="View Details"></i>
                <i class="fas fa-edit" onclick="handleEditUser('${doc.id}', '${user.userType}')" 
                   style="color: var(--jira-blue)" title="Edit User"></i>
                <i class="fas fa-trash-alt" onclick="handleDeactivateUser('${doc.id}', '${user.userType}')" 
                   style="color: var(--jira-red)" title="Deactivate User"></i>
            ` : isWebAdmin() ? `
                <i class="fas fa-info-circle me-2" onclick="showUserDetails('${doc.id}')" 
                   style="color: var(--jira-blue)" title="View Details"></i>
                <i class="fas fa-ban" onclick="handleBanUser('${doc.id}', '${user.userType}')" 
                   style="color: var(--jira-yellow)" title="Ban User"></i>
                <i class="fas fa-user-check" onclick="handleUnbanUser('${doc.id}', '${user.userType}')" 
                   style="color: var(--jira-green)" title="Unban User"></i>
            ` : `
                <i class="fas fa-info-circle" onclick="showUserDetails('${doc.id}')" 
                   style="color: var(--jira-blue)" title="View Details"></i>
            `;

            row.innerHTML = `
                <td>
                    <div class="d-flex align-items-center">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&size=32" 
                             class="user-avatar" alt="${user.fullName}">
                        <div>
                            <div style="font-weight: 500; color: var(--jira-text);">${user.fullName}</div>
                            <div style="font-size: 12px; color: var(--jira-text-subtle);">${user.username}</div>
                        </div>
                    </div>
                </td>
                <td>
                    <span style="font-size: 12px; color: var(--jira-text-subtle);">${doc.id}</span>
                </td>
                <td>
                    <span style="font-size: 13px; color: var(--jira-text);">${user.email}</span>
                </td>
                <td>
                    <span class="badge bg-info">${userRole}</span>
                </td>
                <td>
                    <span class="status-badge ${statusClass}">
                        ${statusText}
                    </span>
                </td>
                <td class="action-btns">
                    ${actionButtons}
                </td>
            `;
            tableBody.appendChild(row);

            if (user.currentStatus?.lastSeen) {
                const lastSeenTime = new Date(user.currentStatus.lastSeen.seconds * 1000);
                const currentTime = new Date();
                const timeDifference = (currentTime - lastSeenTime) / 1000 / 60;
                if (timeDifference <= 5) activeCount++;
            }
        }

        document.getElementById('onlineUsers').textContent = activeCount;
    }).catch((error) => {
        console.error("Error getting users: ", error);
    });
}

const loadRoleChangeRequests = () => {
db.collection("account_type_requests").get().then(querySnapshot => {
const requestTableBody = document.getElementById('roleRequestsTableBody');
requestTableBody.innerHTML = '';

if (querySnapshot.empty) {
    requestTableBody.innerHTML = `
        <tr>
            <td colspan="4" class="text-center">No pending role change requests</td>
        </tr>
    `;
    return;
}

querySnapshot.forEach(doc => {
    const request = doc.data();
    const row = document.createElement('tr');
    row.innerHTML = `
        <td>${doc.id}</td>
        <td>${request.userId}</td>
        <td>${request.reqAccType}</td>
        <td>
            <i class="fas fa-check-circle text-success me-2" 
               onclick="approveRequest('${doc.id}', '${request.userId}', '${request.reqAccType}')"
               style="cursor: pointer;" 
               title="Approve Request"></i>
            <i class="fas fa-times-circle text-danger" 
               onclick="rejectRequest('${doc.id}')"
               style="cursor: pointer;" 
               title="Reject Request"></i>
        </td>
    `;
    requestTableBody.appendChild(row);
});
}).catch((error) => {
console.error("Error getting role change requests: ", error);
});
}

function getFixedRole(requestedRole) {
    const validRoles = ["WebAdmin", "AppAdmin", "Student", "Teacher"];
    return validRoles.includes(requestedRole) ? requestedRole : "Unknown Role";
}

function approveRequest(requestId, userId, newRole) {
    db.collection("users").doc(userId).update({
        userType: newRole
    }).then(() => {
        return db.collection("roleChangeRequests").doc(requestId).delete();
    }).then(() => {
        alert('Role change approved!');
        loadRoleChangeRequests();
    }).catch((error) => {
        console.error("Error approving request: ", error);
    });
}

function rejectRequest(requestId) {
    db.collection("roleChangeRequests").doc(requestId).delete().then(() => {
        alert('Role change request rejected!');
        loadRoleChangeRequests();
    }).catch((error) => {
        console.error("Error rejecting request: ", error);
    });
}

function searchUsers() {
    const searchInput = document.getElementById('searchBar').value.toLowerCase();
    const rows = document.querySelectorAll('#userTableBody tr');

    rows.forEach(row => {
        const fullName = row.cells[1].textContent.toLowerCase();
        row.style.display = fullName.includes(searchInput) ? '' : 'none';
    });
}

function filterUsers() {
    const selectedRole = document.getElementById('roleFilter').value.toLowerCase();
    const rows = document.querySelectorAll('#userTableBody tr');

    rows.forEach(row => {
        const role = row.cells[2].textContent.toLowerCase();
        row.style.display = (selectedRole === '' || role === selectedRole) ? '' : 'none';
    });
}

function editUser(id) {
    currentUserId = id;
    db.collection("users").doc(id).get().then(doc => {
        if (doc.exists) {
            const user = doc.data();
            document.getElementById('editFullName').value = user.fullName;
            document.getElementById('editRole').value = user.userType;
            document.getElementById('editUsername').value = user.username;
            new bootstrap.Modal(document.getElementById('editUserModal')).show();
        }
    }).catch((error) => {
        console.error("Error getting user: ", error);
    });
}

function saveUserChanges() {
    if (!isSuperAdmin()) {
        alert("Access Denied. Contact Super Admin to gain edit access.");
        return;
    }

    const fullName = document.getElementById('editFullName').value;
    const role = document.getElementById('editRole').value;
    const username = document.getElementById('editUsername').value;

    // Check if trying to modify WebAdmin
    db.collection("users").doc(currentUserId).get().then(doc => {
        if (doc.data().userType === 'WebAdmin') {
            alert("SuperAdmin cannot modify WebAdmin's user type.");
            return;
        }
        
        db.collection("users").doc(currentUserId).update({
            fullName: fullName,
            userType: role,
            username: username
        }).then(() => {
            alert('User updated successfully!');
            loadUsers();
            bootstrap.Modal.getInstance(document.getElementById('editUserModal')).hide();
            logAction('User updated', currentUserId);
        }).catch((error) => {
            console.error("Error updating user: ", error);
        });
    });
}

function deactivateUser(id) {
    // Add deactivate user functionality here
    alert(`Deactivate User: ${id}`);
    logAction('User deactivated', id); // Log action
}

function exportToExcel() {
    const table = document.getElementById('userTableBody');
    const rows = Array.from(table.rows);
    const data = rows.map(row => {
        return Array.from(row.cells).slice(0, 4).map(cell => cell.textContent);
    });

    const worksheet = XLSX.utils.aoa_to_sheet([["User ID", "Full Name", "Role", "Username"], ...data]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Users");
    XLSX.writeFile(workbook, "Users.xlsx");
}

let selectedUserId = null;

function openBanDialog(userId) {
    selectedUserId = userId;
    const modal = new bootstrap.Modal(document.getElementById('banUserModal'));
    modal.show();
}

function confirmBanUser() {
    const banUntilDate = document.getElementById('banUntilDate').value;
    if (!banUntilDate) {
        alert('Please select a date');
        return;
    }

    const date = new Date(banUntilDate);
    const formattedDate = `${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getDate().toString().padStart(2, '0')}/${date.getFullYear()}`;

    firebase.firestore().collection('users').doc(selectedUserId).update({
        userAccess: {
            Disabled: formattedDate
        }
    }).then(() => {
        bootstrap.Modal.getInstance(document.getElementById('banUserModal')).hide();
        alert('User banned successfully');
        logAction('User banned', selectedUserId); // Log action
    }).catch(error => {
        console.error('Error banning user:', error);
        alert('Error banning user');
    });
}

function unbanUser(userId) {
    firebase.firestore().collection('users').doc(userId).update({
        userAccess: {
            Disabled: ""
        }
    }).then(() => {
        alert('User unbanned successfully');
        logAction('User unbanned', userId); // Log action
    }).catch(error => {
        console.error('Error unbanning user:', error);
        alert('Error unbanning user');
    });
}

// Add this function to show the modal and load requests
function showRoleRequests() {
loadRoleChangeRequests();
new bootstrap.Modal(document.getElementById('roleRequestsModal')).show();
}

// Add to users.js
let currentDetailUserId = null;

function showUserDetails(userId) {
    currentDetailUserId = userId;
    
    db.collection("users").doc(userId).get().then(async doc => {
        if (doc.exists) {
            const user = doc.data();
            
            // Set user avatar
            document.getElementById('userDetailAvatar').src = 
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user.fullName)}&size=48`;
            
            // Set basic info
            document.getElementById('userDetailName').textContent = user.fullName;
            document.getElementById('userDetailUsername').textContent = `@${user.username}`;
            document.getElementById('userDetailId').textContent = userId;
            document.getElementById('userDetailEmail').textContent = user.email || 'No email';
            document.getElementById('userDetailRole').textContent = user.userType;
            
            // Set status
            const isDisabled = user.userAccess?.Disabled;
            document.getElementById('userDetailStatus').innerHTML = 
                `<span class="badge ${isDisabled ? 'bg-danger' : 'bg-success'}">${isDisabled ? 'Disabled' : 'Active'}</span>`;
            
            // Set timestamps
            const created = user.createdAt ? new Date(user.createdAt.seconds * 1000) : new Date();
            document.getElementById('userDetailCreated').textContent = created.toLocaleString();
            
            const lastActive = user.currentStatus?.lastSeen ? 
                new Date(user.currentStatus.lastSeen.seconds * 1000) : 'Never';
            document.getElementById('userDetailLastActive').textContent = 
                lastActive instanceof Date ? lastActive.toLocaleString() : lastActive;
            
            // Load timeline
            loadUserTimeline(userId);
            
            // Conditionally show action buttons based on role
            const actionButtonsContainer = document.querySelector('#userDetailsModal .d-grid');
            if (isSuperAdmin()) {
                actionButtonsContainer.innerHTML = `
                    <button class="btn btn-outline-primary btn-sm" onclick="handleEditUser('${userId}', '${user.userType}')">
                        <i class="fas fa-edit me-2"></i>Edit User
                    </button>
                    <button class="btn btn-outline-warning btn-sm" onclick="handleBanUser('${userId}', '${user.userType}')">
                        <i class="fas fa-ban me-2"></i>Ban User
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="handleDeactivateUser('${userId}', '${user.userType}')">
                        <i class="fas fa-trash-alt me-2"></i>Deactivate
                    </button>
                `;
            } else {
                // Hide or show read-only view for non-SuperAdmin users
                actionButtonsContainer.innerHTML = `
                    <div class="alert alert-info">
                        Only SuperAdmin users can modify user accounts
                    </div>
                `;
            }
            
            // Show modal
            new bootstrap.Modal(document.getElementById('userDetailsModal')).show();
        }
    });
}

function loadUserTimeline(userId) {
    const timeline = document.getElementById('userDetailTimeline');
    timeline.innerHTML = '';
    
    // Get user activity from various collections
    Promise.all([
        db.collection('user_activity').where('userId', '==', userId).orderBy('timestamp', 'desc').limit(10).get(),
        db.collection('roleChangeRequests').where('userId', '==', userId).orderBy('timestamp', 'desc').get()
    ]).then(([activitySnapshot, roleRequestsSnapshot]) => {
        const activities = [];
        
        activitySnapshot.forEach(doc => {
            const activity = doc.data();
            activities.push({
                type: 'activity',
                timestamp: activity.timestamp,
                description: activity.description
            });
        });
        
        roleRequestsSnapshot.forEach(doc => {
            const request = doc.data();
            activities.push({
                type: 'role_request',
                timestamp: request.timestamp,
                description: `Requested role change to ${request.reqAccType}`
            });
        });
        
        // Sort by timestamp
        activities.sort((a, b) => b.timestamp - a.timestamp);
        
        // Render timeline
        activities.forEach(activity => {
            const date = new Date(activity.timestamp.seconds * 1000);
            timeline.innerHTML += `
                <div class="timeline-item">
                    <div class="timeline-marker ${activity.type === 'role_request' ? 'bg-primary' : 'bg-secondary'}"></div>
                    <div class="timeline-content">
                        <small class="text-muted">${date.toLocaleString()}</small>
                        <p class="mb-0">${activity.description}</p>
                    </div>
                </div>
            `;
        });
    });
}

const logAction = async (action, userId) => {
    try {
        await db.collection('userLogHistory').add({
            action: action,
            userId: userId,
            timestamp: firebase.firestore.FieldValue.serverTimestamp(),
            performedBy: firebase.auth().currentUser?.uid || 'unknown'
        });
        console.log('Action logged successfully');
    } catch (error) {
        console.error('Error logging action:', error);
    }
};

function showLogHistory() {
    const logHistoryTableBody = document.getElementById('logHistoryTableBody');
    logHistoryTableBody.innerHTML = '';

    db.collection('userLogHistory')
        .orderBy('timestamp', 'desc')
        .get()
        .then(async querySnapshot => {
            for (const doc of querySnapshot.docs) {
                const log = doc.data();
                // Fetch user details for the performer
                let performerName = 'Unknown';
                if (log.performedBy && log.performedBy !== 'unknown') {
                    try {
                        const userDoc = await db.collection('users').doc(log.performedBy).get();
                        if (userDoc.exists) {
                            const userData = userDoc.data();
                            performerName = userData.fullName || userData.username || 'Unknown';
                        }
                    } catch (error) {
                        console.error('Error fetching user details:', error);
                    }
                }

                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${log.action}</td>
                    <td>${log.userId}</td>
                    <td>${performerName}</td>
                    <td>${log.timestamp?.toDate().toLocaleString() || 'N/A'}</td>
                `;
                logHistoryTableBody.appendChild(row);
            }
            new bootstrap.Modal(document.getElementById('logHistoryModal')).show();
        })
        .catch(error => {
            console.error('Error getting log history:', error);
            showNotification('Error loading log history', 'danger');
        });
}

function isSuperAdmin() {
    console.log('Checking SuperAdmin, current role:', currentUserRole);
    return currentUserRole === 'SuperAdmin';
}

function isWebAdmin() {
    return currentUserRole === 'WebAdmin';
}

function handleEditUser(userId, userType) {
    if (!isSuperAdmin()) {
        alert("Access Denied. Contact Super Admin to gain edit access.");
        return;
    }
    if (userType === 'WebAdmin') {
        alert("SuperAdmin cannot modify WebAdmin's user type.");
        return;
    }
    editUser(userId);
}

function handleBanUser(userId, userType) {
    if (!isWebAdmin() && !isSuperAdmin()) {
        alert("Access Denied. Only WebAdmin can control user access.");
        return;
    }
    if (userType === 'WebAdmin' || userType === 'SuperAdmin') {
        alert("Cannot modify access for admin users.");
        return;
    }
    openBanDialog(userId);
}

function handleUnbanUser(userId, userType) {
    if (!isWebAdmin() && !isSuperAdmin()) {
        alert("Access Denied. Only WebAdmin can control user access.");
        return;
    }
    if (userType === 'WebAdmin' || userType === 'SuperAdmin') {
        alert("Cannot modify access for admin users.");
        return;
    }
    unbanUser(userId);
}

function handleDeactivateUser(userId, userType) {
    if (!isSuperAdmin()) {
        alert("Access Denied. Contact Super Admin to gain edit access.");
        return;
    }
    if (userType === 'WebAdmin') {
        alert("SuperAdmin cannot deactivate WebAdmin users.");
        return;
    }
    deactivateUser(userId);
}
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

    let currentUserRole = null;

    firebase.auth().onAuthStateChanged(user => {
        if (user) {
            currentUserId = user.uid;
        } else {
            // Redirect to login page or handle unauthenticated state
        }
    });

    window.onload = async () => {
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                const userDoc = await db.collection('users').doc(user.uid).get();
                if (userDoc.exists) {
                    currentUserRole = userDoc.data()?.userType;
                    currentUserId = user.uid;
                }
                loadCommunities();
            }
        });
    }

    const loadCommunities = async () => {
        try {
            const querySnapshot = await db.collection("communities").get();
            const tableBody = document.getElementById('communitiesTableBody');
            tableBody.innerHTML = '';
            
            for (const doc of querySnapshot.docs) {
                const community = doc.data();
                const adminUser = await getAdminUser(community.communityMembers);
                
                const actionButtons = isSuperAdmin() ? `
                    <i class="fas fa-edit" onclick="editCommunity('${doc.id}', this)" title="Edit Community"></i>
                    <i class="fas fa-save d-none" onclick="saveCommunity('${doc.id}', this)" title="Save Changes"></i>
                    <i class="fas fa-trash-alt" onclick="deleteCommunity('${doc.id}')" title="Delete Community"></i>
                    <i class="fas fa-ban" onclick="handleBanCommunity('${doc.id}')" title="Ban Community"></i>
                ` : `
                    <i class="fas fa-info-circle" onclick="viewCommunityDetails('${doc.id}')" title="View Details"></i>
                `;

                const row = `
                    <tr class="hover-row">
                        <td>${doc.id}</td>
                        <td contenteditable="${isSuperAdmin()}" class="editable">${community.communityName || ''}</td>
                        <td>
                            <span class="badge ${community.communityType?.toLowerCase() === 'public' ? 'badge-public' : 'badge-private'}">
                                ${community.communityType || 'N/A'}
                            </span>
                        </td>
                        <td>${adminUser || 'No admin'}</td>
                        <td class="action-btns">
                            ${actionButtons}
                        </td>
                    </tr>
                `;
                tableBody.insertAdjacentHTML('beforeend', row);
            }
        } catch (error) {
            console.error("Error loading communities:", error);
            showNotification("Error loading communities", "danger");
        }
    };

    // Add this new helper function to get admin username
    async function getAdminUser(communityMembers) {
        if (!communityMembers || !Array.isArray(communityMembers)) {
            return null;
        }
        
        try {
            for (const member of communityMembers) {
                const userDoc = await db.collection('users').doc(member.userId).get();
                if (userDoc.exists && member.role === 'admin') {
                    const userData = userDoc.data();
                    return userData.username || 'Unknown';
                }
            }
            return null;
        } catch (error) {
            console.error("Error getting admin user:", error);
            return null;
        }
    }

    function handleCommunityAction(actionType, communityId) {
        if (!isSuperAdmin()) {
            showNotification("Access Denied. Only SuperAdmin can perform this action.", "danger");
            return false;
        }
        return true;
    }

    function editCommunity(id, editIcon) {
        if (!handleCommunityAction('edit', id)) return;
        const row = editIcon.closest('tr');
        const cells = row.querySelectorAll('.editable');
        cells.forEach(cell => cell.contentEditable = true);
        row.querySelector('.fa-edit').classList.add('d-none');
        row.querySelector('.fa-save').classList.remove('d-none');
    }

    function saveCommunity(id, saveIcon) {
        const row = saveIcon.closest('tr');
        const cells = row.querySelectorAll('.editable');
        
        const updatedData = {
            communityName: cells[0].textContent,
            description: cells[1].textContent,
            members: cells[2].textContent,
        };

        db.collection("communities").doc(id).update(updatedData)
            .then(() => {
                console.log("Document successfully updated!");
                showNotification("Community updated successfully!", "success");
                cells.forEach(cell => cell.contentEditable = false);
                row.querySelector('.fa-save').classList.add('d-none');
                row.querySelector('.fa-edit').classList.remove('d-none');
                logAction('Community updated', id, currentUserId); // Log action
            })
            .catch((error) => {
                console.error("Error updating document: ", error);
            });
    }

    function deleteCommunity(id) {
        if (!handleCommunityAction('delete', id)) return;
        if (confirm("Are you sure you want to delete this community?")) {
            db.collection("communities").doc(id).delete()
                .then(() => {
                    console.log("Document successfully deleted!");
                    loadCommunities();
                    showNotification("Community deleted successfully!", "success");
                    logAction('Community deleted', id, currentUserId); // Log action
                })
                .catch((error) => {
                    console.error("Error deleting document: ", error);
                });
        }
    }

    function handleBanCommunity(communityId) {
        if (!isSuperAdmin()) return;
        
        const banUntilDate = prompt("Enter ban duration (days):");
        if (!banUntilDate) return;

        const banDate = new Date();
        banDate.setDate(banDate.getDate() + parseInt(banUntilDate));

        db.collection("communities").doc(communityId).update({
            banned: true,
            banExpiry: banDate,
            bannedBy: currentUserId
        }).then(() => {
            showNotification("Community banned successfully", "success");
            loadCommunities();
            logAction('Community banned', communityId, currentUserId);
        }).catch(error => {
            console.error("Error banning community:", error);
            showNotification("Error banning community", "danger");
        });
    }

    function searchCommunities() {
        const searchInput = document.getElementById('searchBar').value.toLowerCase();
        const rows = document.querySelectorAll('#communitiesTableBody tr');
        
        rows.forEach(row => {
            const communityName = row.cells[0].textContent.toLowerCase();
            row.style.display = communityName.includes(searchInput) ? '' : 'none';
        });
    }

    function showNotification(message, type) {
        const notification = document.getElementById('notification');
        notification.classList.remove('alert-success', 'alert-danger');
        notification.classList.add(type === 'success' ? 'alert-success' : 'alert-danger');
        notification.textContent = message;
        notification.style.display = 'block';
        setTimeout(() => {
            notification.style.display = 'none';
        }, 3000);
    }

    const logAction = async (action, targetCommunityId, currentUserId) => {
        try {
            await db.collection('communityLogHistory').add({
                action: action,
                targetCommunityId: targetCommunityId,
                performedBy: currentUserId,
                timestamp: firebase.firestore.FieldValue.serverTimestamp()
            });
            console.log('Action logged successfully');
        } catch (error) {
            console.error('Error logging action:', error);
        }
    };

    function showLogHistory() {
        const logHistoryTableBody = document.getElementById('logHistoryTableBody');
        logHistoryTableBody.innerHTML = '';

        db.collection('communityLogHistory')
            .orderBy('timestamp', 'desc')
            .get()
            .then(querySnapshot => {
                querySnapshot.forEach(doc => {
                    const log = doc.data();
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${log.action}</td>
                        <td>${log.targetCommunityId}</td>
                        <td>${log.performedBy}</td>
                        <td>${log.timestamp.toDate().toLocaleString()}</td>
                    `;
                    logHistoryTableBody.appendChild(row);
                });
                new bootstrap.Modal(document.getElementById('logHistoryModal')).show();
            }).catch(error => {
                console.error('Error getting log history:', error);
                showNotification('Error loading log history', 'danger');
            });
    }

    function isSuperAdmin() {
        return currentUserRole === 'SuperAdmin';
    }

    function viewCommunityDetails(communityId) {
        db.collection("communities").doc(communityId).get().then(async doc => {
            if (doc.exists) {
                const community = doc.data();
                
                // Set community icon
                document.getElementById('communityDetailIcon').src = 
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(community.communityName)}&size=48`;
                
                // Set basic info
                document.getElementById('communityDetailName').textContent = community.communityName;
                document.getElementById('communityDetailType').textContent = community.communityType;
                document.getElementById('communityDetailId').textContent = doc.id;
                document.getElementById('communityCode').textContent = community.communityCode;
                document.getElementById('communityDetailAccess').innerHTML = 
                    `<span class="badge ${community.communityType?.toLowerCase() === 'public' ? 'badge-public' : 'badge-private'}">
                        ${community.communityType}
                    </span>`;
                document.getElementById('communityDetailStatus').innerHTML = 
                    `<span class="badge ${community.banned ? 'bg-danger' : 'bg-success'}">
                        ${community.banned ? 'Banned' : 'Active'}
                    </span>`;
                document.getElementById('communityDetailMembers').textContent = 
                    community.communityMembers.size || 0;
                document.getElementById('communityDetailDescription').textContent = 
                    community.communityDescription || 'No description available';
                
                // Set timestamps and admin
                const created = community.createdAt ? 
                    new Date(community.createdAt.seconds * 1000).toLocaleString() : 'N/A';
                document.getElementById('communityDetailCreated').textContent = created;
                
                const adminUser = await getAdminUser(community.communityMembers);
                document.getElementById('communityDetailAdmin').textContent = adminUser || 'No admin';
                
                // Set action buttons based on user role
                const actionsContainer = document.getElementById('communityDetailActions');
                if (isSuperAdmin()) {
                    actionsContainer.innerHTML = `
                        <button class="btn btn-outline-primary btn-sm" onclick="editCommunity('${doc.id}', this)">
                            <i class="fas fa-edit me-2"></i>Edit Community
                        </button>
                        <button class="btn btn-outline-warning btn-sm" onclick="handleBanCommunity('${doc.id}')">
                            <i class="fas fa-ban me-2"></i>Ban Community
                        </button>
                        <button class="btn btn-outline-danger btn-sm" onclick="deleteCommunity('${doc.id}')">
                            <i class="fas fa-trash-alt me-2"></i>Delete
                        </button>
                    `;
                }
                
                // Show modal
                new bootstrap.Modal(document.getElementById('communityDetailsModal')).show();
            }
        });
    }
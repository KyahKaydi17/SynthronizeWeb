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
// Initialize EmailJS - add after Firebase init
emailjs.init("wGSRduC5qILn1qEIX"); // Get this from EmailJS dashboard
let feedbacksData = [];
let currentFeedbackId = null;
const cardModal = new bootstrap.Modal(document.getElementById('cardDetailModal'));

// Add this to your global variables
let webAdmins = [];

// Add this function to load WebAdmins
const loadWebAdmins = async () => {
    const querySnapshot = await db.collection("users")
        .where("userType", "==", "WebAdmin")
        .get();
    
    webAdmins = [];
    querySnapshot.forEach(doc => {
        webAdmins.push({
            id: doc.id,
            ...doc.data()
        });
    });

    // Populate assignee filter
    const assigneeFilter = document.getElementById('assigneeFilter');
    assigneeFilter.innerHTML = `
        <option value="all">All</option>
        <option value="unassigned">Unassigned</option>
        ${webAdmins.map(admin => `
            <option value="${admin.id}">${admin.fullName}</option>
        `).join('')}
    `;

    // Populate other assignee dropdowns
    const createAssigneeSelect = document.getElementById('newFeedbackAssignee');
    createAssigneeSelect.innerHTML = `
        <option value="">Unassigned</option>
        ${webAdmins.map(admin => `
            <option value="${admin.id}">${admin.fullName}</option>
        `).join('')}
    `;
};

// Add filter function
const filterByAssignee = () => {
    const selectedAssigneeId = document.getElementById('assigneeFilter').value;
    
    let filteredFeedbacks;
    if (selectedAssigneeId === 'all') {
        filteredFeedbacks = [...feedbacksData];
    } else if (selectedAssigneeId === 'unassigned') {
        filteredFeedbacks = feedbacksData.filter(f => !f.assigneeId);
    } else {
        filteredFeedbacks = feedbacksData.filter(f => f.assigneeId === selectedAssigneeId);
    }

    // Update columns with filtered data
    const columns = {
        todo: filteredFeedbacks.filter(f => !f.fbReviewed && !f.underProgress),
        inProgress: filteredFeedbacks.filter(f => !f.fbReviewed && f.underProgress),
        done: filteredFeedbacks.filter(f => f.fbReviewed)
    };

    Object.entries(columns).forEach(([status, items]) => {
        const container = document.querySelector(`[data-column="${status}"] .cards-container`);
        container.innerHTML = '';
        
        items.forEach(feedback => {
            const card = createCard(feedback);
            container.appendChild(card);
        });

        const countElement = document.querySelector(`[data-column="${status}"] .task-count`);
        countElement.textContent = items.length;
    });
};

// Update window.onload
window.onload = async () => {
    await loadWebAdmins();
    loadFeedbacks();
};

const loadFeedbacks = () => {
    db.collection("feedbacks").get().then(querySnapshot => {
        feedbacksData = [];
        querySnapshot.forEach(doc => {
            feedbacksData.push({ id: doc.id, ...doc.data() });
        });
        renderBoard();
    }).catch(error => console.error("Error getting feedbacks:", error));
};

// Update renderBoard to respect current filter
const renderBoard = () => {
    // Trigger filter with current selection
    filterByAssignee();
};

// Add this helper function
const getStatusIcon = (feedback) => {
    if (feedback.fbReviewed) return '<i class="fas fa-check-circle text-success"></i>';
    if (feedback.underProgress) return '<i class="fas fa-sync-alt fa-spin text-info"></i>';
    return '<i class="fas fa-exclamation-circle text-warning"></i>';
};

// Update the createCard function with status icon
const createCard = (feedback) => {
    const div = document.createElement('div');
    div.className = 'jira-card';
    div.innerHTML = `
        <div class="card-header d-flex align-items-center gap-2">
            <div class="status-icon">
                ${getStatusIcon(feedback)}
            </div>
            <div class="card-key">FB-${feedback.id.slice(0,4)}</div>
            <div class="ms-auto">
                ${feedback.comments?.length ? 
                    `<i class="far fa-comment-dots text-muted" title="${feedback.comments.length} comments"></i>` 
                    : ''}
            </div>
        </div>
        <div class="card-title">
            ${feedback.feedbackType || 'General Feedback'}
        </div>
        <div class="card-meta">
            <div class="meta-left d-flex align-items-center gap-2">
                ${feedback.assigneeName ? `
                    <div class="assignee" title="Assigned to: ${feedback.assigneeName}">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(feedback.assigneeName)}&size=24" 
                             class="rounded-circle" 
                             alt="${feedback.assigneeName}">
                    </div>
                ` : ''}
                <span class="timestamp">
                    ${feedback.createdTimestamp ? 
                        new Date(feedback.createdTimestamp.seconds * 1000).toLocaleDateString() 
                        : 'No date'}
                </span>
            </div>
            <div class="meta-right">
                <i class="fas fa-flag priority-flag ${feedback.fbReviewed ? 'medium' : 'high'}"></i>
            </div>
        </div>
    `;

    div.addEventListener('click', () => showCardDetail(feedback));
    return div;
};

const showCardDetail = (feedback) => {
    currentFeedbackId = feedback.id;
    document.getElementById('modalCardKey').textContent = `FB-${feedback.id.slice(0,4)}`;
    document.getElementById('modalCardTitle').textContent = feedback.feedbackType || 'General Feedback';
    document.getElementById('modalMessage').textContent = feedback.feedbackMessage || 'No message provided';
    document.getElementById('modalFeedbackType').textContent = feedback.feedbackType || 'Not specified';
    document.getElementById('modalCreated').textContent = feedback.createdTimestamp ? 
        new Date(feedback.createdTimestamp.seconds * 1000).toLocaleString() : 'Unknown';
    document.getElementById('modalStatus').innerHTML = `
        <span class="status-badge ${feedback.fbReviewed ? 'status-reviewed' : 'status-pending'}">
            ${feedback.fbReviewed ? 'Reviewed' : 'Not Reviewed'}
        </span>
    `;
    
    // Add this to ensure comments are displayed
    if (!feedback.comments) {
        // Initialize comments array if it doesn't exist
        db.collection("feedbacks").doc(feedback.id).update({
            comments: []
        }).then(() => {
            renderComments(feedback.id);
        });
    } else {
        renderComments(feedback.id);
    }
    
    // Update assignee select
    const assigneeSelect = document.getElementById('assigneeSelect');
    assigneeSelect.innerHTML = `
        <option value="">Unassigned</option>
        ${webAdmins.map(admin => `
            <option value="${admin.id}" 
                ${feedback.assigneeId === admin.id ? 'selected' : ''}>
                ${admin.fullName}
            </option>
        `).join('')}
    `;
    
    cardModal.show();
};

const markReviewed = (id, reviewed) => {
    if (!id) return;
    
    db.collection("feedbacks").doc(id).update({ fbReviewed: reviewed })
    .then(() => {
        loadFeedbacks();
        cardModal.hide();
    })
    .catch(error => console.error("Error updating review status:", error));
};

const markUnderProgress = (id, underProgress) => {
    if (!id) return;
    
    db.collection("feedbacks").doc(id).update({
        underProgress,
        fbReviewed: false
    })
    .then(() => {
        loadFeedbacks();
        cardModal.hide();
    })
    .catch(error => console.error("Error updating progress status:", error));
};

const deleteFeedback = (id) => {
    if (!id) return;
    
    if (confirm('Are you sure you want to delete this feedback? This action cannot be undone.')) {
        db.collection("feedbacks").doc(id).delete()
        .then(() => {
            loadFeedbacks();
            cardModal.hide();
        })
        .catch(error => console.error("Error deleting feedback:", error));
    }
};

const exportToExcel = () => {
    const excelData = feedbacksData.map(feedback => ({
        'Feedback ID': feedback.id,
        'Type': feedback.feedbackType || 'Not specified',
        'Message': feedback.feedbackMessage || 'No message',
        'Status': feedback.fbReviewed ? 'Reviewed' : 'Not Reviewed',
        'Created Date': feedback.createdTimestamp ? 
            new Date(feedback.createdTimestamp.seconds * 1000).toLocaleString() : 'Unknown'
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Feedbacks');

    const fileName = `Feedbacks_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

const getStatusClass = (feedback) => {
    if (feedback.fbReviewed) return 'label-feature';
    if (feedback.underProgress) return 'label-progress';
    return 'label-bug';
};

const getStatusText = (feedback) => {
    if (feedback.fbReviewed) return 'Reviewed';
    if (feedback.underProgress) return 'Under Review';
    return 'Not Reviewed';
};

const addComment = () => {
    const commentText = document.getElementById('commentInput').value.trim();
    if (!commentText || !currentFeedbackId) return;
    
    // Get current authenticated user
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('You must be signed in to comment');
        return;
    }

    const comment = {
        text: commentText,
        timestamp: firebase.firestore.Timestamp.now(),
        author: user.displayName || user.email, // Use display name or email
        authorId: user.uid,
        authorEmail: user.email,
        authorPhotoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}`
    };

    const docRef = db.collection("feedbacks").doc(currentFeedbackId);

    db.runTransaction((transaction) => {
        return transaction.get(docRef).then((doc) => {
            if (!doc.exists) throw "Document does not exist!";
            
            const comments = doc.data().comments || [];
            comments.push(comment);
            transaction.update(docRef, { comments: comments });
        });
    }).then(() => {
        document.getElementById('commentInput').value = '';
        
        // Refresh the comments display
        db.collection("feedbacks").doc(currentFeedbackId).get().then((doc) => {
            const index = feedbacksData.findIndex(f => f.id === currentFeedbackId);
            if (index !== -1) {
                feedbacksData[index] = { id: doc.id, ...doc.data() };
            }
            renderComments(currentFeedbackId);
        });
    }).catch((error) => {
        console.error("Error adding comment:", error);
    });
};

// Update renderComments to use author photo URL
const renderComments = (feedbackId) => {
    const container = document.getElementById('commentsContainer');
    container.innerHTML = '';

    const feedback = feedbacksData.find(f => f.id === feedbackId);
    if (!feedback?.comments) return;

    const sortedComments = [...feedback.comments].sort((a, b) => 
        b.timestamp.seconds - a.timestamp.seconds
    );

    sortedComments.forEach(comment => {
        const commentEl = document.createElement('div');
        commentEl.className = 'comment-item';
        commentEl.innerHTML = `
            <div class="comment-header">
                <img src="${comment.authorPhotoURL}" 
                     class="activity-avatar"
                     alt="${comment.author}">
                <span class="activity-author">${comment.author}</span>
                <span class="activity-time">
                    ${comment.timestamp ? new Date(comment.timestamp.seconds * 1000).toLocaleString() : 'Just now'}
                </span>
            </div>
            <div class="comment-content">${comment.text}</div>
        `;
        container.appendChild(commentEl);
    });
};

// Add updateAssignee function
const updateAssignee = async () => {
const assigneeId = document.getElementById('assigneeSelect').value;

if (!currentFeedbackId) return;

try {
// Get assignee details
const assignee = webAdmins.find(a => a.id === assigneeId);

// Update Firestore
await db.collection("feedbacks").doc(currentFeedbackId).update({
    assigneeId: assigneeId,
    assigneeName: assignee ? assignee.fullName : null,
    assignedAt: firebase.firestore.FieldValue.serverTimestamp()
});

// Send email notification
if (assignee) {
    await emailjs.send(
        "service_v6zcjb6", // From EmailJS dashboard
        "template_i3g2pqk", // From EmailJS dashboard
        {
            to_name: assignee.fullName,
            to_email: assignee.email,
            feedback_id: `FB-${currentFeedbackId.slice(0,4)}`,
            feedback_type: document.getElementById('modalFeedbackType').textContent,
            feedback_message: document.getElementById('modalMessage').textContent,
            app_url: window.location.origin + '/feedbacks.html'
        }
    );
}

loadFeedbacks();

} catch (error) {
console.error("Error:", error);
alert("Error updating assignee");
}
};

// Add this after your existing JavaScript code
const createNewFeedback = async () => {
const feedbackType = document.getElementById('newFeedbackType').value;
const feedbackMessage = document.getElementById('newFeedbackMessage').value;
const priority = document.getElementById('newFeedbackPriority').value;
const assigneeId = document.getElementById('newFeedbackAssignee').value;

if (!feedbackMessage.trim()) {
alert('Please enter a feedback message');
return;
}

try {
const assignee = webAdmins.find(a => a.id === assigneeId);

const newFeedback = {
    feedbackType,
    feedbackMessage,
    priority,
    assigneeId: assigneeId || null,
    assigneeName: assignee ? assignee.fullName : null,
    createdTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
    fbReviewed: false,
    underProgress: false,
    comments: []
};

await db.collection("feedbacks").add(newFeedback);

// Close modal and refresh board
const modal = bootstrap.Modal.getInstance(document.getElementById('createFeedbackModal'));
modal.hide();
loadFeedbacks();

// Clear form
document.getElementById('newFeedbackMessage').value = '';

// Send email notification if assigned
if (assignee) {
    await emailjs.send(
        "service_v6zcjb6",
        "template_i3g2pqk",
        {
            to_name: assignee.fullName,
            to_email: assignee.email,
            feedback_type: feedbackType,
            feedback_message: feedbackMessage,
            app_url: window.location.origin + '/feedbacks.html'
        }
    );
}

} catch (error) {
console.error("Error creating feedback:", error);
alert("Error creating feedback");
}
};
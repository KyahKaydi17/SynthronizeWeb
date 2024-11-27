// Initialize Firebase and EmailJS
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
emailjs.init("wGSRduC5qILn1qEIX");

// Global variables
let reportsData = [];
let currentReportId = null;
let webAdmins = [];
const cardModal = new bootstrap.Modal(document.getElementById('cardDetailModal'));

// Load web admins
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

    // Update filter dropdown
    const assigneeFilter = document.getElementById('assigneeFilter');
    assigneeFilter.innerHTML = `
        <option value="all">All</option>
        <option value="unassigned">Unassigned</option>
        ${webAdmins.map(admin => `
            <option value="${admin.id}">${admin.fullName}</option>
        `).join('')}
    `;

    // Update create form dropdown
    const createAssigneeSelect = document.getElementById('newReportAssignee');
    createAssigneeSelect.innerHTML = `
        <option value="">Unassigned</option>
        ${webAdmins.map(admin => `
            <option value="${admin.id}">${admin.fullName}</option>
        `).join('')}
    `;
};

// Initialize on load
window.onload = async () => {
    await loadWebAdmins();
    loadReports();
};

// Load and filter reports
const loadReports = () => {
    db.collection("reports").get().then(querySnapshot => {
        reportsData = [];
        querySnapshot.forEach(doc => {
            reportsData.push({ id: doc.id, ...doc.data() });
        });
        filterByAssignee();
    }).catch(error => console.error("Error getting reports:", error));
};

const filterByAssignee = () => {
    const selectedAssigneeId = document.getElementById('assigneeFilter').value;
    
    let filteredReports;
    if (selectedAssigneeId === 'all') {
        filteredReports = [...reportsData];
    } else if (selectedAssigneeId === 'unassigned') {
        filteredReports = reportsData.filter(r => !r.assigneeId);
    } else {
        filteredReports = reportsData.filter(r => r.assigneeId === selectedAssigneeId);
    }

    const columns = {
        todo: filteredReports.filter(r => !r.reviewed && !r.underReview),
        inProgress: filteredReports.filter(r => !r.reviewed && r.underReview),
        done: filteredReports.filter(r => r.reviewed)
    };

    Object.entries(columns).forEach(([status, items]) => {
        const container = document.querySelector(`[data-column="${status}"] .cards-container`);
        container.innerHTML = '';
        
        items.forEach(report => {
            const card = createCard(report);
            container.appendChild(card);
        });

        const countElement = document.querySelector(`[data-column="${status}"] .task-count`);
        countElement.textContent = items.length;
    });
};

// Card creation and display
const getStatusIcon = (report) => {
    if (report.reviewed) return '<i class="fas fa-check-circle text-success"></i>';
    if (report.underReview) return '<i class="fas fa-sync-alt fa-spin text-info"></i>';
    return '<i class="fas fa-exclamation-circle text-warning"></i>';
};

const getPriorityClass = (priority) => {
    switch(priority) {
        case 'high': return 'text-danger';
        case 'medium': return 'text-warning';
        case 'low': return 'text-success';
        default: return 'text-warning';
    }
};

const createCard = (report) => {
    const div = document.createElement('div');
    div.className = 'jira-card';
    div.innerHTML = `
        <div class="card-header d-flex align-items-center gap-2">
            <div class="status-icon">
                ${getStatusIcon(report)}
            </div>
            <div class="card-key">RPT-${report.id.slice(0,4)}</div>
            <div class="priority-icon ms-2" title="Priority: ${report.priority || 'medium'}">
                <i class="fas fa-flag ${getPriorityClass(report.priority)}"></i>
            </div>
            <div class="ms-auto">
                ${report.comments?.length ? 
                    `<i class="far fa-comment-dots text-muted" title="${report.comments.length} comments"></i>` 
                    : ''}
            </div>
        </div>
        <div class="card-title">
            ${report.reportType || 'General Report'}
        </div>
        <div class="card-meta">
            <div class="meta-left d-flex align-items-center gap-2">
                ${report.assigneeName ? `
                    <div class="assignee" title="Assigned to: ${report.assigneeName}">
                        <img src="https://ui-avatars.com/api/?name=${encodeURIComponent(report.assigneeName)}&size=24" 
                             class="rounded-circle" 
                             alt="${report.assigneeName}">
                    </div>
                ` : ''}
                <span class="timestamp">
                    ${report.createdTimestamp ? 
                        new Date(report.createdTimestamp.seconds * 1000).toLocaleDateString() 
                        : 'No date'}
                </span>
            </div>
        </div>
    `;

    div.addEventListener('click', () => showCardDetail(report));
    return div;
};

// Report actions
const markReviewed = async (id, reviewed) => {
    if (!id) return;
    
    try {
        await db.collection("reports").doc(id).update({ 
            reviewed,
            underReview: false
        });
        loadReports();
        cardModal.hide();
    } catch (error) {
        console.error("Error updating review status:", error);
    }
};

const markUnderReview = async (id) => {
    if (!id) return;
    
    try {
        await db.collection("reports").doc(id).update({
            reviewed: false,
            underReview: true
        });
        loadReports();
        cardModal.hide();
    } catch (error) {
        console.error("Error updating review status:", error);
    }
};

const deleteReport = async (id) => {
    if (!id || !confirm('Are you sure you want to delete this report? This action cannot be undone.')) return;
    
    try {
        await db.collection("reports").doc(id).delete();
        loadReports();
        cardModal.hide();
    } catch (error) {
        console.error("Error deleting report:", error);
    }
};

// Comment system
const addComment = async () => {
    const commentText = document.getElementById('commentInput').value.trim();
    if (!commentText || !currentReportId) return;
    
    const user = firebase.auth().currentUser;
    if (!user) {
        alert('You must be signed in to comment');
        return;
    }

    const comment = {
        text: commentText,
        timestamp: firebase.firestore.FieldValue.serverTimestamp(),
        author: user.displayName || user.email,
        authorId: user.uid,
        authorEmail: user.email,
        authorPhotoURL: user.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.email)}`
    };

    try {
        await db.collection("reports").doc(currentReportId).update({
            comments: firebase.firestore.FieldValue.arrayUnion(comment)
        });
        document.getElementById('commentInput').value = '';
        loadReports();
        renderComments(currentReportId);
    } catch (error) {
        console.error("Error adding comment:", error);
    }
};

// Handle form submission
document.getElementById('createReportForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const assigneeSelect = document.getElementById('newReportAssignee');
    const assigneeId = assigneeSelect.value;
    const assigneeName = assigneeSelect.options[assigneeSelect.selectedIndex].text;
    
    const newReport = {
        reportType: document.getElementById('newReportType').value,
        reason: document.getElementById('newReportDescription').value,
        priority: document.getElementById('newReportPriority').value,
        assigneeId: assigneeId,
        assigneeName: assigneeId ? assigneeName : null,
        createdTimestamp: firebase.firestore.FieldValue.serverTimestamp(),
        reviewed: false,
        underReview: false,
        comments: []
    };

    try {
        const docRef = await db.collection("reports").add(newReport);
        
        if (assigneeId) {
            const assignee = webAdmins.find(a => a.id === assigneeId);
            if (assignee) {
                await emailjs.send(
                    "service_v6zcjb6",
                    "template_i3g2pqk",
                    {
                        to_name: assignee.fullName,
                        to_email: assignee.email,
                        report_id: `RPT-${docRef.id.slice(0,4)}`,
                        report_type: newReport.reportType,
                        description: newReport.reason,
                        app_url: window.location.origin + '/reports.html'
                    }
                );
            }
        }

        const modal = bootstrap.Modal.getInstance(document.getElementById('createReportModal'));
        modal.hide();
        this.reset();
        loadReports();
    } catch (error) {
        console.error("Error creating report:", error);
        alert("Error creating report");
    }
});

// Export functionality
const exportToExcel = () => {
    const excelData = reportsData.map(report => ({
        'Report ID': `RPT-${report.id.slice(0,4)}`,
        'Type': report.reportType || 'Not specified',
        'Description': report.reason || 'No description',
        'Priority': report.priority || 'medium',
        'Status': report.reviewed ? 'Reviewed' : (report.underReview ? 'Under Review' : 'Not Reviewed'),
        'Assignee': report.assigneeName || 'Unassigned',
        'Created Date': report.createdTimestamp ? new Date(report.createdTimestamp.seconds * 1000).toLocaleString() : 'Unknown'
    }));

    const ws = XLSX.utils.json_to_sheet(excelData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Reports');
    const fileName = `Reports_Export_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(wb, fileName);
};

// Populate assignees when create modal opens
document.getElementById('createReportModal').addEventListener('show.bs.modal', function () {
    loadWebAdmins();
});

// Add these functions to reports.js

const showCardDetail = (report) => {
    currentReportId = report.id;
    
    // Update modal content
    document.getElementById('modalCardKey').textContent = `RPT-${report.id.slice(0,4)}`;
    document.getElementById('modalCardTitle').textContent = report.reportType || 'General Report';
    document.getElementById('modalReason').textContent = report.reason || 'No description provided';
    document.getElementById('modalReportType').textContent = report.reportType || 'Not specified';
    document.getElementById('modalReportedId').textContent = `RPT-${report.id.slice(0,4)}`;
    document.getElementById('modalTimestamp').textContent = report.createdTimestamp ? 
        new Date(report.createdTimestamp.seconds * 1000).toLocaleString() : 'Unknown';
    document.getElementById('modalStatus').innerHTML = `
        <span class="status-badge ${report.reviewed ? 'status-reviewed' : 'status-pending'}">
            ${report.reviewed ? 'Reviewed' : (report.underReview ? 'Under Review' : 'Not Reviewed')}
        </span>
    `;

    // Update priority select
    const prioritySelect = document.getElementById('modalPriority');
    prioritySelect.value = report.priority || 'medium';

    // Update assignee select
    const assigneeSelect = document.getElementById('modalAssignee');
    assigneeSelect.innerHTML = `
        <option value="">Unassigned</option>
        ${webAdmins.map(admin => `
            <option value="${admin.id}" 
                ${report.assigneeId === admin.id ? 'selected' : ''}>
                ${admin.fullName}
            </option>
        `).join('')}
    `;

    // Render comments if they exist
    if (!report.comments) {
        // Initialize comments array if it doesn't exist
        db.collection("reports").doc(report.id).update({
            comments: []
        }).then(() => {
            renderComments(report.id);
        });
    } else {
        renderComments(report.id);
    }

    cardModal.show();
};

const renderComments = (reportId) => {
    const container = document.getElementById('commentsContainer');
    container.innerHTML = '';

    const report = reportsData.find(r => r.id === reportId);
    if (!report?.comments) return;

    const sortedComments = [...report.comments].sort((a, b) => 
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

// Also add updatePriority function that was missing
const updatePriority = async () => {
    if (!currentReportId) return;
    
    const priority = document.getElementById('modalPriority').value;
    
    try {
        await db.collection("reports").doc(currentReportId).update({
            priority: priority
        });
        loadReports();
    } catch (error) {
        console.error("Error updating priority:", error);
        alert("Error updating priority");
    }
};

// Add updateAssignee function
const updateAssignee = async () => {
    if (!currentReportId) return;

    const assigneeId = document.getElementById('modalAssignee').value;
    try {
        const assignee = webAdmins.find(a => a.id === assigneeId);
        
        await db.collection("reports").doc(currentReportId).update({
            assigneeId: assigneeId,
            assigneeName: assignee ? assignee.fullName : null,
            assignedAt: firebase.firestore.FieldValue.serverTimestamp()
        });

        if (assignee) {
            await emailjs.send(
                "service_v6zcjb6",
                "template_i3g2pqk",
                {
                    to_name: assignee.fullName,
                    to_email: assignee.email,
                    report_id: `RPT-${currentReportId.slice(0,4)}`,
                    report_type: document.getElementById('modalReportType').textContent,
                    description: document.getElementById('modalReason').textContent,
                    app_url: window.location.origin + '/reports.html'
                }
            );
        }

        loadReports();
    } catch (error) {
        console.error("Error updating assignee:", error);
        alert("Error updating assignee");
    }
};
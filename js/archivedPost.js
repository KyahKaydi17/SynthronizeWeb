
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

window.onload = () => {
    loadArchiveDocuments();
};

// Load archive documents into dropdown
const loadArchiveDocuments = () => {
    const archiveSelect = document.getElementById('archiveSelect');
    archiveSelect.innerHTML = '<option value="">Select Archive Document</option>';
    
    db.collection("archive").get().then(querySnapshot => {
        querySnapshot.forEach(doc => {
            const option = document.createElement('option');
            option.value = doc.id;
            option.textContent = doc.id;
            archiveSelect.appendChild(option);
        });
    }).catch(error => {
        console.error("Error loading archives:", error);
    });
};

// Load content based on selections
const loadContent = () => {
const archiveId = document.getElementById('archiveSelect').value;
const collectionType = document.getElementById('collectionSelect').value;
const contentTableBody = document.getElementById('contentTableBody');

if (!archiveId || !collectionType) {
contentTableBody.innerHTML = '<tr><td colspan="4">Please select both archive and collection type</td></tr>';
return;
}

contentTableBody.innerHTML = '';

// Reference to the document without retrieving its data
const documentRef = db.collection("archive").doc(archiveId);

// Check if the document has the target subcollection
documentRef.collection(collectionType).get()
.then(querySnapshot => {
    if (querySnapshot.empty) {
        contentTableBody.innerHTML = '<tr><td colspan="4">No documents found</td></tr>';
        return;
    }

    querySnapshot.forEach(doc => {
        const data = doc.data();
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${doc.id}</td>
            <td>${data.originalOwnerId || 'N/A'}</td>
            <td>${data.archiveDate?.toDate().toLocaleString() || 'N/A'}</td>
            <td><button class="btn-retrieve" onclick="retrieveDetails('${doc.id}', '${archiveId}', '${collectionType}')">Retrieve</button></td>
        `;
        contentTableBody.appendChild(row);
    });
}).catch(error => {
    console.error("Error loading archives:", error);
});
};

// Add mapping for collection types
const getDestinationCollection = (sourceCollection) => {
const mapping = {
'archived_posts': 'feeds',
'archived_forums': 'forums',
'archived_events': 'events'
};
return mapping[sourceCollection] || 'posts';
};

// Update retrieveDetails function with retrieve button
const retrieveDetails = (docId, archiveId, collectionType) => {
const documentRef = db.collection("archive").doc(archiveId).collection(collectionType).doc(docId);
documentRef.get().then(async doc => {
if (doc.exists) {
    const data = doc.data();
    let imageUrl = '';
    
    // Get image from Storage if contentList exists
    if (data.contentList && data.contentList.length > 0) {
        try {
            const imageRef = firebase.storage().ref().child(data.contentList[0]);
            imageUrl = await imageRef.getDownloadURL();
        } catch (error) {
            console.error("Error fetching image:", error);
        }
    }

    const dialog = document.createElement('div');
    dialog.classList.add('dialog');
    dialog.innerHTML = `
<div class="dialog-content">
<button class="close-button" onclick="this.parentElement.parentElement.remove()">
    <i class="fas fa-times"></i>
</button>

<div class="jira-issue-header">
    <div class="jira-issue-type">
        <i class="fas fa-archive"></i> Archived Post
    </div>
    <h2 class="jira-issue-title">Post Details</h2>
</div>

<div class="jira-metadata">
    <div class="metadata-item">
        <span class="metadata-label">Owner</span>
        <span class="metadata-value">${data.ownerId || 'Unknown User'}</span>
    </div>
    <div class="metadata-item">
        <span class="metadata-label">Created</span>
        <span class="metadata-value">${data.createdTimestamp?.toDate().toLocaleString() || 'N/A'}</span>
    </div>
    <div class="metadata-item">
        <span class="metadata-label">Community</span>
        <span class="metadata-value">${data.communityId || 'N/A'}</span>
    </div>
    <div class="metadata-item">
        <span class="metadata-label">Archive ID</span>
        <span class="metadata-value">${archiveId}</span>
    </div>
</div>

<div class="jira-content">
    <div class="jira-section">
        <h3 class="jira-section-title">Content</h3>
        <div class="post-caption">${data.caption || 'No Caption'}</div>
        ${imageUrl ? `
            <div class="jira-image-container">
                <img src="${imageUrl}" alt="Post content" style="max-width: 100%; height: auto;"/>
            </div>
        ` : ''}
    </div>

    <button class="btn-retrieve" onclick="restoreDocument('${docId}', '${archiveId}', '${collectionType}', '${data.communityId}')">
        <i class="fas fa-undo"></i> Restore to Community
    </button>
</div>
</div>
`;
    document.body.appendChild(dialog);
}
}).catch(error => {
console.error("Error retrieving document:", error);
});
};

// Function to restore document to original collection
const restoreDocument = async (docId, archiveId, sourceCollection, communityId) => {
try {
// Get source document
const sourceDoc = await db.collection("archive")
    .doc(archiveId)
    .collection(sourceCollection)
    .doc(docId)
    .get();

if (!sourceDoc.exists) {
    throw new Error('Source document not found');
}

const data = sourceDoc.data();
const destinationCollection = getDestinationCollection(sourceCollection);

// Prepare data for restoration
const restoreData = {
    caption: data.caption,
    createdTimestamp: data.createdTimestamp,
    ownerId: data.ownerId,
    postId: docId,
    communityId: data.communityId,
    contentList: data.contentList || [],
    loveList: data.loveList || [],
    sendPostList: data.sendPostList || []
};

// Write to destination
await db.collection("communities")
    .doc(communityId)
    .collection(destinationCollection)
    .doc(docId)
    .set(restoreData);

// Show success message
showNotification('Document restored successfully!', 'success');

// Optional: Delete from archive
// await sourceDoc.ref.delete();

} catch (error) {
console.error("Error restoring document:", error);
showNotification('Error restoring document', 'error');
}
};

// Helper function for notifications
const showNotification = (message, type) => {
const notification = document.createElement('div');
notification.className = `notification ${type}`;
notification.textContent = message;
document.body.appendChild(notification);
setTimeout(() => notification.remove(), 3000);
};

// View archive item details
const viewArchiveItem = (itemId, data) => {
    document.getElementById('postOwnerId').textContent = data.originalOwnerId || 'N/A';
    document.getElementById('postTimestamp').textContent = data.archiveDate?.toDate().toLocaleString() || 'N/A';
    document.getElementById('postCaption').textContent = data.content || 'No content available';

    const postModal = new bootstrap.Modal(document.getElementById('postModal'));
    postModal.show();
};
// WebSocket connection
let ws;
let reconnectInterval;

// DOM elements
const dropZone = document.getElementById('dropZone');
const fileInput = document.getElementById('fileInput');
const browseBtn = document.getElementById('browseBtn');
const uploadProgress = document.getElementById('uploadProgress');
const uploadFileName = document.getElementById('uploadFileName');
const uploadPercent = document.getElementById('uploadPercent');
const progressFill = document.getElementById('progressFill');
const filesList = document.getElementById('filesList');
const refreshBtn = document.getElementById('refreshBtn');
const connectionStatus = document.getElementById('connection-status');

// Initialize WebSocket connection
function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${window.location.host}`);

    ws.onopen = () => {
        console.log('WebSocket connected');
        updateConnectionStatus(true);
        clearInterval(reconnectInterval);
    };

    ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        handleWebSocketMessage(data);
    };

    ws.onclose = () => {
        console.log('WebSocket disconnected');
        updateConnectionStatus(false);
        // Attempt to reconnect
        reconnectInterval = setInterval(() => {
            console.log('Attempting to reconnect...');
            connectWebSocket();
        }, 5000);
    };

    ws.onerror = (error) => {
        console.error('WebSocket error:', error);
    };
}

function updateConnectionStatus(connected) {
    if (connected) {
        connectionStatus.classList.add('connected');
        connectionStatus.classList.remove('disconnected');
        connectionStatus.querySelector('.status-text').textContent = 'Connected';
    } else {
        connectionStatus.classList.remove('connected');
        connectionStatus.classList.add('disconnected');
        connectionStatus.querySelector('.status-text').textContent = 'Disconnected';
    }
}

function handleWebSocketMessage(data) {
    switch (data.type) {
        case 'file-list':
            renderFilesList(data.files);
            break;
        case 'new-file':
            addFileToList(data.file);
            break;
        case 'file-deleted':
            removeFileFromList(data.filename);
            break;
    }
}

// File upload handlers
browseBtn.addEventListener('click', () => {
    fileInput.click();
});

dropZone.addEventListener('click', (e) => {
    if (e.target === dropZone || e.target.closest('.upload-area')) {
        fileInput.click();
    }
});

fileInput.addEventListener('change', (e) => {
    handleFiles(e.target.files);
});

// Drag and drop handlers
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    handleFiles(e.dataTransfer.files);
});

// Handle file upload
async function handleFiles(files) {
    if (files.length === 0) return;

    for (const file of files) {
        await uploadFile(file);
    }
}

async function uploadFile(file) {
    const formData = new FormData();
    formData.append('file', file);

    uploadProgress.style.display = 'block';
    uploadFileName.textContent = file.name;

    try {
        const xhr = new XMLHttpRequest();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                uploadPercent.textContent = `${percent}%`;
                progressFill.style.width = `${percent}%`;
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                const response = JSON.parse(xhr.responseText);
                console.log('File uploaded successfully:', response);
                uploadProgress.style.display = 'none';
                fileInput.value = '';
                showNotification('File uploaded successfully!', 'success');
            } else {
                throw new Error('Upload failed');
            }
        });

        xhr.addEventListener('error', () => {
            console.error('Upload error');
            uploadProgress.style.display = 'none';
            showNotification('Upload failed. Please try again.', 'error');
        });

        xhr.open('POST', '/upload');
        xhr.send(formData);

    } catch (error) {
        console.error('Error uploading file:', error);
        uploadProgress.style.display = 'none';
        showNotification('Upload failed. Please try again.', 'error');
    }
}

// File list management
async function loadFiles() {
    try {
        const response = await fetch('/files');
        const files = await response.json();
        renderFilesList(files);
    } catch (error) {
        console.error('Error loading files:', error);
    }
}

function renderFilesList(files) {
    if (files.length === 0) {
        filesList.innerHTML = '<div class="empty-state"><p>No files shared yet</p></div>';
        return;
    }

    filesList.innerHTML = files.map(file => createFileItem(file)).join('');
}

function createFileItem(file) {
    const size = formatFileSize(file.size);
    const date = new Date(file.uploadedAt).toLocaleString();

    return `
        <div class="file-item" data-filename="${file.path}">
            <div class="file-info">
                <div class="file-name">${escapeHtml(file.filename)}</div>
                <div class="file-meta">${size} • ${date}</div>
            </div>
            <div class="file-actions">
                <button class="btn btn-primary" onclick="downloadFile('${file.path}', '${escapeHtml(file.filename)}')">
                    Download
                </button>
                <button class="btn btn-danger" onclick="deleteFile('${file.path}')">
                    Delete
                </button>
            </div>
        </div>
    `;
}

function addFileToList(file) {
    const emptyState = filesList.querySelector('.empty-state');
    if (emptyState) {
        filesList.innerHTML = '';
    }

    const fileItem = createFileItem(file);
    filesList.insertAdjacentHTML('afterbegin', fileItem);
}

function removeFileFromList(filename) {
    const fileItem = filesList.querySelector(`[data-filename="${filename}"]`);
    if (fileItem) {
        fileItem.remove();
    }

    if (filesList.children.length === 0) {
        filesList.innerHTML = '<div class="empty-state"><p>No files shared yet</p></div>';
    }
}

// File actions
async function downloadFile(filename, originalName) {
    try {
        const response = await fetch(`/download/${filename}`);
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = originalName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        showNotification('Download started!', 'success');
    } catch (error) {
        console.error('Error downloading file:', error);
        showNotification('Download failed. Please try again.', 'error');
    }
}

async function deleteFile(filename) {
    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }

    try {
        const response = await fetch(`/files/${filename}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            showNotification('File deleted successfully!', 'success');
        } else {
            throw new Error('Delete failed');
        }
    } catch (error) {
        console.error('Error deleting file:', error);
        showNotification('Delete failed. Please try again.', 'error');
    }
}

// Utility functions
function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showNotification(message, type = 'info') {
    // Simple console notification for now
    // You can enhance this with a proper notification UI
    console.log(`[${type}] ${message}`);
}

// Refresh button
refreshBtn.addEventListener('click', loadFiles);

// Initialize
connectWebSocket();
loadFiles();

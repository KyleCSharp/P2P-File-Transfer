const express = require('express');
const multer = require('multer');
const WebSocket = require('ws');
const path = require('path');
const fs = require('fs');
const http = require('http');
const os = require('os');

const app = express();
const PORT = process.env.PORT || 3000;

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage
  // No file size limit - unlimited uploads
});

// Serve static files
app.use(express.static('public'));
app.use(express.json());

// Get Tailscale IP if available
function getTailscaleIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    if (name.includes('tailscale') || name.includes('utun')) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          return iface.address;
        }
      }
    }
  }
  return null;
}

// File upload endpoint
app.post('/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file uploaded' });
  }

  const fileInfo = {
    id: path.basename(req.file.filename, path.extname(req.file.filename)),
    filename: req.file.originalname,
    size: req.file.size,
    uploadedAt: new Date().toISOString(),
    path: req.file.filename
  };

  // Broadcast new file to all connected clients
  broadcastToClients({
    type: 'new-file',
    file: fileInfo
  });

  res.json(fileInfo);
});

// List files endpoint
app.get('/files', (req, res) => {
  fs.readdir(uploadsDir, (err, files) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to read files' });
    }

    const fileList = files.map(filename => {
      const filePath = path.join(uploadsDir, filename);
      const stats = fs.statSync(filePath);
      return {
        filename: filename.split('-').slice(2).join('-') || filename,
        size: stats.size,
        uploadedAt: stats.mtime.toISOString(),
        path: filename
      };
    });

    res.json(fileList);
  });
});

// Download file endpoint
app.get('/download/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  const originalName = filename.split('-').slice(2).join('-') || filename;
  res.download(filePath, originalName);
});

// Delete file endpoint
app.delete('/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(uploadsDir, filename);

  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  fs.unlink(filePath, (err) => {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete file' });
    }

    broadcastToClients({
      type: 'file-deleted',
      filename: filename
    });

    res.json({ message: 'File deleted successfully' });
  });
});

// Create HTTP server
const server = http.createServer(app);

// WebSocket server for real-time updates
const wss = new WebSocket.Server({ server });
const clients = new Set();

wss.on('connection', (ws) => {
  clients.add(ws);
  console.log('New client connected. Total clients:', clients.size);

  // Send current file list to new client
  fs.readdir(uploadsDir, (err, files) => {
    if (!err) {
      const fileList = files.map(filename => {
        const filePath = path.join(uploadsDir, filename);
        const stats = fs.statSync(filePath);
        return {
          filename: filename.split('-').slice(2).join('-') || filename,
          size: stats.size,
          uploadedAt: stats.mtime.toISOString(),
          path: filename
        };
      });

      ws.send(JSON.stringify({
        type: 'file-list',
        files: fileList
      }));
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log('Client disconnected. Total clients:', clients.size);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clients.delete(ws);
  });
});

function broadcastToClients(message) {
  const data = JSON.stringify(message);
  clients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(data);
    }
  });
}

// Start server
server.listen(PORT, '0.0.0.0', () => {
  const tailscaleIP = getTailscaleIP();
  console.log('\n========================================');
  console.log('P2P File Transfer Server Running');
  console.log('========================================');
  console.log(`Local: http://localhost:${PORT}`);
  if (tailscaleIP) {
    console.log(`Tailscale: http://${tailscaleIP}:${PORT}`);
  } else {
    console.log('Tailscale IP not detected');
  }
  console.log('========================================\n');
});

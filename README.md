# P2P File Transfer

A simple, secure peer-to-peer file transfer application using Tailscale for private networking.

## Features

- **Drag & Drop Upload**: Easy file uploads with drag-and-drop interface
- **Real-time Updates**: WebSocket-based live file list updates
- **Secure Networking**: Leverages Tailscale for encrypted P2P connections
- **Unlimited File Size**: Upload files of any size (no file size limit)
- **Cross-Platform**: Works on any device with a web browser
- **No External Dependencies**: Runs entirely on your private Tailscale network

## Prerequisites

### For Docker Deployment (Recommended)
- Docker and Docker Compose
- Tailscale installed and configured on the host

### For Manual Installation
- Node.js (v14 or higher)
- npm (comes with Node.js)
- Tailscale installed and configured

## Tailscale Setup

### 1. Install Tailscale

**Linux:**
```bash
curl -fsSL https://tailscale.com/install.sh | sh
```

**macOS:**
```bash
brew install tailscale
```

**Windows:**
Download from [https://tailscale.com/download](https://tailscale.com/download)

### 2. Connect to Tailscale

```bash
sudo tailscale up
```

Follow the authentication link to log in and connect your device to your Tailscale network.

### 3. Verify Tailscale Connection

```bash
tailscale status
```

You should see your device listed with an IP address (usually in the 100.x.x.x range).

## Installation

### Option 1: Docker Deployment (Recommended)

1. Clone the repository:
```bash
git clone <repository-url>
cd P2P-File-Transfer
```

2. Ensure Tailscale is running on your host:
```bash
sudo tailscale up
```

3. Start the container:
```bash
docker-compose up -d
```

The server will start on port 3000. Check the logs to see your Tailscale IP:
```bash
docker-compose logs
```

4. Access the application:
- Local URL: `http://localhost:3000`
- Tailscale URL: `http://<your-tailscale-ip>:3000`

**To stop the container:**
```bash
docker-compose down
```

**To view logs:**
```bash
docker-compose logs -f
```

**To rebuild after changes:**
```bash
docker-compose up -d --build
```

### Option 2: Manual Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd P2P-File-Transfer
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm start
```

The server will start on port 3000 and display:
- Local URL: `http://localhost:3000`
- Tailscale URL: `http://<your-tailscale-ip>:3000`

## Usage

### Sharing Files

1. Open the application in your browser (use the Tailscale URL for remote access)
2. Click the upload area or drag and drop files
3. Files will be immediately available to all connected users

### Accessing from Other Devices

1. Install Tailscale on the device you want to access files from
2. Connect to the same Tailscale network
3. Open a browser and navigate to `http://<server-tailscale-ip>:3000`
4. You can now upload and download files securely

### Finding Your Tailscale IP

On the server machine, run:
```bash
tailscale ip -4
```

Or check the console output when starting the server.

## Configuration

### Change Port

**For Docker:**
Edit `docker-compose.yml` and change the port mappings and environment variable:
```yaml
ports:
  - "8080:8080"
environment:
  - PORT=8080
```

**For Manual Installation:**
Set the `PORT` environment variable:
```bash
PORT=8080 npm start
```

### File Size Limit

By default, there is no file size limit. If you want to add a limit, edit `server.js` and modify the multer configuration:
```javascript
const upload = multer({
  storage: storage,
  limits: { fileSize: 1024 * 1024 * 1024 } // Example: 1GB in bytes
});
```

### Upload Directory

Files are stored in the `uploads/` directory by default. To change this, modify the `uploadsDir` variable in `server.js`.

## Security Features

- **Private Network**: All traffic stays within your Tailscale network
- **End-to-End Encryption**: Tailscale provides encrypted connections
- **No Public Exposure**: No ports exposed to the public internet
- **Access Control**: Only devices on your Tailscale network can access the app

## Troubleshooting

### Server Won't Start

- Check if port 3000 is already in use
- Ensure Node.js is installed correctly: `node --version`

### Can't Connect via Tailscale

- Verify Tailscale is running: `tailscale status`
- Check firewall settings allow port 3000
- Ensure both devices are on the same Tailscale network

### Files Not Uploading

- Verify sufficient disk space is available
- Check browser console for errors (F12)
- Ensure the server is running and accessible

### WebSocket Connection Failed

- Ensure the server is running
- Check if a proxy or firewall is blocking WebSocket connections
- Try accessing via localhost first to rule out network issues

### Docker-Specific Issues

**Container won't start:**
- Check Docker logs: `docker-compose logs`
- Ensure port 3000 is not already in use
- Verify Docker and Docker Compose are installed: `docker --version && docker-compose --version`

**Can't access via Tailscale IP in Docker:**
- Ensure Tailscale is running on the host (not in container)
- Verify `network_mode: host` is set in docker-compose.yml
- Check host's Tailscale IP: `tailscale ip -4`

**Files disappear after container restart:**
- Ensure the volume is properly mounted in docker-compose.yml
- Check that `./uploads:/app/uploads` is in the volumes section

## Development

### Project Structure

```
P2P-File-Transfer/
├── public/
│   ├── index.html      # Main UI
│   ├── styles.css      # Styling
│   └── app.js          # Frontend logic
├── uploads/            # File storage (created automatically)
├── server.js           # Backend server
├── package.json        # Dependencies
├── Dockerfile          # Docker container configuration
├── docker-compose.yml  # Docker Compose configuration
├── .dockerignore       # Docker ignore file
└── README.md           # Documentation
```

### Running in Development

```bash
npm run dev
```

### Adding Features

The application is built with vanilla JavaScript and Express, making it easy to extend:

- **Authentication**: Add user authentication in `server.js`
- **File Encryption**: Implement encryption before storage
- **Compression**: Add file compression for faster transfers
- **Search**: Add file search functionality
- **Expiration**: Implement automatic file deletion after a time period

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## Support

For issues related to:
- **This application**: Open an issue on GitHub
- **Tailscale**: Visit [Tailscale documentation](https://tailscale.com/kb/)
- **Node.js**: Visit [Node.js documentation](https://nodejs.org/docs/)

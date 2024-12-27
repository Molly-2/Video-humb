const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Ensure uploads folder exists
const uploadDir = path.join(__dirname, 'public/uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Load existing videos metadata
const videoMetadataFile = path.join(__dirname, 'videos.json');
let videoData = [];

if (fs.existsSync(videoMetadataFile)) {
  videoData = JSON.parse(fs.readFileSync(videoMetadataFile, 'utf-8'));
}

// Video upload setup
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});
const upload = multer({ storage });

// Video upload route
app.post('/upload', upload.single('video'), (req, res) => {
  const { category, title } = req.body;

  if (req.file && category && title) {
    const videoUrl = `/uploads/${req.file.filename}`;
    const newVideo = {
      id: Date.now(),
      title,
      category,
      url: videoUrl
    };

    videoData.push(newVideo);
    fs.writeFileSync(videoMetadataFile, JSON.stringify(videoData, null, 2));

    io.emit('newVideo', newVideo); // Broadcast new video to clients
    res.status(200).json({ success: true, video: newVideo });
  } else {
    res.status(400).json({ success: false, message: 'Upload failed. Missing title or category.' });
  }
});

// Fetch all videos
app.get('/videos', (req, res) => {
  res.json(videoData);
});

// Start server
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
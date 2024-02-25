const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const bodyParser = require('body-parser');
const { exec } = require('child_process');

const app = express();
const port = 3000;

// Enable CORS
app.use(cors());

// Middleware for parsing JSON and URL-encoded bodies
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

// Upload route
app.post('/upload', (req, res) => {
  const uploadFolderPath = 'upload';

  // Remove any existing files in the upload folder
  fs.readdirSync(uploadFolderPath).forEach(file => {
    const filePath = `${uploadFolderPath}/${file}`;
    fs.unlinkSync(filePath);
  });

  // Extract frames data from the request body
  const frames = req.body;
  const framePaths = [];

  // Save each frame to a temporary file
  frames.forEach((frameDataUrl, index) => {
    const base64Data = frameDataUrl.replace(/^data:image\/png;base64,/, '');
    const framePath = `upload/frame_${index}.png`;
    framePaths.push(framePath);
    fs.writeFileSync(framePath, base64Data, 'base64');
  });

  // Create video from the saved frames using ffmpeg
  const outputFile = Date.now() + '.mp4';
  const resolution = "1280:720";
  const framerate = 1;
  const command = `ffmpeg -framerate 1/${framerate} -i upload/frame_%d.png -vf "scale=${resolution}" -c:v libx264 -r ${framerate} -pix_fmt yuv420p public/${outputFile}`;
  
  // Execute ffmpeg command
  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.log('error', error);
      res.status(500).send("error");
    } else {
      res.send({ path: outputFile });
    }
  });
});

// Route for serving video files
app.get('/video/:id', (req, res) => {
  const path = `public/${req.params.id}`;
  const stat = fs.statSync(path);
  const fileSize = stat.size;
  const range = req.headers.range;

  // Handle requests with range headers for partial content
  if (range) {
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = (end - start) + 1;
    const file = fs.createReadStream(path, { start, end });
    const head = {
      'Content-Range': `bytes ${start}-${end}/${fileSize}`,
      'Accept-Ranges': 'bytes',
      'Content-Length': chunksize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(206, head);
    file.pipe(res);
  } else {
    // Send the whole video file if no range header is present
    const head = {
      'Content-Length': fileSize,
      'Content-Type': 'video/mp4',
    };
    res.writeHead(200, head);
    fs.createReadStream(path).pipe(res);
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});

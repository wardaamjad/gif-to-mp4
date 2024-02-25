import React, { useState, useRef } from "react";
import { render } from "react-dom";
import { Stage, Layer, Image } from "react-konva";
import html2canvas from 'html2canvas';
import axios from "axios";
import "gifler";

// Component for rendering GIF frames
const GIF = ({ src, imageRef }) => {
  // Create canvas for rendering GIF frames
  const canvas = React.useMemo(() => {
    const node = document.createElement("canvas");
    return node;
  }, []);

  // Effect for rendering GIF frames
  React.useEffect(() => {
    let anim;
    window.gifler(src).get(a => {
      anim = a;
      anim.animateInCanvas(canvas);
      anim.onDrawFrame = (ctx, frame) => {
        ctx.drawImage(frame.buffer, frame.x, frame.y);
        imageRef.current.getLayer().draw();
      };
    });
    return () => anim.stop();
  }, [src, canvas]);

  return <Image image={canvas} ref={imageRef} />;
};

// Main App component
const App = () => {
  // Ref for Image component
  const imageRef = useRef(null);

  // States
  const [screenshots, setScreenshots] = useState([]); // To store recorded videos
  const [capturing, setCapturing] = useState(false); // Indicates if capturing is in progress
  const [frames, setFrames] = useState([]); // To store captured frames
  const [gifSrc, setGifSrc] = useState(""); // To store the selected GIF src

  // Function to capture a frame
  const captureFrame = () => {
    html2canvas(document.querySelector("canvas")).then(canvas => {
      const frame = canvas.toDataURL('image/png', 1.0);
      setFrames(prevFrames => [...prevFrames, frame]);
    });
  };

  // Function to handle file change (selecting a GIF)
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setGifSrc(e.target.result);
      };
      reader.readAsDataURL(file);
      startCapturing();
    }
  };

  // Function to send captured frames to backend
  const sendFramesToBackend = async () => {
    try {
      const formData = new FormData();
      frames.forEach((frame, index) => {
        formData.append("frame", frame);
      });
      // Send FormData to backend
      const response = await axios.post('http://localhost:3000/upload', frames, {
        headers: {
          'Content-Type': 'application/json'
        }
      });
      // Update state with the response data path for the video
      setScreenshots([...screenshots, response.data.path]);
    } catch (error) {
      console.error('Error sending frames to backend:', error);
    }
  };

  // Function to start capturing frames
  const startCapturing = () => {
    setCapturing(true);
    setFrames([]);
    const captureInterval = setInterval(captureFrame, 100);
    setTimeout(() => {
      clearInterval(captureInterval);
      setCapturing(false);
    }, 5000);
  };

  // Render JSX
  return (
    <>
      {/* File input for selecting a GIF */}
      <input type="file" accept=".gif" onChange={handleFileChange} />
      {/* Render GIF and export button if a GIF is selected */}
      {gifSrc && <>
        <Stage width={window.innerWidth} height={window.innerHeight}>
          <Layer>
            <GIF src={gifSrc} imageRef={imageRef} />
          </Layer>
        </Stage>
        <button onClick={sendFramesToBackend}>
          Export video
        </button>
      </>}

      {/* Display capturing status */}
      {capturing && <p>Capturing...</p>}

      {/* Display recorded videos */}
      <div>
        {screenshots.length > 0 && (
          <div>
            <h3>Recorded Videos:</h3>
            {screenshots.map((videoSrc, index) => (
              <video key={index} width="400" controls>
                <source src={`http://localhost:3000/video/${videoSrc}`} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
            ))}
          </div>
        )}
      </div>
    </>
  );

}

// Render the App component
render(<App />, document.getElementById("root"));

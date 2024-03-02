import React, { useState, useRef } from "react";
import { render } from "react-dom";
import { Stage, Layer, Image } from "react-konva";
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
  const stageRef = useRef(null);

  // States
  const [screenshots, setScreenshots] = useState([]); // To store recorded videos
  const [capturing, setCapturing] = useState(false); // Indicates if capturing is in progress
  const [gifSrc, setGifSrc] = useState(""); // To store the selected GIF src
  const [successfulPostCount, setSuccessfulPostCount] = useState(0); // Count of successful POST requests
  const [response, setResponse] = useState(0);


  // Function to handle file change (selecting a GIF)
  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setGifSrc(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };



  const sendImageRef = async () => {
    try {
      const imageData = stageRef.current.toDataURL();
      const jsonData = JSON.stringify({ image: imageData });
      await axios.post('http://localhost:3000/receive-image', jsonData, {
        headers: {
          'Content-Type': 'application/json'
        }
      });


    } catch (error) {
      console.error('Error sending frames to backend:', error);
    }
  };
  // Function to start capturing frames
  const startCapturing = () => {
    const dataPromises = [];
    setCapturing(true);

    const captureInterval = setInterval(() => {
      const promise = sendImageRef(); // Call API periodically
      dataPromises.push(promise); // Store the promise
    }, 500);
    // const captureInterval = setInterval(sendImageRef, 500);
    setTimeout(async () => {
      clearInterval(captureInterval);
      Promise.all(dataPromises)
        .then(async () => {
          const response = await axios.get('http://localhost:3000/createVideo');
          setScreenshots([...screenshots, response.data.path]);
          setCapturing(false);
        })
        .catch(error => {
          setCapturing(false);

          // Handle any errors that occur during Promise.all()
          console.error('Error in Promise.all():', error);
        });

    }, 12000);
  };

  // Render JSX
  return (
    <>
      {/* File input for selecting a GIF */}
      <input type="file" accept=".gif" onChange={handleFileChange} />
      {/* Render GIF and export button if a GIF is selected */}
      {gifSrc && <>
        <Stage width="500" height="500" ref={stageRef}>
          <Layer>
            <GIF src={gifSrc} imageRef={imageRef} />
          </Layer>
        </Stage>
        {/* Display capturing status */}
        {capturing ? <p>Capturing...</p> : <button onClick={startCapturing}>
          Export video
        </button>}

      </>}



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

import riot from 'riot';
import componentFactory from '../component-factory';
import util from '../util/misc.js';
import accountStatus from './account-status';
import mall from './mall';
import login from './login';
import videoPlayer from './video-player';

componentFactory.createComponent('main', `

<div class="player-container">
    <video-player></video-player>
</div>


<div class="camera-container">
    <video id="webcam-input" autoplay width="640" height="480"></video>
    <canvas id="canvas-blended" width="640" height="480"></canvas>
    <canvas id="canvas-source" width="640" height="480"></canvas>

</div>



<style>
    main {
        display: block;
        background-color: #f2f2f2;

        .camera-container {
            margin-top: 200px;
        }

        .player-container {
            margin-top: 50px;
        }

        video-player {
            display: block;
            margin: auto;
        }
    }

</style>
 
 `,
 function(opts) {
     let self = this;


    this.on('mount', () => {
        console.log("Main mounted");

        this.initMic = function(){
            console.log('init p5')
            let input;
            let analyzer;
            let mic;

            window.setup = function() {
                console.log('p5 setup')
                // Create an Audio input
                mic = new p5.AudioIn();

                // start the Audio Input.
                // By default, it does not .connect() (to the computer speakers)
                mic.start();
            }

            window.draw = function() {
                // Get the overall volume (between 0 and 1.0)
                var vol = mic.getLevel();
                if(self.shouldFireEvents){
                    self.dispatcher.trigger('sound_detected', {level: vol});
                }

            }
        }

     if(util.isBrowser()){

         this.initMic();


            function getElById(id){
                return document.getElementById(id);
            }

            var videoEl = getElById("webcam-input"),
                videoHeight = videoEl.height,
                videoWidth = videoEl.width,

                canvasSource = getElById("canvas-source"),
                canvasBlended = getElById("canvas-blended"),

                contextSource = canvasSource.getContext('2d'),
                contextBlended = canvasBlended.getContext('2d'),

                width = canvasSource.width,
                height = canvasSource.height,

                blendedImageData = contextBlended.createImageData(width, height),
                sourceImageData,
                lastImageData = contextSource.getImageData(0, 0, width, height),

                bestCounts = [],
                bestPixelPositions = [];

            /**
             * Kick off the JS.
             */

                // Invert the camera x-axis
            contextSource.translate(canvasSource.width, 0);
            contextSource.scale(-1, 1);

            var getUserMediaName;
            var gumFnNames = ['getUserMedia', 'mozGetUserMedia', 'webkitGetUserMedia', 'msGetUserMedia']
            if(!gumFnNames.some(function(fnName) {
                    if (typeof navigator[fnName] === 'function') {
                        getUserMediaName = fnName;
                        return true;
                    }
                    return false;
                })) {
                alert('Your browser does not support the "getUSerMedia" API, boo! Try Firefox.');
                return;
            }

            navigator[getUserMediaName]({audio: false, video: true}, webcamSuccess, webcamError);


            /**
             * Functions.
             */


            function webcamError(error) {
                console.error("Webcam error:", error);
            }

            function webcamSuccess(stream) {
                videoEl.src = window.URL.createObjectURL(stream);

                // Loop away!
                window.requestAnimationFrame(recursiveCanvasUpdate);
            }

            function differenceSimple(blendTarget, data1, data2) {
                var numIterations,
                    iteration,
                    diffRed,
                    diffGreen,
                    diffBlue,
                    change,
                    oldChange,
                    detectionThreshold = 0.05 * 0xFF,
                    lastBestPixelPosition = 0,
                    lastBestCount = 1,
                    currentPossbiblePixelPostion = false,
                    currentBestCount = 0,
                    bestPosition,
                    numPointsToTrack = 10,
                    pointIterator,
                    numPoints,
                    pointLimit,
                    x,
                    y,
                    pixelPosition,
                    arrayPosition,
                    crossSize,
                    crossOffset,
                    crossPixelX,
                    crossPixelY,
                    detectMotion;

                if (data1.length != data2.length) return null;

                // reset last best position arrays
                bestCounts = [];
                bestPixelPositions = [];

                detectMotion = false;

                numIterations = width*height;

                pixelPosition = numIterations;

                while (pixelPosition--) {

                    arrayPosition = pixelPosition * 4;

                    // Temporarily ignore the green channel which is being used to mark the biggest motion density.
                    // TODO Re-instate the outputbuffer, use that for the marker, and start measuring the green channel again.
                    diffRed = data1[arrayPosition] - data2[arrayPosition];
                    diffGreen = data1[arrayPosition+1] - data2[arrayPosition+1];
                    diffBlue = data1[arrayPosition+2] - data2[arrayPosition+2];
                    change = (diffRed + diffGreen + diffBlue) / 3;

                    // Track positive and negative brightness changes.
                    if (change < 0) change = -change;

                    oldChange = blendTarget[arrayPosition];

                    if(change > detectionThreshold && !detectMotion){
                        detectMotion = true;
                    }

                    // Do not propagate changes below a threshold.
                    if (change < detectionThreshold) {

                        // If there is a new candidate for the densest linear custer of difference then store it.
                        if (currentBestCount > lastBestCount) {
                            lastBestCount = currentBestCount;
                            lastBestPixelPosition = currentPossbiblePixelPostion;

                            bestCounts.push(lastBestCount);
                            bestPixelPositions.push(lastBestPixelPosition);
                        }

                        // Reset the count for the next detection.
                        currentBestCount = 0;
                        currentPossbiblePixelPostion = false;

                    } else {

                        // If there is no candidate for densest difference position store this starting point.
                        if (!currentPossbiblePixelPostion) currentPossbiblePixelPostion = pixelPosition;

                        // Up the count weighted by the percentage change.
                        currentBestCount += (change/0xFF);
                        //console.log('DETECTED MOTION!!!')
                    }

                    // Preserve the difference for the next iteration.
                    blendTarget[arrayPosition] = change;
                    blendTarget[arrayPosition+1] = change;
                    blendTarget[arrayPosition+2] = change;
                    blendTarget[arrayPosition+3] = 0xFF;
                }


                /*
                 * Mark the point of densest linear difference signal for this frame.
                 */

                // Loop over the best N (numPointsToTrack) detections.
                numPoints = bestPixelPositions.length;
                if (numPoints > numPointsToTrack) {
                    pointLimit = numPoints - numPointsToTrack;
                } else {
                    pointLimit = numPoints;
                }
                for (pointIterator = numPoints; pointIterator > pointLimit; pointIterator -= 1) {

                    bestPosition = bestPixelPositions[pointIterator];

                    // Extract the x and y co-ordinates from the linear pixel position.
                    x = bestPosition%width;
                    y = Math.floor(bestPosition/width);

                    crossSize = 30;
                    crossOffset = parseInt(crossSize*0.5, 10);
                    iteration = crossSize;
                    while (iteration--) {
                        crossPixelX = (x - crossOffset + iteration) + y*width;
                        crossPixelY = x + (y - crossOffset + iteration)*width;
                        blendTarget[crossPixelX*4] = 0;
                        blendTarget[crossPixelX*4+1] = 0xFF;
                        blendTarget[crossPixelX*4+2] = 0;
                        blendTarget[crossPixelY*4] = 0;
                        blendTarget[crossPixelY*4+1] = 0xFF;
                        blendTarget[crossPixelY*4+2] = 0;
                    }
                }

                if(self.shouldFireEvents){
                    self.dispatcher.trigger('motion_detected', {numPoints: numPoints});
                }
            }

            function getBlendedVideoData() {

                // get webcam image data
                sourceImageData = contextSource.getImageData(0, 0, width, height);

                // blend the 2 images, operations by reference
                differenceSimple(blendedImageData.data, sourceImageData.data, lastImageData.data);

                // store the current webcam image
                lastImageData = sourceImageData;

                return blendedImageData;
            }

            function drawOriginalVideo() {
                contextSource.drawImage(videoEl, 0, 0, videoWidth, videoHeight);
            }

            function drawBlendedVideo() {
                contextBlended.putImageData(getBlendedVideoData(), 0, 0);
            }

            function recursiveCanvasUpdate () {
                drawOriginalVideo();
                drawBlendedVideo();

                window.requestAnimationFrame(recursiveCanvasUpdate);
            }
        }


        setTimeout(()=>{
            self.shouldFireEvents = true;
        }, 5000)
    });

    this.dispatcher.on('main_state_updated', () => {
        this.update();
    });
});

/*
TODO
1. add sliders for thresholds
2. add input for youtube url

 */

import riot from 'riot';
import componentFactory from '../component-factory';
import util from '../util/misc.js';
import accountStatus from './account-status';
import mall from './mall';
import login from './login';

componentFactory.createComponent('main', `

<!--account-status></account-status>
<mall if={stores.main.state=='mall'}></mall>
<login if={stores.main.state=='login'}></login-->

<canvas id="canvas-blended" width="640" height="480"></canvas>


<style>
    main {
        display: block;
        background-color: pink;
    }

    #canvas-blended{
        min-width: 640px;
        min-height: 480px;
        display: block;
        margin: auto;
        margin-top: 50px;
    }
</style>
 
 `,
 function(opts) {
     this.initCanvas = ()=>{

         var canvas = document.getElementById("canvas-blended");

         var ctx = canvas.getContext("2d");
         ctx.fillStyle = "#FF0000";
         ctx.strokeStyle = "#00FF00";
         ctx.lineWidth = 5;

         console.log("Inintializing");
         var camMotion = CamMotion.Engine({
             canvasBlended: canvas
         });
         console.log(camMotion);
         camMotion.on("error", function (e) {
             console.log("error", e);
         });
         console.log(camMotion);
         camMotion.on("streamInit", function(e) {
             console.log("webcam stream initialized", e);
         });
         camMotion.onMotion(CamMotion.Detectors.LeftMotion, function () {
             console.log("AAAAAAAAAAAAAAAH Left motion detected");
         });
         camMotion.onMotion(CamMotion.Detectors.RightMotion, function () {
             console.log("AAAAAAAAAAAAAAAH Right motion detected");
         });
         camMotion.onMotion(CamMotion.Detectors.DownMotion, function () {
             console.log("AAAAAAAAAAAAAAAH Down motion detected");
         });
         camMotion.onMotion(CamMotion.Detectors.UpMotion, function () {
             console.log("AAAAAAAAAAAAAAAH Up motion detected");
         });
         camMotion.on("frame", function () {

             var point = camMotion.getMovementPoint(true);
             // draw a circle
             ctx.beginPath();
             ctx.arc(point.x, point.y, point.r, 0, Math.PI*2, true);
             ctx.closePath();
             if (camMotion.getAverageMovement(point.x-point.r/2, point.y-point.r/2, point.r, point.r)>4) {
                 ctx.fill();
             } else {
                 ctx.stroke();
             }
         });
         camMotion.start();


     }

    this.on('mount', () => {
        console.log("Main mounted");



        if(util.isBrowser()){
            this.initCanvas();
        }
    });

    this.dispatcher.on('main_state_updated', () => {
        this.update();
    });
});

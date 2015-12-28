import riot from 'riot';
import componentFactory from '../component-factory';
import util from '../util/misc';

componentFactory.createComponent('video-player', `

<div class="video-js-box">
        <video id="vjs-video-tag" class="video-player video-js vjs-default-skin vjs-big-play-centered"
              preload="auto"
              controls="true"
              poster="{posterUrl}">
             <source riot-src="{videoSrc}" riot-type="{videoMime}" />
        </video>
    </div>

<style>


</style>

`,
function(opts) {
    var self = this;
    var vjsPlayer = null;
    this.posterUrl = '/images/video_poster.png';
    this.videoMime = "video/mp4";
    this.videoSrc = '/videos/Three_Laws_of_The_Internet.mp4';

    function onPlayerReady() {
        vjsPlayer = this;
        vjsPlayer.play();
        this.lastPlayTs = new Date().getTime();

        vjsPlayer.on("loadeddata", () => {

        });

        vjsPlayer.on("error", (e) => {
            console.log('videojs: on error, e = ', e);
        });

        vjsPlayer.on("play", () => {

        });

        vjsPlayer.on("pause", () => {

        });

        vjsPlayer.on("stop", () => {

        });

        vjsPlayer.on("ended", () => {
            self.reInitPlayer(true);
        });
    };

    this.initVideoPlayer = () => {
        if ($('#vjs-video-tag').length) {  // only if the parent element exists in the DOM (i.e we're already in preview/campaign mode, not in manage mode)
            videojs('vjs-video-tag', {controls: true }, function(){

            }).ready(onPlayerReady);
        }
    };

    this.reInitPlayer = (autoplay) => {
        console.log('reInitPlayer: disposing of existing player, vjsPlayer not null = ', vjsPlayer != null);
        if(vjsPlayer){
            vjsPlayer.dispose();
            vjsPlayer = null;
        }
        else {
            $(this.root).find('video#vjs-video-tag').remove();
        }

        console.log('reInitPlayer: self.videoSrc = ', self.videoSrc);
        let videoJsHtml = '' +
            '<video id="vjs-video-tag" class="video-player video-js vjs-default-skin vjs-big-play-centered" '+ (autoplay ? 'autoplay': '') + ' preload="auto" poster="' + self.posterUrl + '"\n' +
             'controls="true" src="' + self.videoSrc + '" type="' + self.videoMime + '"/>\n';

        console.log('reInitPlayer: videoJsHtml = ', videoJsHtml);
        $(this.root).find('div.video-js-box').append(videoJsHtml);

        this.initVideoPlayer();
    };

    this.on('mount', () => {
        console.log("video-player mounted");

        if(util.isBrowser()){
            this.initVideoPlayer();
        }
    });

    let UPDATE_VIDEO_INTERVAL = 150;
    let RESTART_VIDEO_INTERVAL = 600000;
    //let SOUND_LEVEL_THRESHOLD = 0.0089;
    let SOUND_LEVEL_THRESHOLD = 0.06;
    let MOTION_POINTS_THRESHOLD = 15;
    let MOTION_DETECTION_THRESHOLD = 4;

    this.lastPlayTs = 0;
    this.timesNoMotionsDetected = 0;
    this.handleEvents = () => {
        console.log('video-player.handleEvents:  this.lastUpdatedMotionPoints = ', this.lastUpdatedMotionPoints, ' this.lastUpdatedSoundLevel = ', this.lastUpdatedSoundLevel);
        if(this.lastUpdatedMotionPoints > MOTION_POINTS_THRESHOLD && this.lastUpdatedSoundLevel > SOUND_LEVEL_THRESHOLD){
            console.log('SHOULD PLAY')
            self.lastPlayTs = new Date().getTime();
            if(vjsPlayer && vjsPlayer.paused()){
                vjsPlayer.play();
            }
        }else{
            console.log('SHOULD PAUSE')
            if(this.lastUpdatedMotionPoints == 0){
                this.timesNoMotionsDetected++;
            }else{
                this.timesNoMotionsDetected = 0;
            }

            if(this.timesNoMotionsDetected > MOTION_DETECTION_THRESHOLD){
                this.timesNoMotionsDetected = 0;

                if(vjsPlayer && !vjsPlayer.paused()){

                    vjsPlayer.pause();
                    setTimeout(function(){
                        let now = new Date().getTime();
                        //console.log('now = ', now, ' self.lastPlayTs  = ', self.lastPlayTs , ' now - self.lastPlayTs  = ', now - self.lastPlayTs);
                        if(vjsPlayer.paused() && now - self.lastPlayTs > RESTART_VIDEO_INTERVAL){
                            self.reInitPlayer(true);
                        }
                    }, RESTART_VIDEO_INTERVAL);
                }
            }
        }
    }

    this.lastUpdatedSoundLevel = 0;
    this.dispatcher.on('sound_update', (data) => {
        //console.log('sound_update: data.level = ', data.level);
        this.lastUpdatedSoundLevel = data.level;
    });

    this.lastUpdatedMotionPoints = 0;
    this.dispatcher.on('motion_detected', (data) => {
        //console.log('motion_detected: data.numPoints = ', data.numPoints);
        this.lastUpdatedMotionPoints = data.numPoints;
    });

    setInterval(()=>{
        self.handleEvents();
    }, UPDATE_VIDEO_INTERVAL)
});

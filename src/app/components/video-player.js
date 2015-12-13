import riot from 'riot';
import componentFactory from '../component-factory';
import util from '../util/misc';


componentFactory.createComponent('video-player', `

<div class="video-js-box">
        <video id="top-section-player" class="video-player video-js vjs-default-skin vjs-big-play-centered"
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
        this.posterUrl = '/images/video_poster.jpg';
        this.videoMime = "video/mp4";
        this.videoSrc = '/videos/Three_Laws_of_The_Internet.mp4';


        this.initVideoPlayer = () => {

            if ($('#top-section-player').length) {  // only if the parent element exists in the DOM (i.e we're already in preview/campaign mode, not in manage mode)
                videojs('top-section-player', {controls: true }, function(){

                }).ready(onPlayerReady);
            }
        };

        function onPlayerReady() {
            vjsPlayer = this;
            vjsPlayer.play();
            this.lastPlayTs = new Date().getTime();
            console.log('AMIT: onPlayerReady')

            function resizeVideoJS_minimal() {
                // if we're in fullscreen mode, remove all vertical align tweaking
                if ($('#top-section-player.vjs-fullscreen').length) {
                    $(self.root).find('video.vjs-tech').css('margin-top', '');
                }
                else {
                    //$(self.root).find('video.vjs-tech').vAlign();   // align poster to center of video, and video to center of container
                }
            }

            resizeVideoJS_minimal(); // Initialize the function
            window.onresize = resizeVideoJS_minimal; // Call the function on resize

            // for some reason even when metadata is loaded, the parent element still has the previous height.
            // so we wait for actual data to be loaded, and then vertical align the video.
            vjsPlayer.on("loadeddata", () => {
                resizeVideoJS_minimal();
            });

            // potential fix for flash fallback (older firefox, IE, opera[?]):
            vjsPlayer.on("loadedmetadata", () => {


                // are we in fallback-to-flash mode?
                if ($(self.root).find('#' + vjsPlayer.id() + ' > object#' + vjsPlayer.id() + '_flash_api').length == 0) {
                    return;
                }

                let videoJsPlayerApi = $(self.root).find('#' + vjsPlayer.id() + ' > object#' + vjsPlayer.id() + '_flash_api').get(0);

                let videoWidth = videoJsPlayerApi.vjs_getProperty("videoWidth");
                let videoHeight = videoJsPlayerApi.vjs_getProperty("videoHeight");
                let aspectRatio = Number(videoHeight / videoWidth).toFixed(2);

                function resizeVideoJS(){
                    // Get the parent element's actual width
                    var width = document.getElementById(vjsPlayer.id()).parentElement.offsetWidth;

                    // Set width to fill parent element, Set height
                    let resizeTargetElement = $(self.root).find('#' + vjsPlayer.id() + ' > object');

                    resizeTargetElement.css({'width': width + 'px', 'height' : (width * aspectRatio) + 'px'});

                    resizeVideoJS_minimal(); // also align poster to center of video (and video to center of container)
                }

                resizeVideoJS(); // Initialize the function
                window.onresize = resizeVideoJS; // override the resize callback with the flash version
            });

            vjsPlayer.on("error", (e) => {
                console.log('videojs: on error, e = ', e);
            });

            vjsPlayer.on("play", () => {
                console.log('videojs: playing music');


            });

            vjsPlayer.on("pause", () => {

            });

            vjsPlayer.on("stop", () => {

                //self.dispatcher.trigger(Events.Actions.STOP_SONG);
            });

            vjsPlayer.on("ended", () => {


                //self.posterUrl = "/assets/images/player_background.png";
                self.reInitPlayer(true);
            });
        };

        this.reInitPlayer = (autoplay) => {
            // and also dispose and re-create player in order to reset it
            console.log('reInitPlayer: disposing of existing player, vjsPlayer not null = ', vjsPlayer != null);
            if(vjsPlayer){
                vjsPlayer.dispose();
                vjsPlayer = null;
            }
            else {
                // in case the video player wasn't initialized yet, we must remove the DOM element before adding a new one
                $(this.root).find('video#top-section-player').remove();
            }

            console.log('reInitPlayer: self.videoSrc = ', self.videoSrc);
            let videoJsHtml = '' +
                '<video id="top-section-player" class="video-player video-js vjs-default-skin vjs-big-play-centered" '+ (autoplay ? 'autoplay': '') + ' preload="auto" poster="' + self.posterUrl + '"\n' +
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

        this.lastPlayTs = 0;
        this.levelThreshold = 0.08;
        this.dispatcher.on('current_level', (data) => {
            console.log('current_level: data.level = ', data.level);
            if(data.level >= this.levelThreshold){
                self.lastPlayTs = new Date().getTime();
                if(vjsPlayer && vjsPlayer.paused()){
                    vjsPlayer.play();
                }
            }else{
                console.log('SHOULD_PAUSE');
                if(vjsPlayer && !vjsPlayer.paused()){
                    vjsPlayer.pause();
                    setTimeout(function(){
                        let now = new Date().getTime();
                        console.log('now = ', now, ' self.lastPlayTs  = ', self.lastPlayTs , ' now - self.lastPlayTs  = ', now - self.lastPlayTs);
                        if(vjsPlayer.paused() && now - self.lastPlayTs > 6000){
                            self.reInitPlayer(true);
                        }
                    }, 6000);
                }
            }
        });

    });

'use strict'
import riot from 'riot';

import Store from './store';

export default class MainStore extends Store {
    constructor() {
        super();
        console.log("Init MainStore");
        this.state="mall";

        this.on("login_pressed", (state) => {
            this.state = 'login';
            this.trigger("main_state_updated", "login");
        });

        this.on("fruit_swap", (fruit) => { 
            this.state ='mall';
            this.trigger("main_state_updated", "mall");
        });

        this.on("sound_detected", (data) => {
            //console.log('MainStore on: sound_detected, level = ', data.level)
            this.trigger("sound_update", data);
        });

        this.on("motion_detected", (data) => {
            //console.log('MainStore on: motion_detected, numPoints = ', data.numPoints)
            this.trigger("motion_update", data);
        });



    }     

};


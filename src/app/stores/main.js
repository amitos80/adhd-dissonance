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

        this.on("motion_detected", (data) => {
            console.log('MainStore on: motion_detected, numPoints = ', data.numPoints)
            //console.log('MainStore on: motion_detected, diffRed = ', data.diffRed, ' diffGreen = ', data.diffRed, ' diffBlue = ', data.diffBlue)
            //this.trigger("main_state_updated", "mall");
        });



    }     

};


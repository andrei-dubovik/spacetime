"use strict"

/** Track and show FPS */
function updateFPS(state) {
    state.fps += 1;
    let now = Math.floor(Date.now()/1000);
    if (now > state.timer) {
        let counter = document.getElementById("fps-counter");
        if (now == state.timer + 1) {
            counter.innerHTML = state.fps;
        } else {
            counter.innerHTML = (state.fps/(now - state.timer)).toPrecision(2);
        }
        state.fps = 0;
        state.timer = now;
    }
}


/** Set a clock to given time (in milliseconds) */
function updateClock(clock, time) {
    let minutes = (time / 1000) % 60;  // 1 minute ticks as 1 second
    let hours = (time / 60000) % 12;
    let minuteHand = clock.querySelector(".minute-hand");
    if (minuteHand != null) {
        // Analog clock
        let hourHand = clock.querySelector(".hour-hand");
        minuteHand.setAttribute("transform", `rotate(${minutes*6})`);
        hourHand.setAttribute("transform", `rotate(${hours*30})`);
    }
    if (clock.localName == "span") {
        // Digital clock
        let m = Math.floor(minutes).toString().padStart(2, "0");
        let h = Math.floor(hours).toString().padStart(2, "0");
        let text = `${h}:${m}`;
        if (clock.innerHTML != text) {
            clock.innerHTML = text;
        }
    }
}


/** Update all clocks (poor poor Captain Hook) */
function updateAllClocks(state) {
    updateClock(state.ownAnalogClock, state.properTime);
    updateClock(state.ownDigitalClock, state.properTime);
    for (let star of state.stars) {
        updateClock(star, state.properTime);
    }
}


/** Compute Proper Time delta (ticks along with computer time) */
function dProperTime(timestamp, previousTimestamp) {
    let dtau = timestamp - previousTimestamp;
    if (dtau >= 100) {
        dtau = 0;  // Freeze simulation below 10 FPS (e.g., tab switches)
    }
    return dtau;
}


/** Update the simulation and the interface */
function updateFrame(timestamp, previousTimestamp, state) {
    updateFPS(state);
    state.properTime += dProperTime(timestamp, previousTimestamp);
    updateAllClocks(state);
    window.requestAnimationFrame(t => updateFrame(t, timestamp, state));
}


/** Initialize the simulation */
function init() {
    let state = {
        fps: 0,
        timer: Math.floor(Date.now()/1000),
        properTime: 0,
        ownAnalogClock: document.getElementById("eigenzeit-side"),
        ownDigitalClock: document.getElementById("eigenzeit-top"),
        stars: document.querySelectorAll(".star"),
    };
    window.requestAnimationFrame(t => updateFrame(t, 0, state));
}


window.onload = init;

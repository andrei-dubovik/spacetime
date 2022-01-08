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


/** Set a clock to given time */
function updateClock(clock, time) {
    let minutes = time % 60;  // 1 minute ticks as 1 second
    let hours = (time / 60) % 12;
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
    return dtau/1000;
}


/** Get 4-acceleration from a predefined schedule (dev only) */
function scheduledAcc(properTime) {
    if (properTime <= 5) {
        return [0, 0, 0];
    } else if (properTime <= 10) {
        return [0, 0, -0.2];
    } else if (properTime <= 30) {
        return [0, 0, 0];
    } else if (properTime <= 35) {
        return [0, 0, 0.2];
    } else {
        return [0, 0, 0];
    }
}


/** Update the simulation and the interface */
function updateFrame(timestamp, previousTimestamp, state) {
    updateFPS(state);
    state.properTime += dProperTime(timestamp, previousTimestamp);
    state.ownAcc = scheduledAcc(state.properTimer);
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
        ship: {
            pos: [0, 0, 0],     // displacement, stars' IRF
            vel: [1, 0, 0],     // 4-velocity, stars' IRF
            acc: [0, 0, 0],     // 4-acceleration, stars' IRF
            ownAcc: [0, 0, 0],  // 4-acceleration, ship's non-rotated IRF
        },
    };
    window.requestAnimationFrame(t => updateFrame(t, 0, state));
}


window.onload = init;

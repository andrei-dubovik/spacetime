"use strict"

/** Track and show FPS */
function showFPS(state) {
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


/** Update the simulation and the interface */
function drawFrame(timestamp, previousTimestamp, state) {
    showFPS(state);
    window.requestAnimationFrame(t => drawFrame(t, timestamp, state));
}


/** Initialize the simulation */
function init() {
    let state = {
        fps: 0,
        timer: Math.floor(Date.now()/1000),
    };
    window.requestAnimationFrame(t => drawFrame(t, 0, state));
}


window.onload = init;

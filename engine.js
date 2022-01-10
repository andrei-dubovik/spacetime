"use strict";

// All array operations assume rectangular arrays

/** Apply an operator to a vector */
function dot_ij_j(a1, a2) {
    if (a1[0].length != a2.length) {
        throw new Error("Non-conformant arrays");
    }
    let a0 = [];
    for (let i = 0; i < a1.length; i++) {
        a0[i] = 0;
        for (let j = 0; j < a1[0].length; j++) {
            a0[i] += a1[i][j]*a2[j];
        }
    }
    return a0;
}


/** Multiply a vector by a scalar */
function dot_0_i(a1, a2) {
    let a0 = [];
    for (let i = 0; i < a2.length; i++) {
        a0[i] = a1*a2[i];
    }
    return a0;
}


/** Add a vector to an exisitng vector in-place */
function addAssign(a0, a1) {
    if (a0.length != a1.length) {
        throw new Error("Non-conformant arrays");
    }
    for (let i = 0; i < a0.length; i++) {
        a0[i] += a1[i];
    }
}


/** Construct a Lorentz operator */
function lorentz(v) {
    let vx = v[0];
    let vy = v[1];
    let v2 = vx**2 + vy**2;
    if (v2 >= 1) {
        throw new Error("Cannot use Lorentz transformation for v >= c");
    }
    if (v2 < 1e-16) {
        // Use small v approximation that is continuous at v == 0
        return [
            [  1, -vx, -vy],
            [-vx,   1,   0],
            [-vy,   0,   1],
        ];
    } else {
        let g = 1/Math.sqrt(1 - v2);
        return [
            [    g,            -g*vx,            -g*vy],
            [-g*vx, 1+(g-1)*vx**2/v2,   (g-1)*vx*vy/v2],
            [-g*vy,   (g-1)*vx*vy/v2, 1+(g-1)*vy**2/v2],
        ];
    }
}


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


/** Change ship's position over a small time interval */
function stepShip(ship, dtau) {
    addAssign(ship.pos, dot_0_i(dtau, ship.vel));  // x += dx/dtau*dtau
    addAssign(ship.vel, dot_0_i(dtau, ship.acc));  // v += dv/dtau*dtau

    // v = - dxy/dtau / dt/dtau = - dxy/dt
    let v = dot_0_i(-1/ship.vel[0], ship.vel.slice(1, 3));
    let Linv = lorentz(v);
    ship.acc = dot_ij_j(Linv, ship.ownAcc);
}


/** Update the simulation and the interface */
function updateFrame(timestamp, previousTimestamp, state) {
    updateFPS(state);
    let dtau = dProperTime(timestamp, previousTimestamp);
    state.properTime += dtau;
    state.ship.ownAcc = scheduledAcc(state.properTime);
    stepShip(state.ship, dtau);
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

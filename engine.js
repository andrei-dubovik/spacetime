"use strict";

// Copyright (c) 2022 Andrey Dubovik <andrei at dubovik dot eu>

// All array operations assume rectangular arrays

/** Create an array with values 0, 1, ..., n-1 */
function arange(n) {
    let a = [];
    for (let i = 0; i < n; i++) {
        a[i] = i;
    }
    return a;
}


/** Swap two values in an array (in-place) */
function swap(a, i, j) {
    let buf = a[i];
    a[i] = a[j];
    a[j] = buf;
}


/** Compute LU decomposition (in-place) */
function luFactorize(lu) {
    let n = lu.length;
    if (n != lu[0].length) {
        throw new Error("Cannot LU factorize a non-square matrix");
    }
    let p = arange(n);

    for (let i = 0; i < n; i++) {  // `i < n` for the singularity check
        // Partial pivot
        let max = 0;
        let k = NaN;
        for (let j = i; j < n; j++) {
            let x = Math.abs(lu[j][i]);
            if (x > max) {
                max = x;
                k = j;
            }
        }
        if (max < 1e-16) {  // a bit arbitrary for the moment
            throw new Error("Singular matrix detected");
        }
        if (k != i) {
            swap(lu, i, k);
            swap(p, i, k);
        }

        // Gaussian elimination
        for (let j = i + 1; j < n; j++) {
            lu[j][i] /= lu[i][i];
            for (let k = i + 1; k < n; k++) {
                lu[j][k] -= lu[i][k]*lu[j][i];
            }
        }
    }
    return p;
}


/** Solve a linear system given its LU decomposition */
function luSolve(lu, p, b) {
    let n = lu.length;
    let x = [];

    // Solve the lower-triangle system
    for (let i = 0; i < n; i++) {
        x[i] = b[p[i]];
        for (let j = 0; j < i; j++) {
            x[i] -= lu[i][j]*x[j];
        }
    }

    // Solve the upper-triangle system
    for (let i = n - 1; i >= 0; i--) {
        for (let j = i + 1; j < n; j++) {
            x[i] -= lu[i][j]*x[j];
        }
        x[i] /= lu[i][i];
    }
    return x;
}


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
    updateClock(state.ship.analogClock, state.ship.ownTime);
    updateClock(state.ship.digitalClock, state.ship.ownTime);
    for (let star of state.stars) {
        updateClock(star.widget, state.ship.ownTime);
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


/** Show ship's position in stars' IRF (dev only) */
function updateShip(ship) {
    let x = ship.pos[1];
    let y = ship.pos[2];
    ship.widget.setAttribute("transform", `translate(${x},${y})`);
}


/** Change ship's position over a small time interval */
function stepShip(ship, dtau) {
    addAssign(ship.pos, dot_0_i(dtau, ship.vel));  // x += dx/dtau*dtau
    addAssign(ship.vel, dot_0_i(dtau, ship.acc));  // v += dv/dtau*dtau

    // v = - dxy/dtau / dt/dtau = - dxy/dt
    let v = dot_0_i(-1/ship.vel[0], ship.vel.slice(1, 3));
    let Linv = lorentz(v);
    ship.acc = dot_ij_j(Linv, ship.ownAcc);

    // Adjust 4-velocity so that |u| = -1 (this a numeric correction)
    ship.vel = dot_ij_j(Linv, [1, 0, 0]);
}


/** Update the simulation and the interface */
function updateFrame(timestamp, previousTimestamp, state) {
    updateFPS(state);
    let dtau = dProperTime(timestamp, previousTimestamp);
    state.ship.ownTime += dtau;
    state.ship.ownAcc = scheduledAcc(state.ship.ownTime);
    stepShip(state.ship, dtau);
    updateAllClocks(state);
    updateShip(state.ship);
    window.requestAnimationFrame(t => updateFrame(t, timestamp, state));
}


/** Get initial position of an SVG element */
function initPos(svg) {
    let m = svg.transform.baseVal.consolidate().matrix;
    return [0, m.e, m.f];
}


/** Initialize the simulation */
function init() {
    let ship = document.getElementById("ship");
    let stars = [];
    for (let star of document.querySelectorAll(".star")) {
        stars.push({
            widget: star,
            pos: initPos(star),
        });
    }

    let state = {
        fps: 0,
        timer: Math.floor(Date.now()/1000),
        stars: stars,
        ship: {
            widget: ship,
            analogClock: document.getElementById("analog-clock"),
            digitalClock: document.getElementById("digital-clock"),
            ownTime: 0,          // Proper time
            pos: initPos(ship),  // displacement, stars' IRF
            vel: [1, 0, 0],      // 4-velocity, stars' IRF
            acc: [0, 0, 0],      // 4-acceleration, stars' IRF
            ownAcc: [0, 0, 0],   // 4-acceleration, ship's non-rotated IRF
        },
    };
    window.requestAnimationFrame(t => updateFrame(t, 0, state));
}


window.onload = init;

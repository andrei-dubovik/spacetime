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


/** Substract one vector from another */
function sub(a1, a2) {
    if (a1.length != a2.length) {
        throw new Error("Non-conformant arrays");
    }
    let a0 = [];
    for (let i = 0; i < a1.length; i++) {
        a0[i] = a1[i] - a2[i];
    }
    return a0;
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


/** Rotate an attitude vector by a given angle */
function rotateAtt(att, angle) {
    let cos = Math.cos(angle);
    let sin = Math.sin(angle);
    let R = [[cos, -sin], [sin, cos]];
    return dot_ij_j(R, att);
}


/** Compute the angle of an attitude vector */
function attAngle(att) {
    return Math.atan2(att[1], att[0])*180/Math.PI;
}


/** Set rotation of an SVG element */
function setAngle(svg, angle) {
    svg.setAttribute("transform", `rotate(${angle})`);
}


/** Set position of an SVG element */
function setPosition(svg, x, y) {
    // We add rotate(0.1) becuause no clock is ever hanged straight
    // (resolves choppy animation in Firefox)
    svg.setAttribute("transform", `translate(${x},${y}) rotate(0.1)`);
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
function setClock(clock, time) {
    let minutes = time % 60;  // 1 minute ticks as 1 second
    let hours = (time / 60) % 12;
    let minuteHand = clock.querySelector(".minute-hand");
    if (minuteHand != null) {
        // Analog clock
        let hourHand = clock.querySelector(".hour-hand");
        setAngle(minuteHand, minutes*6);
        setAngle(hourHand, hours*30);
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


/** Set a text gauge to a given value */
function setGauge(gauge, value) {
    let text = value.toFixed(2);
    if (gauge.innerHTML != text) {
        gauge.innerHTML = text;
    }
}


/** Update all dashboard gauges */
function updateDashboard(ship) {
    // Time
    for (let clock of ship.dashboard.time) {
        setClock(clock, ship.ownTime);
    }

    // Acceleration
    let acc = Math.hypot(ship.ownAcc[1], ship.ownAcc[2]);
    for (let gauge of ship.dashboard.acc) {
        setGauge(gauge, acc);
    }

    // Speed
    let vel = threeVelocity(ship.vel);
    let speed = Math.hypot(vel[0], vel[1]);
    for (let gauge of ship.dashboard.speed) {
        setGauge(gauge, speed);
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


/** Compose 4-acceleration from 1-acceleration and an attitude vector */
function composeAcc(acc, att) {
    return [0, acc*att[0], acc*att[1]];
}


/** Compute 3-velocity from 4-velocity */
function threeVelocity(vel) {
    // v = dxy/dtau / dt/dtau = dxy/dt
    return dot_0_i(1/vel[0], vel.slice(1, 3));
}


/** Change ship's position over a small time interval */
function stepShip(ship, dtau) {
    addAssign(ship.pos, dot_0_i(dtau, ship.vel));  // x += dx/dtau*dtau
    addAssign(ship.vel, dot_0_i(dtau, ship.acc));  // v += dv/dtau*dtau
    let Linv = lorentz(dot_0_i(-1, threeVelocity(ship.vel)));
    ship.acc = dot_ij_j(Linv, ship.ownAcc);

    // Adjust 4-velocity so that |u| = -1 (this a numeric correction)
    ship.vel = dot_ij_j(Linv, [1, 0, 0]);
}


/** Intersect ship's simultenaity plane with stars' worldlines */
function currentStarPos(ship, stars) {
    let v = dot_0_i(1/ship.vel[0], ship.vel.slice(1, 3));
    let L = lorentz(v);
    let A = [
        [L[0][0], L[0][1], L[0][2], -1,  0,  0],
        [L[1][0], L[1][1], L[1][2],  0, -1,  0],
        [L[2][0], L[2][1], L[2][2],  0,  0, -1],
        [      0,       0,       0,  1,  0,  0],
        [      0,       1,       0,  0,  0,  0],
        [      0,       0,       1,  0,  0,  0],
    ];
    let p = luFactorize(A);
    let view = [];
    for (let star of stars) {
        let y = sub(star.pos, ship.pos);
        let b = [0, 0, 0, 0, y[1], y[2]];
        let x = luSolve(A, p, b);
        view.push({
            widget: star.widget,
            pos: [x[0] + ship.pos[0], x[4], x[5]],
        });
    }
    return view;
}


/** Update relative position of stars and their clocks (poor poor Captain Hook) */
function drawStars(stars) {
    for (let star of stars) {
        setClock(star.widget, star.pos[0]);
        setPosition(star.widget, star.pos[1], star.pos[2]);
    }
}


/** Update ship's dashboard and ship's orientation */
function drawShip(ship) {
    updateDashboard(ship);
    setAngle(ship.widget, attAngle(ship.att));
}


/** Update the simulation and the interface */
function drawFrame(timestamp, previousTimestamp, state) {
    updateFPS(state);
    let dtau = dProperTime(timestamp, previousTimestamp);
    state.ship.ownTime += dtau;
    let [acc, att] = state.ship.program(state.ship.ownTime);
    state.ship.att = att;
    state.ship.ownAcc = composeAcc(acc, att);
    stepShip(state.ship, dtau);
    drawShip(state.ship);
    drawStars(currentStarPos(state.ship, state.stars));
    window.requestAnimationFrame(t => drawFrame(t, timestamp, state));
}


/** A program with no acceleration and no rotation */
function freefallProgram(att, duration = Infinity) {
    return t => t < duration ? [0, att] : null;
}


/** A rotation program with a fixed maximum jerk */
function rotateProgram(att, angle) {
    let T = Math.abs(angle/Math.PI)**(1/3);
    let a = 2*Math.PI/T;
    let b = angle/(2*Math.PI);
    return t => t < T ? [0, rotateAtt(att, b*(a*t - Math.sin(a*t)))] : null;
}


/** A program consisting of a sequence of subprograms */
function compositeProgram(programs) {
    let k = 0;
    let t0 = null;
    return t => {
        if (t0 === null) {
            t0 = t;
        }
        while (k < programs.length) {
            let r = programs[k](t - t0);
            if (r !== null) {
                return r;
            }
            t0 = t;
            k++;
        }
        return null;
    }
}


/** Get initial position of an SVG element */
function initPos(svg) {
    let m = svg.transform.baseVal.consolidate().matrix;
    return [0, m.e, m.f];
}


/** Get initial orientation of an SVG element */
function initAtt(svg) {
    let m = svg.transform.baseVal.consolidate().matrix;
    return [m.a, m.b];
}


/** A handler for a mousedown event on a star */
function mousedownStar(star, state) {
    if (state.ship.status == "freefall") {
        let x = star.pos;
        let y = state.ship.pos;
        // Don't allow current star as a destination
        if ((x[1] - y[1])**2 + (x[2] - y[2])**2 > 9) {
            let focus = star.widget.querySelector(".focus");
            focus.style.opacity = "1";
            setTimeout(() => focus.style.opacity = "0", 80);
        }
    }
}


/** Initialize the simulation */
function init() {
    let ship = document.getElementById("ship");
    let att = initAtt(ship);
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
            status: "freefall",
            program: freefallProgram(att),
            widget: ship,
            dashboard: {
                time: [
                    document.getElementById("analog-clock"),
                    document.getElementById("digital-clock"),
                ],
                acc: document.querySelectorAll(".db-acc"),
                speed: document.querySelectorAll(".db-speed"),
            },
            ownTime: 0,          // Proper time
            pos: initPos(ship),  // displacement, stars' IRF
            vel: [1, 0, 0],      // 4-velocity, stars' IRF
            acc: [0, 0, 0],      // 4-acceleration, stars' IRF
            ownAcc: [0, 0, 0],   // 4-acceleration, ship's non-rotated IRF
            att: att,            // attitude vector
        },
    };

    // Add event listeners to stars
    for (let star of stars) {
        star.widget.querySelector("use").addEventListener(
            "mousedown",
            event => mousedownStar(star, state),
        );
    }

    window.requestAnimationFrame(t => drawFrame(t, 0, state));
}


window.onload = init;

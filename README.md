# Introduction

This repository contains a flat spacetime simulator, written in JavaScript. The simulator is hosted live at <https://twinparadox.org>. Some additional information about the simulation is given as Q&A below.

# Q&A

### Why?

As a big sci-fi fan, I was never content with physicists telling me I cannot have superluminal communication. So, what better way to convince myself that superluminal communication leads to contradictions than to make a multiplayer sim that follows the laws of special relativity? After all, if the players call one another on Discord, it would be like superlimunal communication, right? Fortunately, in a moment of pragmatism, the effort got limited to a simple single player sim.

### What does the map show?

The map shows the stars and their clocks where they are "now" from the perspective of the ship. More precisely, at any given moment of proper time, consider an inertial reference frame tangent to the ship's world line. In a flat spacetime, this tangent reference frame can be used globally. By setting the time coordinate to zero, we obtain a plane of all those events that are happening "simultaneously" from the ship's perspective. The map shows spacetime points, i.e. events, where the stars' world lines intersect this simultaneity plane. Of course, a global simultaneity plane is a technical construct, which breaks down if we move to a curved spacetime, and so my physics book says it shouldn't be taken seriously.

### What's wrong with all the clocks?

Each clock has a "minute" hand and an "hour" hand. The "minute" hand ticks every second, and the "hour" hand ticks in accordance with the "minute" hand. I thought, the hour and minute hands made it easier to see the progress of time than the minute and second hands. But if the hour and minute hands were to tick at their normal speed, it would have taken forever to fly a ship between the stars... So, in a stroke of "genius," I used the "hour" and "minute" hands but sped them up so that the "minute" hand ticks every second.

### Why can't I fly to arbitrary locations?

Because arbitrary route planning in real time in JavaScript is all work and little fun.

### What about co-op?

It can be done. Instead of synchronizing the ship's clock with the computer clock, which is done now, one can synchronize stars' clocks with the computer clock. That will introduce a preferred reference frame, thus going against the spirit of relativity, and will give a consistent co-op. Consistent in a way that if player A sees himself meeting player B, then player B will also see himself meeting player A. Moreover, if they meet at a star, both will agree on that stars' clock. In this setting, the four sim clocks, as well as the computer clock, will all be ticking at different speeds. It will be very bizarre. Probably too bizarre to seriously consider programming it.

### What happened to the giant laser?

The captain insisted on having the latest Nvidia card on-board. No power remained for the giant laser.

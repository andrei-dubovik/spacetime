"""Small exercises and computations on acceleration in special relativity."""

import numpy as np
import matplotlib.pyplot as plt

# Units:
# 1 distance = 1 lightsecond
# 1 time = 1 second

N = 1000  # grid size
GRAPH = False
#ACCEL = 'constant'
ACCEL = 'hyperbolic'
#ACCEL = 'hyperbolic2'  # No coasting phase


def integrate(f, t):
    """Numeric midpoint integration."""
    dt = t[1:] - t[:-1]
    s = np.cumsum((f[1:] + f[:-1])*dt/2)
    return np.hstack(([0], s))


def lorentz(v, t, x):
    """Apply the Lorentz transformation to (t,x)."""
    g = 1/np.sqrt(1-v**2)
    l = np.array([[g, -g*v], [-g*v, g]])
    t_, x_ = np.einsum('ijk,jk->ik', l, np.vstack((t,x)))
    return t_, x_


def hyper(t):
    """Compute hyperbolic acceleration."""
    k = 50  # some parameter...
    t2 = t**2
    return (t2 + k)**(-0.5) - (t2 + k)**(-1.5)*t2


# Preferred frame of reference (non-accelerating observer).
# For brevity, let's just call it Earth.
# Acceleration, speed, etc. are for the accelerating observer. Let's call him ship.
# A basic setup: there and back again, given acceleration from the
# perspective of Earth.
t = np.linspace(0, 40, N)
if ACCEL == 'constant':
    a = 0.1*(t <= 7) + -0.1*(t >= 13)*(t <= 27) + 0.1*(t >= 33)
elif ACCEL == 'hyperbolic':
    a = hyper(t)*(t <= 7) - hyper(t-20)*(t >= 13)*(t <= 27) + hyper(t-40)*(t >= 33)
elif ACCEL == 'hyperbolic2':
    a = hyper(t)*(t <= 10) - hyper(t-20)*(t > 10)*(t <= 30) + hyper(t-40)*(t > 30)
else:
    raise RuntimeError("Wrong acceleration type")
v = integrate(a, t)
x = integrate(v, t)

if GRAPH:
    fig, axis = plt.subplots()
    axis.set_title("Ship speed (Earth reference frame)")
    axis.set_xlabel("Earth time")
    axis.plot(t, v)
    fig.show()

    fig, axis = plt.subplots()
    axis.set_title("Ship position (Earth reference frame)")
    axis.set_xlabel("Earth time")
    axis.plot(t, x)
    fig.show()

# Ship's proper time
# We integrate dt_ to compute t_. Note that the integration is done from the
# perspective of the preferred intertial frame of reference. We can't do
# integration from the perspective of the accelerating body, because its
# tangent IRFs don't overlap, hence integration or differentiation operations
# are ill defined.
dt = t[1:] - t[:-1]
dx = x[1:] - x[:-1]
mv = (v[1:] + v[:-1])/2  # use middle velocity for numerical accuracy
dt_, dx_ = lorentz(mv, dt, dx)
assert np.all(np.abs(dx_) < 1e-14)  # for N == 1000
t_ = np.hstack(([0], np.cumsum(dt_)))

if GRAPH:
    fig, axis = plt.subplots()
    axis.set_title("Time on the ship (Earth reference frame)")
    axis.set_xlabel("Earth time")
    axis.axline([0, 0], [1, 1], c="lightgray")
    axis.plot(t, t_)
    fig.show()

# For no-coasting proper constant acceleration I've found formulas online:
# https://fenix.tecnico.ulisboa.pt/downloadFile/1407770020544755/resumo.pdf
if ACCEL == 'hyperbolic2':
    T = t[-1]
    zeta = a0*T
    t_f = (
        + T/zeta*np.arcsinh(zeta*t/T)*(t <= 10)
        + (T/zeta*np.arcsinh(zeta*(t/T - 0.5)) + 2*T/zeta*np.arcsinh(zeta/4))*(t > 10)*(t <= 30)
        + (T/zeta*np.arcsinh(zeta*(t/T - 1)) + 4*T/zeta*np.arcsinh(zeta/4))*(t > 30)
    )
    assert np.max(np.abs(t_ - t_f)) < 1e-2  # for N == 1000

    if GRAPH:
        fig, axis = plt.subplots()
        axis.set_title("Time on the ship (Earth reference frame)")
        axis.set_xlabel("Earth time")
        axis.axline([0, 0], [1, 1], c="lightgray")
        axis.plot(t, t_, label="numeric")
        axis.plot(t, t_f, color="red", label="formula")
        fig.show()


# Distance travelled (ship's perspective).
# Distanse is independent from the spacetime past trajectery given current
# spacetime location, and can simply be computed from length contraction given
# speed.
x_ = np.sqrt(1 - v**2)*x

# Note that the following is wrong, because we can't integrate from the
# perspective of an accelerating frame:
# x_ = integrate(v, t_)  # wrong

# Earth time as seen by the ship.
# We compute t__ from the following 2x2 system of linear equations:
# (0, -x_) = lorentz(v, t__ - t, -x)
t__ = t - v*x

# When we're back, differences in clocks should be the same
assert abs((t[-1] - t_[-1]) - (t__[-1] - t_[-1])) < 1e-3  # for N == 1000

# Note: I couldn't really find any formulas online to double check t__

if GRAPH:
    fig, axis = plt.subplots()
    axis.set_title("Time on Earth (Ship reference frame)")
    axis.set_xlabel("Ship time")
    axis.axline([0, 0], [1, 1], c="lightgray")
    axis.plot(t_, t__)
    fig.show()

# Ship's proper acceleration
# Say, A -- B -- C. We use B as IRF, and compute second differentials
# as (C-B) - (B-A)
dt_0, dx_0 = lorentz(v[1:-1], dt[:-1], dx[:-1])
dt_1, dx_1 = lorentz(v[1:-1], dt[1:], dx[1:])
d2x_ = dx_1 - dx_0
dt2_ = ((dt_0 + dt_1)/2)**2
a_ = d2x_/dt2_

# Using formula (also valid for non-constant acceleration)
a_f = (1/np.sqrt(1-v**2))**3*a
assert np.mean(np.abs(a_ - a_f[1:-1])) < 1e-3  # but big differences at turning points

if GRAPH:
    fig, axis = plt.subplots()
    axis.set_title("Proper acceleration (Ship reference frame)")
    axis.set_xlabel("Ship time")
    axis.plot(t_[1:-1], a_, label="numeric")
    axis.plot(t_[1:-1], a_f[1:-1], color="red", label="formula")
    fig.legend()
    fig.show()

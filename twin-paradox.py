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

# Alternatively, we can compute t_ from spacetime interval invariance
t_inv = np.hstack(([0], np.cumsum(np.sqrt(dt**2 - dx**2))))

if GRAPH:
    fig, axis = plt.subplots()
    axis.set_title("Time on the ship (Earth reference frame)")
    axis.set_xlabel("Earth time")
    axis.axline([0, 0], [1, 1], c="lightgray")
    axis.plot(t, t_, label="lorentz")
    axis.plot(t, t_, color="red", label="st int inv")
    fig.show()

# For no-coasting proper constant acceleration I've found formulas online:
# https://fenix.tecnico.ulisboa.pt/downloadFile/1407770020544755/resumo.pdf
if ACCEL == 'hyperbolic2':
    T = t[-1]
    zeta = a[0]*T
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

# The above solution is a bit specific. A more general solutions is as follows.
# We consider the simultaneity plane of the ship, and search for its
# intersection with the Earth's worldine, parametrized by lambda. In case of a
# single spatial dimension, it's a 3x3 system, and in case of two spatial
# dimensions, it's a 4x4 system. The intersection point gives us the distance
# to Earth as seen by the ship, as well as the "now" time on Earth (when we
# translate the point to the Earth's coordinate system).

# (There is some unnecessary numpy Kung Fu in what follows, because we solve N
# linear equations in one go. A loop would have been easier to write,
# easier to read, and also more efficient.)

# Earth wordline at moment i in an Earth's reference frame but shifted to
# ship's location, xx(lambda) = q[i]*lambda + b[i], where xx = (t, x)
e1 = np.repeat(1, N)
e0 = np.repeat(0, N)
q = np.moveaxis(np.array([[e1], [e0]]), -1, 0)
b = np.moveaxis(np.array([[e0], [-x]]), -1, 0)

# Ship's simultaneity plane in ship's reference frame, i.e. t' == 0. For any
# plane passing through origin we have d @ xx' == 0. In our case, d[i] = [1 0].
d = np.moveaxis(np.array([e1, e0]), -1, 0)[:,None,:]

# Lorentz matrices
g = 1/np.sqrt(1 - v**2)
L = np.moveaxis(np.array([[g, -g*v], [-g*v, g]]), -1, 0)

# Now we put all the matrices together and solve for the intersection of Earth
# worldine and ship simultaneity plane (in ship's reference frame), for all i.
A = np.block([[np.tile(np.eye(2), [N,1,1]), -L@q], [d, e0[:,None,None]]])
B = np.block([[L@b], [e0[:,None,None]]])
z_ = np.linalg.solve(A, B)  # [t' === 0, x', lambda]

# If we translate the coordinates back to the Earth frame, we get the time and
# location on Earth
z = np.linalg.solve(L, z_[:,:2,:]) + np.moveaxis(np.array([[t], [x]]), -1, 0)
#   ------------------------------   ----------------------------------------
#              rotation                            translation

# Both the specific and the general methods should give the same anwer
assert np.max(np.abs(-z_[:,1,0] - x_)) < 1e-14  # for N == 1000
assert np.max(np.abs(z[:,0,0] - t__)) < 1e-14  # for N == 1000

# Furthemore, Earth location according to Earth should be 0
assert np.max(np.abs(z[:,1,0] - 0)) < 1e-14

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

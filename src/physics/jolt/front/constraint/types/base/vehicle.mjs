import { Curve, Entity } from 'playcanvas';
import { BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT32 } from '../../../../constants.mjs';
import { Debug } from '../../../../debug.mjs';
import { Constraint, applyOptions } from './constraint.mjs';

function writeCurvePoints(cb, curve) {
    cb.write(!!curve, BUFFER_WRITE_BOOL, false);

    if (curve) {
        const keys = curve.keys;
        const count = keys.length;

        cb.write(count, BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < keys.length; i++) {
            const key = keys[i];

            cb.write(key[0], BUFFER_WRITE_FLOAT32, false);
            cb.write(key[1], BUFFER_WRITE_FLOAT32, false);
        }
    }
}

function writeGears(cb, gears) {
    const count = gears.length;
    cb.write(count, BUFFER_WRITE_UINT32, false);
    for (let i = 0; i < count; i++) {
        cb.write(gears[i], BUFFER_WRITE_FLOAT32, false);
    }
}

class Vehicle extends Constraint {
    // Used only when the constraint is active. Override for the number of solver
    // velocity iterations to run, 0 means use the default in PhysicsSettings.numVelocitySteps.
    // The number of iterations to use is the max of all contacts and constraints in the island.
    _numVelocityStepsOverride = 0;

    // Used only when the constraint is active. Override for the number of solver
    // position iterations to run, 0 means use the default in PhysicsSettings.numPositionSteps.
    // The number of iterations to use is the max of all contacts and constraints in the island.
    _numPositionStepsOverride = 0;

    // Vector indicating the up direction of the vehicle (in local space to the body)
    _up = Vec3.UP;

    // Vector indicating forward direction of the vehicle (in local space to the body)
    _forward = Vec3.BACK;

    // Defines the maximum pitch/roll angle (rad), can be used to avoid the car from getting upside
    // down. The vehicle up direction will stay within a cone centered around the up axis with half
    // top angle maxPitchRollAngle, set to pi to turn off. Defaults to ~1.04 rad (60 degrees)
    _maxPitchRollAngle = 1.0471975511965976;

    // An array of arrays. Each array represents a track and lists indices of wheels that are inside
    // that track. The last element in each track array will become a driven wheel (an index that points
    // to a wheel that is connected to the engine).
    // Example with 2 tracks, and each having 4 wheels: [[0, 1, 2, 3], [4, 5, 6, 7]]
    _tracks = [];

    // An array of objects that describe each wheel. See _writeWheelsData().
    _wheels = [];

    // Vehicle type. Can be wheeled (VEHICLE_TYPE_WHEEL) or tracked (VEHICLE_TYPE_TRACK).
    _type = VEHICLE_TYPE_WHEEL;

    // Max amount of torque (Nm) that the engine can deliver.
    _maxTorque = 500;

    // Min amount of revolutions per minute (rpm) the engine can produce without stalling.
    _minRPM = 1000;

    // Max amount of revolutions per minute (rpm) the engine can generate.
    _maxRPM = 6000;

    // Moment of inertia (kg m^2) of the engine.
    _inertia = 0.5;

    // Angular damping factor of the wheel: dw/dt = -c * w.
    _wheelAngularDamping = 0.2;

    // Curve that describes a ratio of the max torque the engine can produce vs the fraction of the max RPM of the engine.
    _normalizedTorque = new Curve([0, 0.8]);

    // How to switch gears.
    _mode = TRANSMISSION_AUTO;

    // Ratio in rotation rate between engine and gear box, first element is 1st gear, 2nd element 2nd gear etc.
    _gearRatios = [2.66, 1.78, 1.3, 1, 0.74];

    // Ratio in rotation rate between engine and gear box when driving in reverse.
    _reverseGearRatios = [-2.9];

    // How long it takes to switch gears (s), only used in auto mode.
    _switchTime = 0.5;

    // How long it takes to release the clutch (go to full friction), only used in auto mode
    _clutchReleaseTime = 0.3;

    // How long to wait after releasing the clutch before another switch is attempted (s), only used in auto mode.
    _switchLatency = 0.5;

    // If RPM of engine is bigger then this we will shift a gear up, only used in auto mode.
    _shiftUpRPM = 4000;

    // If RPM of engine is smaller then this we will shift a gear down, only used in auto mode.
    _shiftDownRPM = 2000;

    // Strength of the clutch when fully engaged. Total torque a clutch applies is
    // Torque = ClutchStrength * (Velocity Engine - Avg Velocity Wheels At Clutch) (units: k m^2 s^-1)
    _clutchStrength = 10;

    // List of differentials and their properties
    _differentials = [];

    // Used when vehicle is of wheeled type. Ratio max / min average wheel speed of each differential
    // (measured at the clutch). When the ratio is exceeded all torque gets distributed to the differential
    // with the minimal average velocity. This allows implementing a limited slip differential between
    // differentials. Set to Number.MAX_VALUE for an open differential. Value should be > 1.
    _differentialLimitedSlipRatio = 1.4;

    // An anti rollbar is a stiff spring that connects two wheels to reduce the amount of roll the
    // vehicle makes in sharp corners See: https://en.wikipedia.org/wiki/Anti-roll_bar
    _antiRollBars = [];

    // Collision tester that tests wheels collision.
    // - VEHICLE_CAST_TYPE_RAY
    // - VEHICLE_CAST_TYPE_SPHERE
    // - VEHICLE_CAST_TYPE_CYLINDER
    _castType = VEHICLE_CAST_TYPE_RAY;

    // Object layer to test collision with.
    _castObjectLayer = OBJ_LAYER_MOVING;

    // World space up vector, used to avoid colliding with vertical walls.
    _castUp = Vec3.UP;

    // Max angle (rad) that is considered for colliding wheels. This is to avoid colliding
    // with vertical walls. Defaults to ~1.4 rad (80 degrees).
    _castMaxSlopeAngle = 1.3962634015954636;

    // Sets the radius of the sphere used in cast.
    _castRadius = 0.3;

    // Fraction of half the wheel width (or wheel radius if it is smaller) that is used as the convex radius
    _castFraction = 0.1;

    constructor(opts = {}) {
        super();

        applyOptions(this, opts);
    }

    write(cb) {
        if ($_DEBUG) {
            let ok = Debug.checkVec(this._up, `Invalid up vector`, this._up);
            ok = ok && Debug.checkVec(this._forward, `Invalid forward vector`, this._forward);
            ok = ok && Debug.checkFloat(this._maxPitchRollAngle, `Invalid angle scalar`, this._maxPitchRollAngle);
            // TODO
        }

        // general vehicle data
        cb.write(this._up, BUFFER_WRITE_VEC32, false);
        cb.write(this._forward, BUFFER_WRITE_VEC32, false);
        cb.write(this._maxPitchRollAngle, BUFFER_WRITE_FLOAT32, false);

        // engine data
        cb.write(this._maxTorque, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._minRPM, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxRPM, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._inertia, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._wheelAngularDamping, BUFFER_WRITE_FLOAT32, false);
        writeCurvePoints(cb, this._normalizedTorque);

        // transmission data
        cb.write(this._mode, BUFFER_WRITE_UINT8, false);
        cb.write(this._switchTime, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._clutchReleaseTime, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._switchLatency, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._shiftUpRPM, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._shiftDownRPM, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._clutchStrength, BUFFER_WRITE_FLOAT32, false);
        writeGears(cb, this._gearRatios);
        writeGears(cb, this._reverseGearRatios);
    }
}
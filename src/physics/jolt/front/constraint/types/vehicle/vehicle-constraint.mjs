import { Constraint } from '../constraint.mjs';
import { Debug } from '../../../../debug.mjs';
import { Curve, Vec3 } from 'playcanvas';
import {
    BUFFER_READ_FLOAT32,
    BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT32, BUFFER_WRITE_UINT8,
    BUFFER_WRITE_VEC32, CMD_VEHICLE_SET_INPUT, CONSTRAINT_TYPE_VEHICLE_MOTO,
    CONSTRAINT_TYPE_VEHICLE_WHEEL, FLOAT32_SIZE, OBJ_LAYER_MOVING, OPERATOR_MODIFIER,
    TRANSMISSION_AUTO, VEHICLE_CAST_TYPE_CYLINDER, VEHICLE_CAST_TYPE_RAY, VEHICLE_CAST_TYPE_SPHERE
} from '../../../../constants.mjs';

/**
 * Base class for different types of vehicles.
 *
 * @group Utilities
 * @category Vehicle Constraints
 */
class VehicleConstraint extends Constraint {
    static defaultLateralFrictionCurve = new Curve([0, 0, 3, 1.2, 20, 1]);

    static defaultLongitudinalFrictionCurve = new Curve([0, 0, 0.06, 1.2, 0.2, 1]);

    static defaultNormalizedTorque = new Curve([0, 0.8]);

    _entity = null;

    _up = Vec3.UP;

    _forward = Vec3.BACK;

    _maxPitchRollAngle = 1.0471975511965976;

    _wheels = [];

    _maxTorque = 500;

    _minRPM = 1000;

    _maxRPM = 6000;

    _inertia = 0.5;

    _wheelAngularDamping = 0.2;

    _normalizedTorque = null;

    _mode = TRANSMISSION_AUTO;

    _gearRatios = [2.66, 1.78, 1.3, 1, 0.74];

    _reverseGearRatios = [-2.9];

    _switchTime = 0.5;

    _clutchReleaseTime = 0.3;

    _switchLatency = 0.5;

    _shiftUpRPM = 4000;

    _shiftDownRPM = 2000;

    _clutchStrength = 10;

    _antiRollBars = [];

    _castType = VEHICLE_CAST_TYPE_RAY;

    _castObjectLayer = OBJ_LAYER_MOVING;

    _castUp = Vec3.UP;

    _castMaxSlopeAngle = 1.3962634015954636;

    _castRadius = 0.3;

    _castFraction = 0.1;

    constructor(entity, opts = {}) {
        super();

        this._entity = entity;
        this._normalizedTorque = opts.normalizedTorque ||
            VehicleConstraint.defaultNormalizedTorque;
    }

    /**
     * An anti rollbar is a stiff spring that connects two wheels to reduce the amount of roll the
     * vehicle makes in sharp corners See: {@link https://en.wikipedia.org/wiki/Anti-roll_bar |
     * Anti-roll Bar}
     *
     * @type {Array<import('../settings.mjs').BarSettings>}
     * @defaultValue []
     */
    get antiRollBars() {
        return this._antiRollBars;
    }

    /**
     * Fraction of half the wheel width (or wheel radius if it is smaller) that is used as the
     * convex radius.
     *
     * @returns {number} Cast fraction.
     * @defaultValue 0.1
     */
    get castFraction() {
        return this._castFraction;
    }

    /**
     * Max angle that is considered for colliding wheels. This is to avoid colliding with vertical
     * walls.
     * @returns {number} Angle in radians.
     * @defaultValue ~1.4 rad (80 degrees).
     */
    get castMaxSlopeAngle() {
        return this._castMaxSlopeAngle;
    }

    /**
     * Object layer to test collision with.
     *
     * @returns {number} Object layer number.
     * @defaultValue OBJ_LAYER_MOVING
     */
    get castObjectLayer() {
        return this._castObjectLayer;
    }

    /**
     * Sets the radius of the sphere used in cast. Note, that {@link castType} needs to be set to
     * `VEHICLE_CAST_TYPE_SPHERE` for this to be used.
     *
     * @returns {number} Sphere radius.
     * @defaultValue 0.3 (m)
     */
    get castRadius() {
        return this._castRadius;
    }

    /**
     * Collision tester that tests wheels collision. Following types available:
     * ```
     * VEHICLE_CAST_TYPE_RAY
     * ```
     * ```
     * VEHICLE_CAST_TYPE_SPHERE
     * ```
     * ```
     * VEHICLE_CAST_TYPE_CYLINDER
     * ```
     *
     * @returns {number} Cast type number.
     * @defaultValue VEHICLE_CAST_TYPE_RAY
     */
    get castType() {
        return this._castType;
    }

    /**
     * World space up vector, used to avoid colliding with vertical walls.
     *
     * @returns {Vec3} Cast world up vector.
     * @defaultValue Vec3(0, 1, 0)
     */
    get castUp() {
        return this._castUp;
    }

    /**
     * How long it takes to release the clutch (go to full friction), only used when {@link mode}
     * is set to `TRANSMISSION_AUTO`.
     *
     * @returns {number} Clutch release time.
     * @defaultValue 0.3 (s)
     */
    get clutchReleaseTime() {
        return this._clutchReleaseTime;
    }

    /**
     * Strength of the clutch when fully engaged. Total torque a clutch applies is
     * ```
     * Torque = ClutchStrength * (Velocity Engine - Avg Velocity Wheels At Clutch)
     * ```
     *
     * @returns {number} Clutch strength
     * @defaultValue 10 (k m^2 s^-1)
     */
    get clutchStrength() {
        return this._clutchStrength;
    }

    /**
     * The PlayCanvas Entity that is used as a visual model for the vehicle body. Its position and
     * rotation will automatically be updated to match the physical body.
     *
     * @returns {import('playcanvas').Entity | null} Entity or `null` if none is set.
     * @defaultValue null
     */
    get entity() {
        return this._entity;
    }

    /**
     * Vector indicating forward direction of the vehicle (in local space to the body).
     *
     * @returns {Vec3} Vehicle forward vector.
     * @defaultValue Vec3(0, 0, 1)
     */
    get forward() {
        return this._forward;
    }

    /**
     * Ratio in rotation rate between engine and gear box, first element is 1st gear, 2nd element
     * 2nd gear etc.
     *
     * @returns {Array<number>} Array of gears.
     * @defaultValue [2.66, 1.78, 1.3, 1, 0.74]
     */
    get gearRatios() {
        return this._gearRatios;
    }

    /**
     * Moment of inertia of the engine.
     *
     * @returns {number} Moment of inertia.
     * @defaultValue 0.5 (kg m^2)
     */
    get inertia() {
        return this._inertia;
    }

    /**
     * Defines the maximum pitch/roll angle, can be used to avoid the car from getting upside down.
     * The vehicle up direction will stay within a cone centered around the up axis with half top
     * angle maxPitchRollAngle, set to pi to turn off.
     *
     * @returns {number} Max pitch/roll angle in radians.
     * @defaultValue ~1.04 rad (60 degrees)
     */
    get maxPitchRollAngle() {
        return this._maxPitchRollAngle;
    }

    /**
     * Max amount of revolutions per minute the engine can generate.
     *
     * @returns {number} Max RPM.
     * @defaultValue 6000 (RPM)
     */
    get maxRPM() {
        return this._maxRPM;
    }

    /**
     * Max amount of torque that the engine can deliver.
     *
     * @returns {number} Max torque.
     * @defaultValue 500 (Nm)
     */
    get maxTorque() {
        return this._maxTorque;
    }

    /**
     * Min amount of revolutions per minute the engine can produce without stalling.
     *
     * @returns {number} Min RPM.
     * @defaultValue 1000 (RPM)
     */
    get minRPM() {
        return this._minRPM;
    }

    /**
     * How to switch gears. Following modes available:
     * ```
     * TRANSMISSION_AUTO
     * ```
     * ```
     * TRANSMISSION_MANUAL
     * ```
     *
     * @returns {number} Gear switch mode.
     * @defaultValue TRANSMISSION_AUTO
     */
    get mode() {
        return this._mode;
    }

    /**
     * Curve that describes a ratio of the max torque the engine can produce vs the fraction of
     * the max RPM of the engine.
     *
     * @returns {Curve | null} Ratio curve.
     * @defaultValue Curve([0, 0.8])
     */
    get normalizedTorque() {
        return this._normalizedTorque;
    }

    /**
     * Ratio in rotation rate between engine and gear box when driving in reverse.
     *
     * @returns {Array<number>} Rotation ratios.
     * @defaultValue [-2.9]
     */
    get reverseGearRatios() {
        return this._reverseGearRatios;
    }

    /**
     * If RPM of engine is smaller then this we will shift a gear down, only used when {@link mode}
     * is set to `TRANSMISSION_AUTO`.
     *
     * @returns {number} Lower RPM threshold.
     * @defaultValue 2000 (RPM)
     */
    get shiftDownRPM() {
        return this._shiftDownRPM;
    }

    /**
     * If RPM of engine is bigger then this we will shift a gear up, only used when {@link mode}
     * is set to `TRANSMISSION_AUTO`.
     *
     * @returns {number} Upper RPM threshold.
     * @defaultValue 4000 (RPM)
     */
    get shiftUpRPM() {
        return this._shiftUpRPM;
    }

    /**
     * How long to wait after releasing the clutch before another switch is attempted (s), only
     * used when {@link mode} is set to `TRANSMISSION_AUTO`.
     *
     * @returns {number} Clutch switch time.
     * @defaultValue 0.5 (s)
     */
    get switchLatency() {
        return this._switchLatency;
    }

    /**
     * How long it takes to switch gears, only used only used when {@link mode} is set to
     * `TRANSMISSION_AUTO`.
     *
     * @returns {number} Gear switch time.
     * @defaultValue 0.5 (s)
     */
    get switchTime() {
        return this._switchTime;
    }

    /**
     * Vector indicating the up direction of the vehicle (in local space to the body).
     *
     * @returns {Vec3} Vehicle up vector.
     * @defaultValue Vec3(0, 1, 0)
     */
    get up() {
        return this._up;
    }

    /**
     * Angular damping factor of the wheel:
     * ```
     * dw/dt = -c * w
     * ```
     *
     * @returns {number} Angular damping.
     * @defaultValue 0.2
     */
    get wheelAngularDamping() {
        return this._wheelAngularDamping;
    }

    /**
     * An array of objects that describe each wheel.
     *
     * @returns {Array<import('./wheel-wv.mjs').WheelWV> |
     * Array<import('./wheel-tv.mjs').WheelTV>} Array of wheels.
     * @defaultValue []
     */
    get wheels() {
        return this._wheels;
    }

    setDriverInput(input0, input1, input2, input3) {
        if ($_DEBUG) {
            let ok = Debug.checkRange(input0, -1, 1, `Invalid driver input for forward (input0). Expected a number in [-1:1] range. Received: ${input0}`);
            if (this._type === CONSTRAINT_TYPE_VEHICLE_WHEEL || this._type === CONSTRAINT_TYPE_VEHICLE_MOTO) {
                ok = ok && Debug.checkRange(input1, -1, 1, `Invalid driver input for right (input1). Expected a number in [-1:1] range. Received: ${input1}`);
                ok = ok && Debug.checkRange(input2, 0, 1, `Invalid driver input for brake (input2). Expected a number in [0:1] range. Received: ${input2}`);
                ok = ok && Debug.checkRange(input3, 0, 1, `Invalid driver input for hand brake (input3). Expected a number in [0:1] range. Received: ${input3}`);
            } else {
                ok = ok && Debug.checkRange(input1, -1, 1, `Invalid driver input for left ratio (input1). Expected a number in [-1:1] range. Received: ${input1}`);
                ok = ok && Debug.checkRange(input2, -1, 1, `Invalid driver input for right ratio (input2). Expected a number in [-1:1] range. Received: ${input2}`);
                ok = ok && Debug.checkRange(input3, 0, 1, `Invalid driver input for brake (input3). Expected a number in [0:1] range. Received: ${input3}`);
            }
            if (!ok)
                return;
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_VEHICLE_SET_INPUT, this._index,
            input0, BUFFER_WRITE_FLOAT32, false,
            input1, BUFFER_WRITE_FLOAT32, false,
            input2, BUFFER_WRITE_FLOAT32, false,
            input3, BUFFER_WRITE_FLOAT32, false
        );
    }

    write(cb) {
        if ($_DEBUG) {
            let ok = Debug.checkVec(this._up, `Invalid up vector`, this._up);
            ok = ok && Debug.checkVec(this._forward, `Invalid forward vector`, this._forward);
            ok = ok && Debug.checkFloat(this._maxPitchRollAngle, `Invalid angle scalar`, this._maxPitchRollAngle);
            // TODO

            if (!ok) {
                return;
            }
        }

        super.write(cb);

        // general vehicle data
        cb.write(this._up, BUFFER_WRITE_VEC32, false);
        cb.write(this._forward, BUFFER_WRITE_VEC32, false);
        cb.write(this._maxPitchRollAngle, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._entity.body.index, BUFFER_WRITE_UINT32, false);

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

        // antiroll bars
        const bars = this._antiRollBars;
        const count = bars.length;
        cb.write(count, BUFFER_WRITE_UINT32, false);
        for (let i = 0; i < count; i++) {
            const bar = bars[i];
            cb.write(bar.leftWheel ?? 0, BUFFER_WRITE_UINT32, false);
            cb.write(bar.rightWheel ?? 1, BUFFER_WRITE_UINT32, false);
            cb.write(bar.stiffness ?? 1000, BUFFER_WRITE_FLOAT32, false);
        }

        // cast type
        const castType = this._castType;
        cb.write(castType, BUFFER_WRITE_UINT8, false);
        cb.write(this._castObjectLayer, BUFFER_WRITE_UINT32, false);
        switch (castType) {
            case VEHICLE_CAST_TYPE_RAY:
                cb.write(this._castUp, BUFFER_WRITE_VEC32, false);
                cb.write(this._castMaxSlopeAngle, BUFFER_WRITE_FLOAT32, false);
                break;
            case VEHICLE_CAST_TYPE_SPHERE:
                cb.write(this._castUp, BUFFER_WRITE_VEC32, false);
                cb.write(this._castMaxSlopeAngle, BUFFER_WRITE_FLOAT32, false);
                cb.write(this._castRadius, BUFFER_WRITE_FLOAT32, false);
                break;
            case VEHICLE_CAST_TYPE_CYLINDER:
                cb.write(this._castFraction, BUFFER_WRITE_FLOAT32, false);
                break;
        }
    }

    updateWheelsIsometry(cb) {
        const wheels = this._wheels;
        const type = this._type;
        const wheelsCount = wheels.length;
        const isWheeled = type === CONSTRAINT_TYPE_VEHICLE_MOTO ||
                          type === CONSTRAINT_TYPE_VEHICLE_WHEEL;

        for (let i = 0; i < wheelsCount; i++) {
            const wheel = wheels[i];
            const entity = wheel.entity;

            if (!entity) {
                cb.skip(7 * FLOAT32_SIZE);
                continue;
            }

            if (isWheeled) {
                wheel.longitudinalSlip = cb.read(BUFFER_READ_FLOAT32);
                wheel.lateralSlip = cb.read(BUFFER_READ_FLOAT32);
                wheel.combinedLongitudinalFriction = cb.read(BUFFER_READ_FLOAT32);
                wheel.combinedLateralFriction = cb.read(BUFFER_READ_FLOAT32);
                wheel.brakeImpulse = cb.read(BUFFER_READ_FLOAT32);
            }

            entity.setLocalPosition(
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32)
            );

            entity.setLocalRotation(
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32)
            );
        }
    }
}

function createWheels(wheels, settings, WheelConstructor) {
    for (let i = 0; i < settings.length; i++) {
        wheels.push(new WheelConstructor(settings[i]));
    }
}

function writeCurvePoints(cb, curve) {
    const keys = curve.keys;
    const count = keys.length;

    cb.write(count, BUFFER_WRITE_UINT32, false);

    for (let i = 0; i < keys.length; i++) {
        const key = keys[i];

        cb.write(key[0], BUFFER_WRITE_FLOAT32, false);
        cb.write(key[1], BUFFER_WRITE_FLOAT32, false);
    }
}

function writeGears(cb, gears) {
    const count = gears.length;
    cb.write(count, BUFFER_WRITE_UINT32, false);
    for (let i = 0; i < count; i++) {
        cb.write(gears[i], BUFFER_WRITE_FLOAT32, false);
    }
}

function writeWheelsData(cb, wheelsSettings, isWheeled) {
    if ($_DEBUG) {
        const ok = Debug.assert(!!wheelsSettings, 'Missing wheels settings.');
        if (!ok) {
            return;
        }
    }

    const count = wheelsSettings.length;
    cb.write(count, BUFFER_WRITE_UINT32, false);

    for (let i = 0; i < count; i++) {
        const desc = wheelsSettings[i];

        if ($_DEBUG) {
            let ok = Debug.assert(
                desc.position,
                'A wheel description requires an attachment position of wheel suspension in local ' +
                'space of the vehicle',
                desc
            );
            if (desc.spring) {
                ok = ok && Debug.checkSpringSettings(desc.spring);
            }

            // TODO

            if (!ok) {
                return;
            }
        }

        cb.write(desc.position || Vec3.ZERO, BUFFER_WRITE_VEC32, false);
        cb.write(desc.suspensionForcePoint || Vec3.ZERO, BUFFER_WRITE_VEC32, false);
        cb.write(desc.suspensionDirection || Vec3.DOWN, BUFFER_WRITE_VEC32, false);
        cb.write(desc.steeringAxis || Vec3.UP, BUFFER_WRITE_VEC32, false);
        cb.write(desc.wheelUp || Vec3.UP, BUFFER_WRITE_VEC32, false);
        cb.write(desc.wheelForward || Vec3.BACK, BUFFER_WRITE_VEC32, false);
        cb.write(desc.suspensionMinLength ?? 0.3, BUFFER_WRITE_FLOAT32, false);
        cb.write(desc.suspensionMaxLength ?? 0.5, BUFFER_WRITE_FLOAT32, false);
        cb.write(desc.suspensionPreloadLength ?? 0, BUFFER_WRITE_FLOAT32, false);
        cb.write(desc.radius ?? 0.3, BUFFER_WRITE_FLOAT32, false);
        cb.write(desc.width ?? 0.1, BUFFER_WRITE_FLOAT32, false);
        cb.write(desc.enableSuspensionForcePoint ?? false, BUFFER_WRITE_BOOL, false);

        Constraint.writeSpringSettings(cb, desc.springSettings);

        if (isWheeled) {
            writeCurvePoints(cb, desc.longitudinalFrictionCurve || VehicleConstraint.defaultLongitudinalFrictionCurve);
            writeCurvePoints(cb, desc.lateralFrictionCurve || VehicleConstraint.defaultLateralFrictionCurve);

            cb.write(desc.inertia ?? 0.9, BUFFER_WRITE_FLOAT32, false);
            cb.write(desc.angularDamping ?? 0.2, BUFFER_WRITE_FLOAT32, false);
            cb.write(desc.maxSteerAngle ?? 1.2217304763960306, BUFFER_WRITE_FLOAT32, false);
            cb.write(desc.maxBrakeTorque ?? 1500, BUFFER_WRITE_FLOAT32, false);
            cb.write(desc.maxHandBrakeTorque ?? 4000, BUFFER_WRITE_FLOAT32, false);
        } else {
            cb.write(desc.longitudinalFriction ?? 4, BUFFER_WRITE_FLOAT32, false);
            cb.write(desc.lateralFriction ?? 2, BUFFER_WRITE_FLOAT32, false);
        }
    }
}

function writeTracksData(cb, tracks) {
    const count = tracks.length;

    if ($_DEBUG && count === 0) {
        Debug.warn('Invalid tracks data. Need at least one track.', tracks);
        return;
    }

    cb.write(count, BUFFER_WRITE_UINT32, false);

    for (let t = 0; t < count; t++) {
        const track = tracks[t];
        const wheelsCount = track.length;

        cb.write(wheelsCount, BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < wheelsCount; i++) {
            cb.write(track[i], BUFFER_WRITE_UINT32, false);
        }
    }
}

export { VehicleConstraint, writeWheelsData, writeTracksData, createWheels };

import { Curve } from 'playcanvas';
import { WHEEL_WHEELED } from '../../../../constants.mjs';
import { applyOptions } from '../constraint.mjs';
import { Wheel } from './wheel.mjs';

/**
 * A wheeled vehicle wheel.
 *
 * @group Utilities
 * @category Constraints
 */
class WheelWV extends Wheel {
    static defaultLateralFrictionCurve = new Curve([0, 0, 3, 1.2, 20, 1]);

    static defaultLongitudinalFrictionCurve = new Curve([0, 0, 0.06, 1.2, 0.2, 1]);

    _angularDamping = 0.2;

    _inertia = 0.9;
    
    _combinedLongitudinalFriction = 0;
    
    _combinedLateralFriction = 0;
    
    _brakeImpulse = 0;

    _lateralFrictionCurve = null;

    _longitudinalFrictionCurve = null;

    _lateralSlip = 0;

    _longitudinalSlip = 0;

    _maxHandBrakeTorque = 4000;

    _maxBrakeTorque = 1500;

    _maxSteerAngle = 1.2217304763960306;

    constructor(opts = {}) {
        super(opts);

        this._type = WHEEL_WHEELED;

        applyOptions(this, opts);

        this._lateralFrictionCurve ||= WheelWV.defaultLateralFrictionCurve;
        this._longitudinalFrictionCurve ||= WheelWV.defaultLongitudinalFrictionCurve;
    }

    /**
     * Angular damping factor of the wheel:
     * ```
     * dw/dt = -c * w.
     * ```
     *
     * @returns {number} Angular damping.
     * @defaultValue 0.2
     */
    get angularDamping() {
        return this._angularDamping;
    }

    /**
     * @param {number} impulse - Brake impulse.
     */
    set brakeImpulse(impulse) {
        this._brakeImpulse = impulse;
    }

    /**
     * Ready-only. Amount of impulse that the brakes can apply to the floor (excluding friction).
     *
     * @returns {number} Brake impulse.
     * @defaultValue 0
     */
    get brakeImpulse() {
        return this._brakeImpulse;
    }

    /**
     * @param {number} friction - Combined lateral friction.
     */
    set combinedLateralFriction(friction) {
        this._combinedLateralFriction = friction;
    }

    /**
     * Read-only. Combined friction coefficient in lateral direction (combines terrain and tires).
     *
     * @returns {number} Friction coefficient.
     * @defaultValue 0
     */
    get combinedLateralFriction() {
        return this._combinedLateralFriction;
    }

    /**
     * @param {number} friction - Combined longitudinal friction.
     */
    set combinedLongitudinalFriction(friction) {
        this._combinedLongitudinalFriction = friction;
    }

    /**
     * Read-only. Combined friction coefficient in longitudinal direction (combines terrain and
     * tires).
     *
     * @returns {number} Friction coefficient.
     * @defaultValue 0
     */
    get combinedLongitudinalFriction() {
        return this._combinedLongitudinalFriction;
    }

    /**
     * Moment of inertia `(kg m^2)`. For a cylinder this would be
     * ```
     * 0.5 * M * R^2
     * ```
     * which is `0.9` for a wheel with a mass of `20 kg` and radius `0.3 m`.
     *
     * @returns {number} Moment of inertia.
     * @defaultValue 0.9
     */
    get inertia() {
        return this._inertia;
    }

    /**
     * Friction in sideway direction of tire as a function of the slip angle (degrees): angle
     * between relative contact velocity and vehicle direction.
     *
     * If tire forward matches the vehicle direction, then the angle is `0` degrees. If the vehicle
     * is sliding sideways, e.g. on ice, then the angle is 90 degrees. Example curve keys could be:
     * `[[0, 1], [90, 0.3]]` - full friction at zero degrees, and `0.3` friction at `90`.
     *
     * @returns {Curve | null} LateralFrictionCurve
     * @defaultValue Curve([0, 0, 3, 1.2, 20, 1])
     */
    get lateralFrictionCurve() {
        return this._lateralFrictionCurve;
    }

    /**
     * Friction in forward direction of tire as a function of the slip ratio (fraction):
     * ```
     * (omega_wheel * r_wheel - v_longitudinal) / |v_longitudinal|.
     * ```
     * 
     * Slip ratio here is a ratio of wheel spinning relative to the floor. At `0` the wheel has
     * full traction and is rolling perfectly in sync with the ground. At 1 the wheel is locked and
     * is sliding over the ground.
     *
     * @returns {Curve | null} Longitudinal friction curve.
     * @defaultValue Curve([0, 0, 0.06, 1.2, 0.2, 1])
     */
    get longitudinalFrictionCurve() {
        return this._longitudinalFrictionCurve;
    }

    /**
     * @param {number} slip - Lateral slip.
     */
    set lateralSlip(slip) {
        this._lateralSlip = slip;
    }

    /**
     * Read-only. Angular difference between ground and wheel relative to ground velocity.
     *
     * @returns {number} Angular difference.
     * @defaultValue 0 (radians)
     */
    get lateralSlip() {
        return this._lateralSlip;
    }

    /**
     * @param {number} slip - Longitudinal slip.
     */
    set longitudinalSlip(slip) {
        this._longitudinalSlip = slip;
    }

    /**
     * Read-only. Velocity difference between ground and wheel relative to ground velocity.
     */
    get longitudinalSlip() {
        return this._longitudinalSlip;
    }

    /**
     * How much torque the brakes can apply to this wheel.
     *
     * @returns {number} Max brake torque.
     * @defaultValue 1500 (Nm)
     */
    get maxBrakeTorque() {
        return this._maxBrakeTorque;
    }

    /**
     * How much torque (Nm) the hand brake can apply to this wheel (usually only applied to the
     * rear wheels).
     *
     * @returns {number} Max hand brake torque.
     * @defaultValue 4000 (Nm)
     */
    get maxHandBrakeTorque() {
        return this._maxHandBrakeTorque;
    }

    /**
     * How much this wheel can steer.
     *
     * @returns {number} Max steer angle.
     * @defaultValue ~1.22 rad (70 degrees).
     */
    get maxSteerAngle() {
        return this._maxSteerAngle;
    }
}

export { WheelWV };
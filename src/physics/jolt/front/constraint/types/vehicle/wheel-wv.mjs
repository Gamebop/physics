import { WHEEL_WHEELED } from '../../../../constants.mjs';

/**
 * A wheeled vehicle wheel.
 *
 * @group Utilities
 * @category Vehicle Constraints
 */
class WheelWV {
    _brakeImpulse = 0;

    _combinedLongitudinalFriction = 0;

    _combinedLateralFriction = 0;

    _entity = null;

    _lateralSlip = 0;

    _longitudinalSlip = 0;

    constructor(opts) {
        this._type = WHEEL_WHEELED;

        this._entity = opts.entity || this._entity;
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
     * @type {number}
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
     * @type {number}
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
     * @type {number}
     * @defaultValue 0
     */
    get combinedLongitudinalFriction() {
        return this._combinedLongitudinalFriction;
    }

    /**
     * PlayCanvas Entity that will be used as a visual wheel. Its position and rotation will be
     * updated automatically to match the physical wheel.
     *
     * @type {import('playcanvas').Entity | null}
     * @defaultValue null
     */
    get entity() {
        return this._entity;
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
     * @type {number}
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
     *
     * @type {number}
     * @defaultValue 0
     */
    get longitudinalSlip() {
        return this._longitudinalSlip;
    }
}

export { WheelWV };

import { WHEEL_TRACKED } from '../../../../constants.mjs';
import { applyOptions } from '../constraint.mjs';
import { Wheel } from './wheel.mjs';

/**
 * A tracked vehicle wheel.
 *
 * @group Utilities
 * @category Constraints
 */
class WheelTV extends Wheel {
    _lateralFriction = 2;

    _longitudinalFriction = 4;

    constructor(opts = {}) {
        super(opts);

        this._type = WHEEL_TRACKED;

        applyOptions(this, opts);
    }

    /**
     * Friction in sideway direction of tire.
     *
     * @returns {number} Friction.
     */
    get lateralFriction() {
        return this._lateralFriction;
    }
    
    /**
     * Friction in forward direction of tire.
     */
    get longitudinalFriction() {
        return this._longitudinalFriction;
    }
    
    // TODO
    // expose tracked vehicle properties
}

export { WheelTV };
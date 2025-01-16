import { WHEEL_TRACKED } from '../../../../constants.mjs';

/**
 * @import { Entity } from 'playcanvas'
 */

/**
 * A tracked vehicle wheel.
 *
 * @group Utilities
 * @category Vehicle Constraints
 */
class WheelTV {
    _entity = null;

    constructor(opts = {}) {
        this._type = WHEEL_TRACKED;
        this._entity = opts.entity || this._entity;
    }

    /**
     * PlayCanvas Entity that will be used as a visual wheel. Its position and rotation will be
     * updated automatically to match the physical wheel.
     *
     * @type {Entity | null}
     * @defaultValue null
     */
    get entity() {
        return this._entity;
    }
}

export { WheelTV };

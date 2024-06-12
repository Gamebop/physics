import { VehicleConstraint, createWheels, writeWheelsData } from './vehicle-constraint.mjs';
import { applyOptions } from '../constraint.mjs';
import { Debug } from '../../../../debug.mjs';
import { WheelWV } from './wheel-wv.mjs';
import {
    BUFFER_WRITE_FLOAT32, BUFFER_WRITE_INT32, BUFFER_WRITE_UINT32, CONSTRAINT_TYPE_VEHICLE_WHEEL
} from '../../../../constants.mjs';

function writeDifferentials(cb, differentials, ratio) {
    const count = differentials.length;

    if ($_DEBUG && count === 0) {
        Debug.warnOnce('Vehicle component is missing wheels differentials. ' +
            'Default values will make a vehicle without wheels.');
    }

    cb.write(count, BUFFER_WRITE_UINT32, false);

    for (let i = 0; i < count; i++) {
        const diff = differentials[i];

        cb.write(diff.leftWheel ?? -1, BUFFER_WRITE_INT32, false);
        cb.write(diff.rightWheel ?? -1, BUFFER_WRITE_INT32, false);
        cb.write(diff.differentialRatio ?? 3.42, BUFFER_WRITE_FLOAT32, false);
        cb.write(diff.leftRightSplit ?? 0.5, BUFFER_WRITE_FLOAT32, false);
        cb.write(diff.limitedSlipRatio ?? 1.4, BUFFER_WRITE_FLOAT32, false);
        cb.write(diff.engineTorqueRatio ?? 1, BUFFER_WRITE_FLOAT32, false);
    }

    cb.write(ratio, BUFFER_WRITE_FLOAT32, false);
}

/**
 * Wheeled Vehicle Constraint.
 *
 * @group Utilities
 * @category Vehicle Constraints
 */
class WheeledVehicleConstraint extends VehicleConstraint {
    _differentialLimitedSlipRatio = 1.4;

    _differentials = [];

    constructor(entity, opts = {}) {
        super(entity, opts);

        this._type = CONSTRAINT_TYPE_VEHICLE_WHEEL;

        applyOptions(this, opts);

        if (opts.wheelsSettings) {
            createWheels(this._wheels, opts.wheelsSettings, WheelWV);
        }
    }

    /**
     * Ratio max / min average wheel speed of each differential (measured at the clutch). When the
     * ratio is exceeded all torque gets distributed to the differential with the minimal average
     * velocity. This allows implementing a limited slip differential between differentials. Set to
     * `Number.MAX_VALUE` for an open differential. Value should be greater than `1`.
     *
     * @returns {number} Slip ratio.
     * @defaultValue 1.4
     */
    get differentialLimitedSlipRatio() {
        return this._differentialLimitedSlipRatio;
    }

    /**
     * List of differentials and their properties.
     *
     * @type {Array<import('../settings.mjs').DifferentialSettings>}
     * @defaultValue []
     */
    get differentials() {
        return this._differentials;
    }

    write(cb, opts) {
        super.write(cb);

        writeWheelsData(cb, opts.wheelsSettings, true);

        writeDifferentials(cb, this._differentials, this._differentialLimitedSlipRatio);
    }
}

export { WheeledVehicleConstraint };

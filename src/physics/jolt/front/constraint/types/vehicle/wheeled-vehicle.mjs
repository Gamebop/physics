import { VehicleConstraint, createWheels, writeDifferentials, writeWheelsData } from './vehicle-constraint.mjs';
import { CONSTRAINT_TYPE_VEHICLE_WHEEL } from '../../../../constants.mjs';
import { WheelWV } from './wheel-wv.mjs';

/**
 * Wheeled Vehicle Constraint.
 *
 * @group Utilities
 * @category Constraints
 */
class WheeledVehicleConstraint extends VehicleConstraint {
    _differentialLimitedSlipRatio = 1.4;

    _differentials = [];

    constructor(entity, opts = {}) {
        super(entity, opts);

        this._type = CONSTRAINT_TYPE_VEHICLE_WHEEL;

        if (opts.wheels) {
            createWheels(this._wheels, opts.wheels, WheelWV);
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
     * TODO
     * @returns {}
     * @defaultValue []
     */
    get differentials() {
        return this._differentials;
    }

    write(cb) {
        super.write(cb);

        writeWheelsData(cb, this._wheels, true);

        writeDifferentials(cb, this._differentials, this._differentialLimitedSlipRatio);
    }
}

export { WheeledVehicleConstraint };

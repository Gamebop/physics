import { CONSTRAINT_TYPE_VEHICLE_TRACK } from '../../../../constants.mjs';
import { VehicleConstraint, createWheels, writeTracksData, writeWheelsData } from '../vehicle-constraint.mjs';
import { WheelTV } from './wheel-tv.mjs';

/**
 * Tracked Vehicle Constraint.
 *
 * @group Utilities
 * @category Constraints
 */
class TrackedVehicleConstraint extends VehicleConstraint {
    constructor(entity, opts = {}) {
        super(entity, opts);

        this._type = CONSTRAINT_TYPE_VEHICLE_TRACK;

        if (opts.wheels) {
            createWheels(this._wheels, opts.wheels, WheelTV);
        }
    }

    write(cb) {
        if ($_DEBUG) {
            // TODO
        }

        super.write(cb);

        writeWheelsData(cb, this._wheels, false);

        writeTracksData(cb, this._tracks);
    }
}

export { TrackedVehicleConstraint };

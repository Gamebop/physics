import { CONSTRAINT_TYPE_VEHICLE_TRACK } from '../../../../constants.mjs';
import { applyOptions } from '../constraint.mjs';
import { VehicleConstraint, createWheels, writeTracksData, writeWheelsData } from './vehicle-constraint.mjs';
import { WheelTV } from './wheel-tv.mjs';

/**
 * Tracked Vehicle Constraint.
 *
 * @group Utilities
 * @category Vehicle Constraints
 */
class TrackedVehicleConstraint extends VehicleConstraint {
    _tracks = [];

    constructor(entity, opts = {}) {
        super(entity, opts);

        this._type = CONSTRAINT_TYPE_VEHICLE_TRACK;

        applyOptions(this, opts);

        if (opts.wheelsSettings) {
            createWheels(this._wheels, opts.wheelsSettings, WheelTV);
        }
    }

    /**
     * An array of arrays. Each array represents a track and lists indices of wheels that are
     * inside that track. The last element in each track array will become a driven wheel (an index
     * that points to a wheel that is connected to the engine).
     *
     * Example with 2 tracks, and each having 4 wheels:
     * ```
     * [[0, 1, 2, 3], [4, 5, 6, 7]]
     * ```
     *
     * @returns {Array<Array<number>>} Arrays with tracks of wheels.
     * @defaultValue []
     */
    get tracks() {
        return this._tracks;
    }

    write(cb, opts) {
        if ($_DEBUG) {
            // TODO
        }

        super.write(cb);

        writeWheelsData(cb, opts.wheelsSettings, false);

        writeTracksData(cb, this._tracks);
    }
}

export { TrackedVehicleConstraint };

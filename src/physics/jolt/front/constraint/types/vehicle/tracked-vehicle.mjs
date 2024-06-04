import { CONSTRAINT_TYPE_VEHICLE_TRACK } from '../../../../constants.mjs';
import { VehicleConstraint, writeTracksData, writeWheelsData } from '../vehicle.mjs';

class TrackedVehicleConstraint extends VehicleConstraint {
    _type = CONSTRAINT_TYPE_VEHICLE_TRACK;

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

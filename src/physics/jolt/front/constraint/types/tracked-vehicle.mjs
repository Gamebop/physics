import { CONSTRAINT_TYPE_VEHICLE_TRACK } from '../../../constants.mjs';
import { Vehicle, writeTracksData, writeWheelsData } from './base/vehicle.mjs';

class TrackedVehicle extends Vehicle {
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

export { TrackedVehicle };

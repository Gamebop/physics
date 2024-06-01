import { VehicleConstraint, writeDifferentials, writeWheelsData } from './base/vehicle.mjs';
import { CONSTRAINT_TYPE_VEHICLE_WHEEL } from '../../../constants.mjs';

class WheeledVehicleConstraint extends VehicleConstraint {
    _type = CONSTRAINT_TYPE_VEHICLE_WHEEL;

    write(cb) {
        super.write(cb);

        writeWheelsData(cb, this._wheels, true);

        writeDifferentials(cb, this._differentials, this._differentialLimitedSlipRatio);
    }
}

export { WheeledVehicleConstraint };

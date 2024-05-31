import { Debug } from '../../../debug.mjs';
import { Vehicle, writeDifferentials, writeWheelsData } from './base/vehicle.mjs';
import {
    BUFFER_WRITE_FLOAT32, CMD_SET_DRIVER_INPUT, CMD_VEHICLE_SET_INPUT, CONSTRAINT_TYPE_VEHICLE_WHEEL, OPERATOR_MODIFIER
} from '../../../constants.mjs';

class WheeledVehicle extends Vehicle {
    _type = CONSTRAINT_TYPE_VEHICLE_WHEEL;

    write(cb) {
        if ($_DEBUG) {
            // TODO
        }

        super.write(cb);

        writeWheelsData(cb, this._wheels, true);
        
        writeDifferentials(cb, this._differentials, this._differentialLimitedSlipRatio);
    }
}

export { WheeledVehicle };

import { CONSTRAINT_TYPE_VEHICLE_WHEEL } from '../../../constants.mjs';
import { Constraint } from './base/constraint.mjs';

class WheeledVehicle extends Constraint {
    _type = CONSTRAINT_TYPE_VEHICLE_WHEEL;

    constructor(opts = {}) {
        
    }
}

export { WheeledVehicle };
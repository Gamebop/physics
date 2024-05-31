import { BUFFER_WRITE_FLOAT32, CONSTRAINT_TYPE_VEHICLE_MOTO } from '../../../constants.mjs';
import { Vehicle, writeDifferentials, writeWheelsData } from './base/vehicle.mjs';

class MotoVehicle extends Vehicle {
    _type = CONSTRAINT_TYPE_VEHICLE_MOTO;

    // How far we're willing to make the bike lean over in turns (in radians)
    _maxLeanAngle = 45;

    // Spring constant for the lean spring.
    _leanSpringConstant = 5000;

    // Spring damping constant for the lean spring.
    _leanSpringDamping = 1000;

    // The lean spring applies an additional force equal to this coefficient * Integral(delta angle, 0, t),
    // this effectively makes the lean spring a PID controller.
    _leanSpringIntegrationCoefficient = 0;

    // How much to decay the angle integral when the wheels are not touching the floor:
    // new_value = e^(-decay * t) * initial_value.
    _leanSpringIntegrationCoefficientDecay = 4;

    // How much to smooth the lean angle (0 = no smoothing, 1 = lean angle never changes). Note that this
    // is frame rate dependent because the formula is: smoothing_factor * previous + (1 - smoothing_factor) * current
    _leanSmoothingFactor = 0.8;

    write(cb) {
        if ($_DEBUG) {
            // TODO
        }

        super.write(cb);

        writeWheelsData(cb, this._wheels, true);
        
        writeDifferentials(cb, this._differentials, this._differentialLimitedSlipRatio);

        cb.write(this._maxLeanAngle, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._leanSpringConstant, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._leanSpringDamping, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._leanSpringIntegrationCoefficient, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._leanSpringIntegrationCoefficientDecay, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._leanSmoothingFactor, BUFFER_WRITE_FLOAT32, false);
    }
}

export { MotoVehicle };

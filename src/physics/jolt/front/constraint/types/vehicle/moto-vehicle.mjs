import { BUFFER_WRITE_FLOAT32, CONSTRAINT_TYPE_VEHICLE_MOTO } from '../../../../constants.mjs';
import { WheeledVehicleConstraint } from './wheeled-vehicle.mjs';
import { applyOptions } from '../constraint.mjs';
import { Debug } from '../../../../debug.mjs';
import { math } from 'playcanvas';

/**
 * Motorcycle Vehicle Constraint.
 *
 * @group Utilities
 * @category Vehicle Constraints
 */
class MotoVehicleConstraint extends WheeledVehicleConstraint {
    _maxLeanAngle = 45 * math.DEG_TO_RAD;

    _leanSpringConstant = 5000;

    _leanSpringDamping = 1000;

    _leanSpringIntegrationCoefficient = 0;

    _leanSpringIntegrationCoefficientDecay = 4;

    _leanSmoothingFactor = 0.8;

    constructor(entity, opts = {}) {
        super(entity, opts);

        this._type = CONSTRAINT_TYPE_VEHICLE_MOTO;

        applyOptions(this, opts);
    }

    /**
     * How much to smooth the lean angle:
     * - `0`: no smoothing
     * - `1`: lean angle never changes
     *
     * @returns {number} - Smooth coefficient.
     * @defaultValue 0.8
     */
    get leanSmoothingFactor() {
        return this._leanSmoothingFactor;
    }

    /**
     * Spring constant for the lean spring.
     *
     * @returns {number} - Lean spring constant.
     * @defaultValue 5000
     */
    get leanSpringConstant() {
        return this._leanSpringConstant;
    }

    /**
     * Spring damping constant for the lean spring.
     *
     * @returns {number} - Spring damping constant.
     * @defaultValue 1000
     */
    get leanSpringDamping() {
        return this._leanSpringDamping;
    }

    /**
     * The lean spring applies an additional force equal to:
     * ```
     * coefficient * Integral(delta angle, 0, t)
     * ```
     * This effectively makes the lean spring a PID controller.
     *
     * @returns {number} - Integration coefficient.
     * @defaultValue 0
     */
    get leanSpringIntegrationCoefficient() {
        return this._leanSpringIntegrationCoefficient;
    }

    /**
     * How much to decay the angle integral when the wheels are not touching the floor:
     * ```
     * new_value = e^(-decay * t) * initial_value.
     * ```
     *
     * @returns {number} - Coefficient decay.
     * @defaultValue 4
     */
    get leanSpringIntegrationCoefficientDecay() {
        return this._leanSpringIntegrationCoefficientDecay;
    }

    /**
     * How far we're willing to make the bike lean over in turns.
     *
     * @returns {number} - Lean angle (radians).
     * @defaultValue 45 * math.DEG_TO_RAD
     */
    get maxLeanAngle() {
        return this._maxLeanAngle;
    }

    write(cb, opts) {
        if ($_DEBUG) {
            let ok = Debug.checkFloat(this._maxLeanAngle);
            ok = ok && Debug.checkFloat(this._leanSpringConstant);
            ok = ok && Debug.checkFloat(this._leanSpringDamping);
            ok = ok && Debug.checkFloat(this._leanSpringIntegrationCoefficient);
            ok = ok && Debug.checkFloat(this._leanSpringIntegrationCoefficientDecay);
            ok = ok && Debug.checkFloat(this._leanSmoothingFactor);
            if (!ok) {
                return;
            }
        }

        super.write(cb, opts);

        cb.write(this._maxLeanAngle, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._leanSpringConstant, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._leanSpringDamping, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._leanSpringIntegrationCoefficient, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._leanSpringIntegrationCoefficientDecay, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._leanSmoothingFactor, BUFFER_WRITE_FLOAT32, false);
    }
}

export { MotoVehicleConstraint };

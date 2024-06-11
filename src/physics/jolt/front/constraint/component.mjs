import { Debug } from '../../debug.mjs';
import { Component } from '../component.mjs';
import { ConeConstraint } from './types/joint/cone.mjs';
import { DistanceConstraint } from './types/joint/distance.mjs';
import { FixedConstraint } from './types/joint/fixed.mjs';
import { HingeConstraint } from './types/joint/hinge.mjs';
import { PointConstraint } from './types/joint/point.mjs';
import { PulleyConstraint } from './types/joint/pulley.mjs';
import { SixDOFConstraint } from './types/joint/six-dof.mjs';
import { SliderConstraint } from './types/joint/slider.mjs';
import { SwingTwistConstraint } from './types/joint/swing-twist.mjs';
import { WheeledVehicleConstraint } from './types/vehicle/wheeled-vehicle.mjs';
import { TrackedVehicleConstraint } from './types/vehicle/tracked-vehicle.mjs';
import { MotoVehicleConstraint } from './types/vehicle/moto-vehicle.mjs';
import {
    CONSTRAINT_TYPE_CONE, CONSTRAINT_TYPE_DISTANCE, CONSTRAINT_TYPE_FIXED,
    CONSTRAINT_TYPE_HINGE, CONSTRAINT_TYPE_POINT, CONSTRAINT_TYPE_PULLEY, CONSTRAINT_TYPE_SIX_DOF,
    CONSTRAINT_TYPE_SLIDER, CONSTRAINT_TYPE_SWING_TWIST, CONSTRAINT_TYPE_VEHICLE_MOTO,
    CONSTRAINT_TYPE_VEHICLE_TRACK, CONSTRAINT_TYPE_VEHICLE_WHEEL
} from '../../constants.mjs';

/**
 * Constraint Component. Allows to add one or multiple constraints to an entity with a
 * {@link BodyComponent | Body Component}.
 *
 * @group Components
 * @category Constraint Component
 */
class ConstraintComponent extends Component {
    _list = new Set();

    _vehicleConstraint = null;

    /** @private */
    get vehicleConstraint() {
        return this._vehicleConstraint;
    }

    /**
     * Adds a constraint to this entity. Following constants available:
     * ```
     * CONSTRAINT_TYPE_FIXED
     * ```
     * ```
     * CONSTRAINT_TYPE_POINT
     * ```
     * ```
     * CONSTRAINT_TYPE_DISTANCE
     * ```
     * ```
     * CONSTRAINT_TYPE_HINGE
     * ```
     * ```
     * CONSTRAINT_TYPE_SLIDER
     * ```
     * ```
     * CONSTRAINT_TYPE_CONE
     * ```
     * ```
     * CONSTRAINT_TYPE_SIX_DOF
     * ```
     * ```
     * CONSTRAINT_TYPE_SWING_TWIST
     * ```
     * ```
     * CONSTRAINT_TYPE_PULLEY
     * ```
     *
     * @param {number} type - Constant number, representing joint type.
     * @param {import('playcanvas').Entity} otherEntity - The other entity that this entity will be
     * connected to with this joint.
     * @param {import('./types/settings.mjs').ConstraintSettings |
     * import('./types/settings.mjs').ConeConstraintSettings |
     * import('./types/settings.mjs').DistanceConstraintSettings |
     * import('./types/settings.mjs').FixedConstraintSettings |
     * import('./types/settings.mjs').HingeConstraintSettings |
     * import('./types/settings.mjs').PulleyConstraintSettings |
     * import('./types/settings.mjs').SixDOFConstraintSettings |
     * import('./types/settings.mjs').SliderConstraintSettings |
     * import('./types/settings.mjs').SwingTwistConstraintSettings } [opts] - Optional joint options object.
     * @returns {FixedConstraint | PointConstraint | DistanceConstraint | HingeConstraint |
     * SliderConstraint | ConeConstraint | SixDOFConstraint | SwingTwistConstraint |
     * PulleyConstraint | null} - A constraint interface. Returns `null`, if unable to create one.
     */
    addJoint(type, otherEntity, opts = {}) {
        let Constructor;
        switch (type) {
            case CONSTRAINT_TYPE_SWING_TWIST:
                Constructor = SwingTwistConstraint;
                break;
            case CONSTRAINT_TYPE_FIXED:
                Constructor = FixedConstraint;
                break;
            case CONSTRAINT_TYPE_POINT:
                Constructor = PointConstraint;
                break;
            case CONSTRAINT_TYPE_DISTANCE:
                Constructor = DistanceConstraint;
                break;
            case CONSTRAINT_TYPE_HINGE:
                Constructor = HingeConstraint;
                break;
            case CONSTRAINT_TYPE_SLIDER:
                Constructor = SliderConstraint;
                break;
            case CONSTRAINT_TYPE_CONE:
                Constructor = ConeConstraint;
                break;
            case CONSTRAINT_TYPE_SIX_DOF:
                Constructor = SixDOFConstraint;
                break;
            case CONSTRAINT_TYPE_PULLEY:
                Constructor = PulleyConstraint;
                break;
            default:
                if ($_DEBUG) {
                    Debug.warn(`Trying to add unrecognized constraint type: ${type}`);
                }
                return null;
        }

        const constraint = new Constructor(this.entity, otherEntity, opts);
        const index = this.system.constraintMap.add(constraint);

        constraint.index = index;

        this._list.add(index);

        if (!otherEntity.constraint) {
            otherEntity.addComponent('constraint');
        }
        otherEntity.constraint.list.add(index);

        this.system.createConstraint(index, constraint);

        return constraint;
    }

    /**
     * Adds a vehicle type constraint. Following types available:
     * ```
     * CONSTRAINT_TYPE_VEHICLE_WHEEL
     * ```
     * ```
     * CONSTRAINT_TYPE_VEHICLE_TRACK
     * ```
     * ```
     * CONSTRAINT_TYPE_VEHICLE_MOTO
     * ```
     *
     * @param {number} type - Vehicle constraint type.
     * @param {import('./types/settings.mjs').WheeledVehicleConstraintSettings |
     * import('./types/settings.mjs').MotoVehicleConstraintSettings |
     * import('./types/settings.mjs').TrackedVehicleConstraintSettings} [opts] - Constraint settings.
     * @returns {WheeledVehicleConstraint | MotoVehicleConstraint | TrackedVehicleConstraint} -
     * Vehicle constraint.
     */
    addVehicle(type, opts = {}) {
        let Constructor;
        switch (type) {
            case CONSTRAINT_TYPE_VEHICLE_WHEEL:
                Constructor = WheeledVehicleConstraint;
                break;
            case CONSTRAINT_TYPE_VEHICLE_TRACK:
                Constructor = TrackedVehicleConstraint;
                break;
            case CONSTRAINT_TYPE_VEHICLE_MOTO:
                Constructor = MotoVehicleConstraint;
                break;
            default:
                if ($_DEBUG) {
                    Debug.warn(`Trying to add unrecognized constraint type: ${type}`);
                }
                return null;
        }

        if (this._vehicleConstraint) {
            if ($_DEBUG) {
                Debug.warn('Trying to add a vehicle constraint to an entity that already has one. Aborting.');
            }
            return;
        }

        const constraint = new Constructor(this.entity, opts);

        // for fast access in Shape Component isometry update of wheels
        this._vehicleConstraint = constraint;

        const index = this.system.constraintMap.add(constraint);
        constraint.index = index;

        this._list.add(index);

        this.system.createConstraint(index, constraint, opts);

        return constraint;
    }

    onDisable() {
        const system = this.system;

        this._vehicleConstraint = null;

        this._list.forEach((idx) => {
            system.destroyConstraint(idx);
        });
    }
}

export { ConstraintComponent };

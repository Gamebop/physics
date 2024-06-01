import { Debug } from '../../debug.mjs';
import { Component } from '../component.mjs';
import { ConeConstraint } from './types/cone.mjs';
import { DistanceConstraint } from './types/distance.mjs';
import { FixedConstraint } from './types/fixed.mjs';
import { HingeConstraint } from './types/hinge.mjs';
import { PointConstraint } from './types/point.mjs';
import { PulleyConstraint } from './types/pulley.mjs';
import { SixDOFConstraint } from './types/six-dof.mjs';
import { SliderConstraint } from './types/slider.mjs';
import { SwingTwistConstraint } from './types/swing-twist.mjs';
import {
    BUFFER_READ_FLOAT32,
    CONSTRAINT_TYPE_CONE, CONSTRAINT_TYPE_DISTANCE, CONSTRAINT_TYPE_FIXED,
    CONSTRAINT_TYPE_HINGE, CONSTRAINT_TYPE_POINT, CONSTRAINT_TYPE_PULLEY,
    CONSTRAINT_TYPE_SIX_DOF, CONSTRAINT_TYPE_SLIDER, CONSTRAINT_TYPE_SWING_TWIST,
    CONSTRAINT_TYPE_VEHICLE_MOTO,
    CONSTRAINT_TYPE_VEHICLE_TRACK,
    CONSTRAINT_TYPE_VEHICLE_WHEEL
} from '../../constants.mjs';
import { WheeledVehicle } from './types/wheeled-vehicle.mjs';
import { Entity } from 'playcanvas';
import { TrackedVehicle } from './types/tracked-vehicle.mjs';
import { MotoVehicle } from './types/moto-vehicle.mjs';

/**
 * Constraint Component. Allows to add one or multiple constraints to an entity with a
 * {@link BodyComponent | Body Component}.
 *
 * @category Constraint Component
 */
class ConstraintComponent extends Component {
    _list = new Set();

    _vehicleConstraint = null;

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
     * import('./types/settings.mjs').SwingTwistConstraintSettings} [opts] - Optional joint options object.
     * @returns {FixedConstraint | PointConstraint | DistanceConstraint | HingeConstraint |
     * SliderConstraint | ConeConstraint | SixDOFConstraint | SwingTwistConstraint |
     * PulleyConstraint | null} - A constraint interface. Returns `null`, if unable to create one.
     */
    add(type, otherEntity, opts = {}) {
        if (!(otherEntity instanceof Entity)) {
            opts = otherEntity;
        }

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
            case CONSTRAINT_TYPE_VEHICLE_WHEEL:
                Constructor = WheeledVehicle;
                break;
            case CONSTRAINT_TYPE_VEHICLE_TRACK:
                Constructor = TrackedVehicle;
                break;
            case CONSTRAINT_TYPE_VEHICLE_MOTO:
                Constructor = MotoVehicle;
                break;
            default:
                if ($_DEBUG) {
                    Debug.warn(`Trying to add unrecognized constraint type: ${type}`);
                }
                return null;
        }

        const isVehicle = type === CONSTRAINT_TYPE_VEHICLE_WHEEL ||
                          type === CONSTRAINT_TYPE_VEHICLE_MOTO ||
                          type === CONSTRAINT_TYPE_VEHICLE_TRACK;
        const constraint = isVehicle ? new Constructor(this.entity, opts) :
                                       new Constructor(this.entity, otherEntity, opts);

        // for fast access in Shape Component isometry update of wheels
        this._vehicleConstraint = isVehicle ? constraint : null;

        const index = this.system.constraintMap.add(constraint);
        constraint.index = index;

        this._list.add(index);

        if (!isVehicle) {
            if (!otherEntity.constraint) {
                otherEntity.addComponent('constraint');
            }
            otherEntity.constraint.list.add(index);
        }

        this.system.createConstraint(index, constraint);

        return constraint;
    }

    updateWheelsIsometry(cb) {
        const vehicleConstraint = this._vehicleConstraint;
        if (!vehicleConstraint) {
            return;
        }

        const wheels = vehicleConstraint.wheels;
        const type = vehicleConstraint.type;
        const wheelsCount = wheels.length;
        const isWheeled = type === CONSTRAINT_TYPE_VEHICLE_MOTO ||
                          type === CONSTRAINT_TYPE_VEHICLE_MOTO;

        for (let i = 0; i < wheelsCount; i++) {
            const wheel = wheels[i];
            const entity = wheel.entity;

            if (!entity) {
                cb.skip(7 * FLOAT32_SIZE);
                continue;
            }

            if (isWheeled) {
                wheel.longitudinalSlip = cb.read(BUFFER_READ_FLOAT32);
                wheel.lateralSlip = cb.read(BUFFER_READ_FLOAT32);
                wheel.combinedLongitudinalFriction = cb.read(BUFFER_READ_FLOAT32);
                wheel.combinedLateralFriction = cb.read(BUFFER_READ_FLOAT32);
                wheel.brakeImpulse = cb.read(BUFFER_READ_FLOAT32);
            }

            entity.setLocalPosition(
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32)
            );

            entity.setLocalRotation(
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32)
            );
        }
    }

    onDisable() {
        const system = this.system;

        this._list.forEach((idx) => {
            system.destroyConstraint(idx);
        });
    }
}

export { ConstraintComponent };

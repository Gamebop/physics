import { ComponentSystem } from "../system.mjs";
import { ConstraintComponent } from "./component.mjs";
import { IndexedCache } from "../../../indexed-cache.mjs";
import { Debug } from "../../../debug.mjs";

const schema = [ 'list' ];

class ConstraintComponentSystem extends ComponentSystem {
    _constraintMap = new IndexedCache();

    constructor(app, manager, id) {
        super(app, manager);

        this._schema = [...this._schema, ...schema];

        manager.systems.set(id, this);
    }

    get id() {
        return 'constraint';
    }

    get ComponentType() {
        return ConstraintComponent;
    }

    get constraintMap() {
        return this._constraintMap;
    }

    onMessage(msg) {}

    createConstraint(index, joint) {
        const cb = this.manager.commandsBuffer;

        // entity1.body.constraints.set(index, entity2);
        // entity2.body.constraints.set(index, entity1);

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_CONSTRAINT);

        joint.write(cb);

        // switch (type) {
        //     case CONSTRAINT_TYPE_FIXED:
        //         JoltManager.writeFixedConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_POINT:
        //         JoltManager.writePointConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_DISTANCE:
        //         JoltManager.writeDistanceConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_HINGE:
        //         JoltManager.writeHingeConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_SLIDER:
        //         JoltManager.writeSliderConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_CONE:
        //         JoltManager.writeConeConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_SWING_TWIST:
        //         JoltManager.writeSwingTwistConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_SIX_DOF:
        //         JoltManager.writeSixDofConstraint(cb, opts);
        //         break;

        //     case CONSTRAINT_TYPE_PULLEY:
        //         JoltManager.writePulleyConstraint(cb, opts);
        //         break;

        //     default:
        //         DEBUG && Debug.error(`Unrecognized constraint type: ${ type }`);
        //         return;
        // }

        // cb.write(opts.numVelocityStepsOverride, BUFFER_WRITE_UINT8);
        // cb.write(opts.numPositionStepsOverride, BUFFER_WRITE_UINT8);
        // cb.write(opts.space, BUFFER_WRITE_UINT8);

        return index;
    }

    destroyConstraint(index) {
        const cb = this.manager.commandsBuffer;
        const map = this._constraintMap;
        const constraint = map.get(index);

        constraint.entity1.constraint.list.delete(index);
        constraint.entity2.constraint.list.delete(index);

        map.free(index);

        cb.writeOperator(OPERATOR_CLEANER);
        cb.writeCommand(CMD_DESTROY_CONSTRAINT);
        cb.write(index, BUFFER_WRITE_UINT32, false);
    }
}

export { ConstraintComponentSystem };
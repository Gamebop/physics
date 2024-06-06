import { JoltComponentSystem } from '../system.mjs';
import { ConstraintComponent } from './component.mjs';
import { IndexedCache } from '../../../indexed-cache.mjs';
import {
    BUFFER_WRITE_UINT32, CMD_CREATE_CONSTRAINT, CMD_DESTROY_CONSTRAINT, CONSTRAINT_TYPE_VEHICLE_MOTO, CONSTRAINT_TYPE_VEHICLE_TRACK, CONSTRAINT_TYPE_VEHICLE_WHEEL, OPERATOR_CLEANER,
    OPERATOR_CREATOR
} from '../../constants.mjs';

const schema = ['list'];

/**
 * Constraint Component System. Creates and destroys constraints from
 * {@link ConstraintComponent | Constraint Components} on the backend.
 *
 * @group Components
 * @category Constraint Component
 */
class ConstraintComponentSystem extends JoltComponentSystem {
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

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_CONSTRAINT);

        joint.write(cb);

        return index;
    }

    destroyConstraint(index) {
        const cb = this.manager.commandsBuffer;
        const map = this._constraintMap;
        const constraint = map.get(index);

        if (constraint.type === CONSTRAINT_TYPE_VEHICLE_MOTO ||
            constraint.type === CONSTRAINT_TYPE_VEHICLE_TRACK ||
            constraint.type === CONSTRAINT_TYPE_VEHICLE_WHEEL) {
            constraint.entity.constraint.list.delete(index);
        } else {
            constraint.entity1.constraint.list.delete(index);
            constraint.entity2.constraint.list.delete(index);
        }

        map.free(index);

        cb.writeOperator(OPERATOR_CLEANER);
        cb.writeCommand(CMD_DESTROY_CONSTRAINT);
        cb.write(index, BUFFER_WRITE_UINT32, false);
    }
}

export { ConstraintComponentSystem };

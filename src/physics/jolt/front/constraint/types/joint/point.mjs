import { CONSTRAINT_TYPE_POINT } from '../../../../constants.mjs';
import { JointConstraint } from './joint-constraint.mjs';

/**
 * Point constraint.
 *
 * @group Utilities
 * @category Joint Constraints
 */
class PointConstraint extends JointConstraint {
    _type = CONSTRAINT_TYPE_POINT;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);
    }

    /**
     * @returns {number} - Constraint type alias number.
     * @defaultValue CONSTRAINT_TYPE_POINT
     */
    get type() {
        return this._type;
    }
}

export { PointConstraint };

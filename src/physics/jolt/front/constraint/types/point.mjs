import { BUFFER_WRITE_VEC32, CONSTRAINT_TYPE_POINT } from '../../../constants.mjs';
import { Joint } from './base/joint.mjs';

/**
 * Interface for point constraint.
 *
 * @group Utilities
 * @category Constraints
 */
class PointConstraint extends Joint {
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

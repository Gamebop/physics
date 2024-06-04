import { Vec3 } from 'playcanvas';
import { Debug } from '../../../../debug.mjs';
import {
    BUFFER_WRITE_BOOL, BUFFER_WRITE_VEC32, CONSTRAINT_TYPE_FIXED
} from '../../../../constants.mjs';
import { Joint } from '../joint.mjs';

/**
 * Interface for fixed constraint.
 *
 * @group Utilities
 * @category Constraints
 */
class FixedConstraint extends Joint {
    _type = CONSTRAINT_TYPE_FIXED;

    _autoDetectPoint = true;

    _axisX1 = Vec3.RIGHT;

    _axisX2 = Vec3.RIGHT;

    _axisY1 = Vec3.UP;

    _axisY2 = Vec3.UP;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        this._autoDetectPoint = opts.autoDetectPoint ?? this._autoDetectPoint;

        if (opts.axisX1) this._axisX1 = opts.axisX1;
        if (opts.axisX2) this._axisX2 = opts.axisX2;
        if (opts.axisY1) this._axisY1 = opts.axisY1;
        if (opts.axisY2) this._axisY2 = opts.axisY2;
    }

    /**
     * @returns {Vec3} - X axis 1
     * @defaultValue Vec3(1, 0, 0)
     */
    get axisX1() {
        return this._axisX1;
    }

    /**
     * @returns {Vec3} - X axis 2
     * @defaultValue Vec3(1, 0, 0)
     */
    get axisX2() {
        return this._axisX2;
    }

    /**
     * @returns {Vec3} - Y axis 1
     * @defaultValue Vec3(0, 1, 0)
     */
    get axisY1() {
        return this._axisY1;
    }

    /**
     * @returns {Vec3} - Y axis 2
     * @defaultValue Vec3(0, 1, 0)
     */
    get axisY2() {
        return this._axisY2;
    }

    /**
     * @returns {number} - Constraint type alias number.
     * @defaultValue CONSTRAINT_TYPE_FIXED
     */
    get type() {
        return this._type;
    }

    write(cb) {
        super.write(cb);

        if ($_DEBUG) {
            let ok = Debug.checkBool(this._autoDetectPoint);
            ok = ok && Debug.checkVec(this._axisX1);
            ok = ok && Debug.checkVec(this._axisY1);
            ok = ok && Debug.checkVec(this._axisX2);
            ok = ok && Debug.checkVec(this._axisY2);
            if (!ok) {
                return;
            }
        }

        cb.write(this._autoDetectPoint, BUFFER_WRITE_BOOL);
        cb.write(this._axisX1, BUFFER_WRITE_VEC32);
        cb.write(this._axisY1, BUFFER_WRITE_VEC32);
        cb.write(this._axisX2, BUFFER_WRITE_VEC32);
        cb.write(this._axisY2, BUFFER_WRITE_VEC32);
    }
}

export { FixedConstraint };

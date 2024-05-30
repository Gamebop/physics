import { Entity, Vec3 } from 'playcanvas';
import { BUFFER_WRITE_UINT32, BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32, CONSTRAINT_SPACE_WORLD } from '../../../../constants.mjs';
import { Debug } from '../../../../debug.mjs';
import { Constraint, applyOptions } from './constraint.mjs';

class Joint extends Constraint {
    _point1 = Vec3.ZERO;

    _point2 = Vec3.ZERO;

    _entity1 = null;

    _entity2 = null;

    _space = CONSTRAINT_SPACE_WORLD;

    constructor(entity1, entity2, opts = {}) {
        super();

        this._entity1 = entity1;
        this._entity2 = entity2;

        applyOptions(this, opts);
    }

    /**
     * First body position in constraint reference frame. Space is determined by {@link space}
     * property.
     *
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 0, 0)
     */
    get point1() {
        return this._point1;
    }

    /**
     * Second body position in constraint reference frame. Space is determined by {@link space}
     * property.
     *
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 0, 0)
     */
    get point2() {
        return this._point2;
    }

    /**
     * First entity this joint is connected to.
     *
     * @returns {import('playcanvas').Entity} - First entity the joint is connected to.
     */
    get entity1() {
        return this._entity1;
    }

    /**
     * Second entity this joint is connected to.
     *
     * @returns {import('playcanvas').Entity} - Second entity the joint is connected to.
     */
    get entity2() {
        return this._entity2;
    }

    /**
     * Reference frame space that `point1` and `point2` use.
     *
     * @returns {number} - Number, representing reference space.
     * @defaultValue CONSTRAINT_SPACE_WORLD
     */
    get space() {
        return this._space;
    }

    write(cb) {
        if ($_DEBUG) {
            let ok = Debug.assert(this._entity1 instanceof Entity, 'Invalid entity1', this._entity1);
            ok = ok && Debug.assert(!!this._entity1.body, 'Invalid entity1', this._entity1);
            ok = ok && Debug.assert(this._entity2 instanceof Entity, 'Invalid entity2', this._entity2);
            ok = ok && Debug.assert(!!this._entity2.body, 'Invalid entity2', this._entity2);
            ok = ok && Debug.checkVec(this._point1, 'Invalid point1 vector.', this._point1);
            ok = ok && Debug.checkVec(this._point2, 'Invalid point2 vector.', this._point2);
            if (!ok) {
                return;
            }
        }

        super.write(cb);

        cb.write(this._entity1.body.index, BUFFER_WRITE_UINT32, false);
        cb.write(this._entity2.body.index, BUFFER_WRITE_UINT32, false);
        cb.write(this._space, BUFFER_WRITE_UINT8, false);
        cb.write(this._point1, BUFFER_WRITE_VEC32, false);
        cb.write(this._point2, BUFFER_WRITE_VEC32, false);
    }
}

export { Joint };
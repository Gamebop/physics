import { BUFFER_WRITE_VEC32, CONSTRAINT_TYPE_POINT } from "../../constants.mjs";
import { Constraint } from "./constraint.mjs";

class PointConstraint extends Constraint {
    _type = CONSTRAINT_TYPE_POINT;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);
    }

    write(cb) {
        super.write(cb);

        cb.write(this._point1, BUFFER_WRITE_VEC32);
        cb.write(this._point2, BUFFER_WRITE_VEC32);
    }
}

export { PointConstraint };
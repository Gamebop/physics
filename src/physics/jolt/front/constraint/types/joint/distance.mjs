import { Spring } from '../constraint.mjs';
import {
    BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT8, CMD_JNT_D_SET_DISTANCE,
    CMD_JNT_D_SET_SPRING_S, CONSTRAINT_TYPE_DISTANCE, OPERATOR_MODIFIER, SPRING_MODE_FREQUENCY
} from '../../../../constants.mjs';
import { Debug } from '../../../../debug.mjs';
import { JointConstraint } from './joint-constraint.mjs';

/**
 * Distance constraint.
 *
 * @group Utilities
 * @category Joint Constraints
 */
class DistanceConstraint extends JointConstraint {
    _minDistance = -1;

    _maxDistance = -1;

    _limitsSpring = null;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        this._type = CONSTRAINT_TYPE_DISTANCE;

        this._minDistance = opts.minDistance ?? this._minDistance;
        this._maxDistance = opts.maxDistance ?? this._maxDistance;

        if (opts.limitsSpringSettings) {
            this._limitsSpring = new Spring(opts.limitsSpringSettings);
        }
    }

    /**
     * Modifies the spring properties after the constraint has been created.
     *
     * @param {import('../settings.mjs').SpringSettings} settings - Object, describing spring settings.
     */
    set limitsSpring(settings) {
        if ($_DEBUG) {
            const ok = Debug.checkSpringSettings(settings);
            if (!ok) {
                return;
            }
        }

        const spring = new Spring(settings);
        this._limitsSpring = spring;

        const value = spring.springMode === SPRING_MODE_FREQUENCY ?
            spring.frequency : spring.stiffness;

        // TODO
        // needs update after we get rid of flags
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_D_SET_SPRING_S, this._index,
            true, BUFFER_WRITE_BOOL, false,
            spring.springMode, BUFFER_WRITE_UINT8, true,
            value, BUFFER_WRITE_FLOAT32, true,
            spring.damping, BUFFER_WRITE_FLOAT32, true
        );
    }

    /**
     * @returns {import('../settings.mjs').SpringSettings | null} - Returns limits spring settings
     * or `null` if spring is not used.
     * @defaultValue null
     */
    get limitsSpring() {
        return this._limitsSpring;
    }

    /**
     * Current minimum distance that constraint will try to keep bodies apart. If set to negative
     * number, it uses initial distance between two bodies, when the joint was created.
     * Only works when {@link space} is set to `CONSTRAINT_SPACE_WORLD`.
     *
     * @returns {number} - Minimum distance to keep bodies apart.
     * @defaultValue -1
     */
    get minDistance() {
        return this._minDistance;
    }

    /**
     * Current maximum distance that constraint will try to keep bodies apart. If set to negative
     * number, it uses initial distance between two bodies, when the joint was created.
     * Only works when {@link space} is set to `CONSTRAINT_SPACE_WORLD`.
     *
     * @returns {number} - Maximum distance to keep bodies apart.
     * @defaultValue -1
     */
    get maxDistance() {
        return this._maxDistance;
    }

    /**
     * @returns {number} - Constraint type alias number.
     * @defaultValue CONSTRAINT_TYPE_DISTANCE
     */
    get type() {
        return this._type;
    }

    write(cb) {
        super.write(cb);

        cb.write(this._minDistance, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxDistance, BUFFER_WRITE_FLOAT32, false);

        JointConstraint.writeSpringSettings(cb, this._limitsSpring);
    }

    /**
     * Changes the distance limits for the constraint. In meters.
     *
     * @param {number} min - Lower distance limit.
     * @param {number} max - Upper distance limit.
     */
    setDistance(min, max) {
        if ($_DEBUG) {
            let ok = Debug.checkFloat(min);
            ok = ok && Debug.checkFloat(max);
            ok = ok && Debug.assert(min <= max, `Invalid min/max range: [${min} : ${max}]`);
            if (!ok) {
                return;
            }
        }

        this._limitsMin = min;
        this._limitsMax = max;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_D_SET_DISTANCE, this._index,
            min, BUFFER_WRITE_FLOAT32, false,
            max, BUFFER_WRITE_FLOAT32, false
        );
    }
}

export { DistanceConstraint };

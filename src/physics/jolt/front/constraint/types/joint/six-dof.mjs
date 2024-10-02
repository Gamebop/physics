import { Vec3 } from 'playcanvas';
import { Debug } from '../../../../debug.mjs';
import { Motor, Spring } from '../constraint.mjs';
import {
    BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT8,
    BUFFER_WRITE_VEC32, CMD_JNT_SDF_SET_M_F, CMD_JNT_SDF_SET_M_STATE,
    CMD_JNT_SDF_SET_R_LIMITS, CMD_JNT_SDF_SET_SPRING_S, CMD_JNT_SDF_SET_T_ANG_VEL_CS,
    CMD_JNT_SDF_SET_T_LIMITS, CMD_JNT_SDF_SET_T_POS_CS, CMD_JNT_SDF_SET_T_ROT_BS,
    CMD_JNT_SDF_SET_T_ROT_CS, CMD_JNT_SDF_SET_T_VEL_CS, CONSTRAINT_SWING_TYPE_CONE,
    CONSTRAINT_TYPE_SIX_DOF, OPERATOR_MODIFIER, SPRING_MODE_FREQUENCY
} from '../../../../constants.mjs';
import { JointConstraint } from './joint-constraint.mjs';

function copyArr(src, dst) {
    for (let i = 0; i < src.length; ++i) {
        dst[i] = src[i];
    }
}

function copySettings(Constructor, src) {
    const settings = [];
    for (let i = 0; i < 6; ++i) {
        settings.push(new Constructor(src[i]));
    }
    return settings;
}

/**
 * Six degrees of freedom (six DOF) constraint.
 *
 * @group Utilities
 * @category Joint Constraints
 */
class SixDOFConstraint extends JointConstraint {
    _type = CONSTRAINT_TYPE_SIX_DOF;

    _axisX1 = Vec3.RIGHT;

    _axisX2 = Vec3.RIGHT;

    _axisY1 = Vec3.UP;

    _axisY2 = Vec3.UP;

    _fixedAxes = null;

    _freeAxes = null;

    _limitedAxes = null;

    _limitMax = null;

    _limitMin = null;

    _maxFriction = null;

    _swingType = CONSTRAINT_SWING_TYPE_CONE;

    _limitsSpringSettings = null;

    _motorSettings = null;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        if (opts.axisX1) this._axisX1 = opts.axisX1;
        if (opts.axisX2) this._axisX2 = opts.axisX2;
        if (opts.axisY1) this._axisY1 = opts.axisY1;
        if (opts.axisY2) this._axisY2 = opts.axisY2;

        this._swingType = opts.swingType ?? this._swingType;

        if (opts.fixedAxes) {
            this._fixedAxes = [];
            copyArr(opts.fixedAxes, this._fixedAxes);
        } else if (opts.freeAxes) {
            this._freeAxes = [];
            copyArr(opts.freeAxes, this._freeAxes);
        } else if (opts.limitedAxes) {
            this._limitedAxes = [];
            copyArr(opts.limitedAxes, this._limitedAxes);
        }

        if (opts.limitMin) {
            this._limitMin = [];
            copyArr(opts.limitMin, this._limitMin);
        }

        if (opts.limitMax) {
            this._limitMax = [];
            copyArr(opts.limitMax, this._limitMax);
        }

        if (opts.maxFriction) {
            this._maxFriction = [];
            copyArr(opts.maxFriction, this._maxFriction);
        }

        if (opts.limitsSpringSettings) {
            this._limitsSpringSettings = copySettings(Spring, opts.limitsSpringSettings);
        }

        if (opts.motorSettings) {
            this._motorSettings = copySettings(Motor, opts.motorSettings);
        }
    }

    /**
     * @returns {Vec3} - X axis 1.
     * @defaultValue Vec3(1, 0, 0)
     */
    get axisX1() {
        return this._axisX1;
    }

    /**
     * @returns {Vec3} - X axis 2.
     * @defaultValue Vec3(1, 0, 0)
     */
    get axisX2() {
        return this._axisX2;
    }

    /**
     * @returns {Vec3} - Y axis 1.
     * @defaultValue Vec3(0, 1, 0)
     */
    get axisY1() {
        return this._axisY1;
    }

    /**
     * @returns {Vec3} - Y axis 1.
     * @defaultValue Vec3(0, 1, 0)
     */
    get axisY2() {
        return this._axisY2;
    }

    /**
     * @returns {number} - Constraint type alias number.
     * @defaultValue CONSTRAINT_TYPE_SIX_DOF
     */
    get type() {
        return this._type;
    }

    /**
     * Modifies translation limits of the constraint after it was created. In meters.
     *
     * @param {number} min - Lower limit of the constraint.
     * @param {number} max - Upper limit of the constraint.
     */
    setTranslationLimits(min, max) {
        if ($_DEBUG) {
            let ok = Debug.checkVec(min);
            ok = ok && Debug.checkVec(max);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_LIMITS, this._index,
            min, BUFFER_WRITE_VEC32, false,
            max, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Modifies rotation limits of the constraint after it was created. In radians.
     *
     * @param {number} min - Lower limit of the constraint.
     * @param {number} max - Upper limit of the constraint.
     */
    setRotationLimits(min, max) {
        if ($_DEBUG) {
            let ok = Debug.checkVec(min);
            ok = ok && Debug.checkVec(max);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_R_LIMITS, this._index,
            min, BUFFER_WRITE_VEC32, false,
            max, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Modifies a spring of the constraint for the selected axis, after it was created.
     * ```
     * // axis
     * [posX, posY, posZ, rotX, rotY, rotZ]
     * ```
     * @example
     * ```
     * // change the spring settings used on X axis of rotation
     * constraint.setLimitsSpringSettings(3, springSettings);
     * ```
     *
     * @param {number} axis - Axis number, zero-based.
     * @param {import('../settings.mjs').SpringSettings} settings - Spring settings.
     */
    setLimitsSpringSettings(axis, settings) {
        if ($_DEBUG) {
            let ok = Debug.checkUint(axis);
            ok = ok && Debug.checkSpringSettings(settings);
            if (!ok) {
                return;
            }
        }

        const mode = settings.springMode ?? SPRING_MODE_FREQUENCY;
        const freqOrStiff = mode === SPRING_MODE_FREQUENCY ?
            settings.frequency : settings.stiffness;

        // TODO
        // needs update after we get rid of flags
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_SPRING_S, this._index,
            true, BUFFER_WRITE_BOOL, false,
            settings.springMode, BUFFER_WRITE_UINT8, true,
            freqOrStiff, BUFFER_WRITE_FLOAT32, true,
            settings.damping, BUFFER_WRITE_FLOAT32, true,
            axis, BUFFER_WRITE_UINT8, false
        );
    }

    /**
     * Modifies the max friction for selected axis (friction force for translation, friction torque
     * for rotation).
     *
     * See {@link setLimitsSpringSettings} for example.
     *
     * @param {number} axis - Axis number, zero-based.
     * @param {number} friction - Friction value.
     */
    setMaxFriction(axis, friction) {
        if ($_DEBUG) {
            let ok = Debug.checkUint(axis);
            ok = ok && Debug.checkFloat(friction);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_M_F, this._index,
            axis, BUFFER_WRITE_UINT8, false,
            friction, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * Changes the motor state, e.g. turn it on/off. Following aliases available:
     * ```
     * MOTOR_STATE_OFF
     * ```
     * ```
     * MOTOR_STATE_VELOCITY
     * ```
     * ```
     * MOTOR_STATE_POSITION
     * ```
     *
     * - `MOTOR_STATE_POSITION`: Motor will drive to target position.
     * - `MOTOR_STATE_VELOCITY`: Motor will drive to target velocity.
     *
     * See {@link setLimitsSpringSettings} for example.
     *
     * @param {number} axis - Axis number, zero-based.
     * @param {number} state - Constants, representing the state.
     */
    setMotorState(axis, state) {
        if ($_DEBUG) {
            let ok = Debug.checkUint(axis);
            ok = ok && Debug.checkUint(state);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_M_STATE, this._index,
            axis, BUFFER_WRITE_UINT8, false,
            state, BUFFER_WRITE_UINT8, false
        );
    }

    /**
     * Sets the target velocity for the constraint (constraint space).
     *
     * @param {Vec3} velocity - Target velocity.
     */
    setTargetVelocityCS(velocity) {
        if ($_DEBUG) {
            const ok = Debug.checkVec(velocity);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_VEL_CS, this._index,
            velocity, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Sets the target angular velocity for the constraint (constraint space).
     *
     * @param {Vec3} velocity - Target velocity.
     */
    setTargetAngularVelocityCS(velocity) {
        if ($_DEBUG) {
            const ok = Debug.checkVec(velocity);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_ANG_VEL_CS, this._index,
            velocity, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Sets the target position for the constraint (constraint space).
     *
     * @param {Vec3} position - Target position.
     */
    setTargetPositionCS(position) {
        if ($_DEBUG) {
            const ok = Debug.checkVec(position);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_POS_CS, this._index,
            position, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Sets the target orientation for the constraint (constraint space).
     *
     * @param {import('playcanvas').Quat} rotation - Target orientation.
     */
    setTargetOrientationCS(rotation) {
        if ($_DEBUG) {
            const ok = Debug.checkQuat(rotation);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_ROT_CS, this._index,
            rotation, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Sets the target orientation for the constraint (body space). Refer to Jolt documentation
     * for details.
     *
     * @param {import('playcanvas').Quat} rotation - Target orientation.
     */
    setTargetOrientationBS(rotation) {
        if ($_DEBUG) {
            const ok = Debug.checkQuat(rotation);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SDF_SET_T_ROT_BS, this._index,
            rotation, BUFFER_WRITE_VEC32, false
        );
    }

    write(cb) {
        super.write(cb);

        const maxFriction = this._maxFriction;
        const limitMin = this._limitMin;
        const limitMax = this._limitMax;

        JointConstraint.writeAxes(cb, this._freeAxes);
        JointConstraint.writeAxes(cb, this._fixedAxes);
        JointConstraint.writeAxes(cb, this._limitedAxes, true);

        cb.write(this._axisX1, BUFFER_WRITE_VEC32, false);
        cb.write(this._axisY1, BUFFER_WRITE_VEC32, false);
        cb.write(this._axisX2, BUFFER_WRITE_VEC32, false);
        cb.write(this._axisY2, BUFFER_WRITE_VEC32, false);

        cb.write(!!maxFriction, BUFFER_WRITE_BOOL, false);
        if (maxFriction) {
            for (let i = 0; i < 6; i++) {
                cb.write(maxFriction[i], BUFFER_WRITE_FLOAT32, false);
            }
        }

        cb.write(!!limitMin, BUFFER_WRITE_BOOL, false);
        if (limitMin) {
            for (let i = 0; i < 6; i++) {
                cb.write(limitMin[i], BUFFER_WRITE_FLOAT32, false);
            }
        }

        cb.write(!!limitMax, BUFFER_WRITE_BOOL, false);
        if (limitMax) {
            for (let i = 0; i < 6; i++) {
                cb.write(limitMax[i], BUFFER_WRITE_FLOAT32, false);
            }
        }

        const limitsSpringSettings = this._limitsSpringSettings;
        const motorSettings = this._motorSettings;

        cb.write(!!limitsSpringSettings, BUFFER_WRITE_BOOL, false);
        if (!!limitsSpringSettings) {
            for (let i = 0; i < 6; ++i) {
                JointConstraint.writeSpringSettings(cb, limitsSpringSettings[i]);
            }
        }

        cb.write(!!motorSettings, BUFFER_WRITE_BOOL, false);
        if (!!motorSettings) {
            for (let i = 0; i < 6; ++i) {
                JointConstraint.writeMotorSettings(cb, motorSettings[i]);
            }
        }
    }
}

export { SixDOFConstraint };

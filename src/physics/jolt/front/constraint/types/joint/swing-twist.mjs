import { Vec3 } from 'playcanvas';
import { Debug } from '../../../../debug.mjs';
import { Motor } from '../constraint.mjs';
import {
    BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32, CMD_JNT_ST_SET_M_F_TORQUE,
    CMD_JNT_ST_SET_N_H_C_ANGLE, CMD_JNT_ST_SET_P_H_C_ANGLE, CMD_JNT_ST_SET_SWING_M_S,
    CMD_JNT_ST_SET_TWIST_M_S, CMD_JNT_ST_SET_T_ANG_VEL_CS, CMD_JNT_ST_SET_T_MAX_ANGLE, CMD_JNT_ST_SET_T_MIN_ANGLE,
    CMD_JNT_ST_SET_T_O_BS, CMD_JNT_ST_SET_T_O_CS, CONSTRAINT_TYPE_SWING_TWIST,
    OPERATOR_MODIFIER
} from '../../../../constants.mjs';
import { JointConstraint } from './joint-constraint.mjs';

/**
 * @import { Quat } from 'playcanvas'
 */

/**
 * Swing-twist constraint.
 *
 * @group Utilities
 * @category Joint Constraints
 */
class SwingTwistConstraint extends JointConstraint {
    _type = CONSTRAINT_TYPE_SWING_TWIST;

    _twistAxis1 = Vec3.RIGHT;

    _twistAxis2 = Vec3.RIGHT;

    _planeAxis1 = Vec3.UP;

    _planeAxis2 = Vec3.UP;

    _normalHalfConeAngle = 0;

    _planeHalfConeAngle = 0;

    _twistMinAngle = 0;

    _twistMaxAngle = 0;

    _maxFrictionTorque = 0;

    _swingMotorSettings = null;

    _twistMotorSettings = null;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        this._twistAxis1 = opts.twistAxis1 || this._twistAxis1;
        this._twistAxis2 = opts.twistAxis2 || this._twistAxis2;
        this._planeAxis1 = opts.planeAxis1 || this._planeAxis1;
        this._planeAxis2 = opts.planeAxis2 || this._planeAxis2;
        this._normalHalfConeAngle = opts.normalHalfConeAngle ?? this._normalHalfConeAngle;
        this._planeHalfConeAngle = opts.planeHalfConeAngle ?? this._planeHalfConeAngle;

        this._twistMinAngle = opts.twistMinAngle ?? this._twistMinAngle;
        this._twistMaxAngle = opts.twistMaxAngle ?? this._twistMaxAngle;
        this._maxFrictionTorque = opts.maxFrictionTorque ?? this._maxFrictionTorque;

        if (opts.swingMotorSettings) {
            this._swingMotorSettings = new Motor(opts.swingMotorSettings);
        }

        if (opts.twistMotorSettings) {
            this._twistMotorSettings = new Motor(opts.twistMotorSettings);
        }
    }

    /**
     * Sets max friction torque.
     *
     * @param {number} torque - Friction torque value.
     */
    set maxFrictionTorque(torque) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(torque);
            if (!ok) {
                return;
            }
        }

        if (this._maxFrictionTorque === torque) {
            return;
        }

        this._maxFrictionTorque = torque;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_M_F_TORQUE, this._index,
            torque, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * @returns {number} - Max friction torque value.
     * @defaultValue 0
     */
    get maxFrictionTorque() {
        return this._maxFrictionTorque;
    }

    /**
     * @returns {import('../settings.mjs').SpringSettings | null} - Returns {@link SpringSettings |
     * Spring Settings} or `null`, if spring is not used.
     * @defaultValue null
     */
    get swingMotorSettings() {
        return this._swingMotorSettings;
    }

    /**
     * Sets normal half cone angle. In radians.
     *
     * @param {number} angle - Normal half cone angle (rads).
     */
    set normalHalfConeAngle(angle) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(angle);
            if (!ok) {
                return;
            }
        }

        if (this._normalHalfConeAngle === angle) {
            return;
        }

        this._normalHalfConeAngle = angle;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_N_H_C_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * @returns {number} - Normal half cone angle.
     * @defaultValue 0
     */
    get normalHalfConeAngle() {
        return this._normalHalfConeAngle;
    }

    /**
     * Sets plane half cone angle. In radians.
     *
     * @param {number} angle - Plane half cone angle (rads).
     */
    set planeHalfConeAngle(angle) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(angle);
            if (!ok) {
                return;
            }
        }

        if (this._planeHalfConeAngle === angle) {
            return;
        }

        this._planeHalfConeAngle = angle;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_P_H_C_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * @returns {number} - Plane half cone angle.
     * @defaultValue 0
     */
    get planeHalfConeAngle() {
        return this._planeHalfConeAngle;
    }

    /**
     * @returns {Vec3} - Twist axis 1.
     * @defaultValue Vec3(1, 0, 0)
     */
    get twistAxis1() {
        return this._twistAxis1;
    }

    /**
     * @returns {Vec3} - Twist axis 2.
     * @defaultValue Vec3(1, 0, 0)
     */
    get twistAxis2() {
        return this._twistAxis2;
    }

    /**
     * Sets twist maximum angle. In radians.
     *
     * @param {number} angle - Max twist angle in radians.
     */
    set twistMaxAngle(angle) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(angle);
            if (!ok) {
                return;
            }
        }

        if (this._twistMaxAngle === angle) {
            return;
        }

        this._twistMaxAngle = angle;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_T_MAX_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * @returns {number} - Max twist angle angle.
     */
    get twistMaxAngle() {
        return this._twistMaxAngle;
    }

    /**
     * Sets minimum twist angle. In radians.
     *
     * @param {number} angle - Min twist angle in radians.
     */
    set twistMinAngle(angle) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(angle);
            if (!ok) {
                return;
            }
        }

        if (this._twistMinAngle === angle) {
            return;
        }

        this._twistMinAngle = angle;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_T_MIN_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * @returns {number} - Min twist angle.
     * @defaultValue 0
     */
    get twistMinAngle() {
        return this._twistMinAngle;
    }

    /**
     * @returns {import('../settings.mjs').MotorSettings | null} - Returns {@link MotorSettings |
     * Motor Settings} or `null`, if a motor is not used.
     */
    get twistMotorSettings() {
        return this._twistMotorSettings;
    }

    /**
     * Set the target orientation in constraint space.
     *
     * @param {Quat} rotation - Target orientation.
     */
    setTargetOrientationCS(rotation) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_T_O_CS, this._index,
            rotation, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Set the target orientation in body space. Refer to Jolt documentation for details.
     *
     * @param {Quat} rotation - Target orientation.
     */
    setTargetOrientationBS(rotation) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_T_O_BS, this._index,
            rotation, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Set the target angular velocity of body 2 in constraint space of body 2.
     *
     * @param {Vec3} velocity - Target angular velocity.
     */
    setTargetAngularVelocityCS(velocity) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_T_ANG_VEL_CS, this._index,
            velocity, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Changes the swing motor state, e.g. turn it on/off. Following aliases available:
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
     * @param {number} state - Constant number, representing the state.
     */
    setSwingMotorState(state) {
        if ($_DEBUG) {
            const ok = Debug.checkUint(state);
            if (!ok) {
                return;
            }
        }
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_SWING_M_S, this._index,
            state, BUFFER_WRITE_UINT8, false
        );
    }

    /**
     * Sets twist motor state. See {@link setSwingMotorState} for description.
     *
     * @param {number} state - Constant number, representing the state.
     */
    setTwistMotorState(state) {
        if ($_DEBUG) {
            const ok = Debug.checkUint(state);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_ST_SET_TWIST_M_S, this._index,
            state, BUFFER_WRITE_UINT8, false
        );
    }

    write(cb) {
        super.write(cb);

        cb.write(this._twistAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._planeAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._twistAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._planeAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._normalHalfConeAngle, BUFFER_WRITE_FLOAT32);
        cb.write(this._planeHalfConeAngle, BUFFER_WRITE_FLOAT32);
        cb.write(this._twistMinAngle, BUFFER_WRITE_FLOAT32);
        cb.write(this._twistMaxAngle, BUFFER_WRITE_FLOAT32);
        cb.write(this._maxFrictionTorque, BUFFER_WRITE_FLOAT32);

        JointConstraint.writeMotorSettings(cb, this._swingMotorSettings);
        JointConstraint.writeMotorSettings(cb, this._twistMotorSettings);
    }
}

export { SwingTwistConstraint };

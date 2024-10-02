import { Vec3 } from 'playcanvas';
import { Debug } from '../../../../debug.mjs';
import { Spring, Motor } from '../constraint.mjs';
import {
    BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT8,
    BUFFER_WRITE_VEC32, CMD_JNT_S_SET_LIMITS, CMD_JNT_S_SET_M_F_FORCE,
    CMD_JNT_S_SET_M_STATE, CMD_JNT_S_SET_SPRING_S, CMD_JNT_S_SET_T_POS,
    CMD_JNT_S_SET_T_VEL, CONSTRAINT_TYPE_SLIDER, OPERATOR_MODIFIER,
    SPRING_MODE_FREQUENCY
} from '../../../../constants.mjs';
import { JointConstraint } from './joint-constraint.mjs';

/**
 * Slider constraint.
 *
 * @group Utilities
 * @category Joint Constraints
 */
class SliderConstraint extends JointConstraint {
    _type = CONSTRAINT_TYPE_SLIDER;

    _sliderAxis1 = Vec3.RIGHT;

    _sliderAxis2 = Vec3.RIGHT;

    _normalAxis1 = Vec3.UP;

    _normalAxis2 = Vec3.UP;

    _limitsMin = -Number.MAX_VALUE;

    _limitsMax = Number.MAX_VALUE;

    _maxFrictionForce = 0;

    _limitsSpringSettings = null;

    _motorSettings = null;

    constructor(entity1, entity2, opts = {}) {
        super(entity1, entity2, opts);

        if (opts.sliderAxis1) this._sliderAxis1 = opts.sliderAxis1;
        if (opts.sliderAxis2) this._sliderAxis2 = opts.sliderAxis2;
        if (opts.normalAxis1) this._normalAxis1 = opts.normalAxis1;
        if (opts.normalAxis2) this._normalAxis2 = opts.normalAxis2;

        this._limitsMin = opts.limitsMin ?? this._limitsMin;
        this._limitsMax = opts.limitsMax ?? this._limitsMax;
        this._maxFrictionForce = opts.maxFrictionForce ?? this._maxFrictionForce;

        if (opts.limitsSpringSettings) {
            this._limitsSpringSettings = new Spring(opts.limitsSpringSettings);
        }

        if (opts.motorSettings) {
            this._motorSettings = new Motor(opts.motorSettings);
        }
    }

    /**
     * Get lower limit of the slider constraint. In meters.
     *
     * @returns {number} - Lower limit of the constraint.
     */
    get limitsMax() {
        return this._limitsMax;
    }

    /**
     * Get upper limit of the slider constraint. In meters.
     *
     * @returns {number} - Upper limit of the constraint.
     */
    get limitsMin() {
        return this._limitsMin;
    }

    /**
     * Modifies the spring properties after the constraint has been created.
     *
     * @param {import('../settings.mjs').SpringSettings} settings - Object, describing spring settings.
     */
    set limitsSpringSettings(settings) {
        if ($_DEBUG) {
            const ok = Debug.checkSpringSettings(settings);
            if (!ok) {
                return;
            }
        }

        this._limitsSpringSettings = settings;

        const mode = settings.springMode ?? SPRING_MODE_FREQUENCY;
        const freqOrStiff = mode === SPRING_MODE_FREQUENCY ?
            settings.frequency : settings.stiffness;

        // TODO
        // needs update after we get rid of flags
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_S_SET_SPRING_S, this._index,
            true, BUFFER_WRITE_BOOL, false,
            settings.springMode, BUFFER_WRITE_UINT8, true,
            freqOrStiff, BUFFER_WRITE_FLOAT32, true,
            settings.damping, BUFFER_WRITE_FLOAT32, true
        );
    }

    /**
     * @returns {import('../settings.mjs').SpringSettings | null} - If spring is used, returns
     * current spring settings. Otherwise `null`.
     * @defaultValue null
     */
    get limitsSpringSettings() {
        return this._limitsSpringSettings;
    }


    /**
     * Sets max friction force on the constraint after it was created.
     *
     * @param {number} force - Friction force (newtons).
     */
    set maxFrictionForce(force) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(force);
            if (!ok) {
                return;
            }
        }

        if (this._maxFrictionForce === force) {
            return;
        }

        this._maxFrictionForce = force;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_S_SET_M_F_FORCE, this._index,
            force, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * Maximum amount of friction force to apply when not driven by a motor.
     *
     * @returns {number} - Friction value.
     * @defaultValue 0 (newtons)
     */
    get maxFrictionForce() {
        return this._maxFrictionForce;
    }

    /**
     * If motor is used, returns {@link MotorSettings | Motor Settings}. Otherwise `null`.
     *
     * @type {MotorSettings}
     * @defaultValue null
     */
    get motorSettings() {
        return this._motorSettings;
    }

    /**
     * @returns {Vec3} - Normal axis 1.
     * @defaultValue Vec3(0, 1, 0)
     */
    get normalAxis1() {
        return this._normalAxis1;
    }

    /**
     * @returns {Vec3} - Normal axis 2.
     * @defaultValue Vec3(0, 1, 0)
     */
    get normalAxis2() {
        return this._normalAxis2;
    }

    /**
     * @returns {Vec3} - Slider axis 1.
     * @defaultValue Vec3(1, 0, 0)
     */
    get sliderAxis1() {
        return this._sliderAxis1;
    }

    /**
     * @returns {Vec3} - Slider axis 2.
     * @defaultValue Vec3(1, 0, 0)
     */
    get sliderAxis2() {
        return this._sliderAxis2;
    }

    /**
     * @returns {number} - Constraint type alias number.
     * @defaultValue CONSTRAINT_TYPE_SLIDER
     */
    get type() {
        return this._type;
    }

    write(cb) {
        super.write(cb);

        cb.write(this._autoDetectPoint, BUFFER_WRITE_BOOL);
        cb.write(this._sliderAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._normalAxis1, BUFFER_WRITE_VEC32);
        cb.write(this._sliderAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._normalAxis2, BUFFER_WRITE_VEC32);
        cb.write(this._limitsMin, BUFFER_WRITE_FLOAT32);
        cb.write(this._limitsMax, BUFFER_WRITE_FLOAT32);
        cb.write(this._maxFrictionForce, BUFFER_WRITE_FLOAT32);

        JointConstraint.writeSpringSettings(cb, this._limitsSpringSettings);
        JointConstraint.writeMotorSettings(cb, this._motorSettings);
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
     * @param {number} state - Constant number, representing the state.
     */
    setMotorState(state) {
        if ($_DEBUG) {
            const ok = Debug.checkUint(state);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_S_SET_M_STATE, this._index,
            state, BUFFER_WRITE_UINT8, false
        );
    }

    /**
     * Sets motor's target velocity. The motor needs to be operating in velocity mode. See {@link
     * setMotorState}.
     *
     * @param {number} velocity - Number, radians per second
     */
    setTargetVelocity(velocity) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(velocity);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_S_SET_T_VEL, this._index,
            velocity, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * Sets a target angle for the motor to drive to. The motor needs to be operating in position
     * mode. See {@link setMotorState}.
     *
     * @param {number} angle - Number, radians.
     */
    setTargetPosition(angle) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(angle);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_S_SET_T_POS, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * Update the translational limits of the slider after the constraint has been created.
     *
     * @param {number} min - Lower limit of the hinge angle.
     * @param {number} max - Upper limit of the hinge angle.
     */
    setLimits(min, max) {
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
            OPERATOR_MODIFIER, CMD_JNT_S_SET_LIMITS, this._index,
            min, BUFFER_WRITE_FLOAT32, false,
            max, BUFFER_WRITE_FLOAT32, false
        );
    }
}

export { SliderConstraint };

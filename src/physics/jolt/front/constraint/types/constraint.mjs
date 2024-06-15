import { Debug } from '../../../debug.mjs';
import {
    BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT16, BUFFER_WRITE_UINT32, BUFFER_WRITE_UINT8,
    CMD_JNT_SET_ENABLED, CONSTRAINT_TYPE_UNDEFINED, OPERATOR_MODIFIER, SPRING_MODE_FREQUENCY
} from '../../../constants.mjs';
import { Curve, Vec3 } from 'playcanvas';

function applyOptions(instance, opts) {
    for (const [key, val] of Object.entries(opts)) {
        const prop = '_' + key;
        if (instance[prop] === undefined) continue;
        if (val instanceof Vec3 || val instanceof Curve) {
            instance[prop] = val.clone();
        } else {
            instance[prop] = val;
        }
    }
}

class Spring {
    springMode = SPRING_MODE_FREQUENCY;

    frequency = 0;

    stiffness = 1;

    damping = 0;

    constructor(opts = {}) {
        this.springMode = opts.springMode ?? this.springMode;
        this.frequency = opts.frequency ?? this.frequency;
        this.stiffness = opts.stiffness ?? this.stiffness;
        this.damping = opts.damping ?? this.damping;
    }
}

class Motor {
    minForceLimit = -Number.MAX_VALUE;

    maxForceLimit = Number.MAX_VALUE;

    minTorqueLimit = -Number.MAX_VALUE;

    maxTorqueLimit = Number.MAX_VALUE;

    springSettings = null;

    /**
     * Creates a motor.
     *
     * @param {import('./settings.mjs').MotorSettings} [opts] - Optional object, describing motor
     * settings.
     */
    constructor(opts = {}) {
        this.minForceLimit = opts.minForceLimit ?? this.minForceLimit;
        this.maxForceLimit = opts.maxForceLimit ?? this.maxForceLimit;
        this.minTorqueLimit = opts.minTorqueLimit ?? this.minTorqueLimit;
        this.maxTorqueLimit = opts.maxTorqueLimit ?? this.maxTorqueLimit;

        if (opts.springSettings) {
            this.springSettings = new Spring(opts.springSettings);
        }
    }
}

/**
 * Base class for different types of constraint interfaces.
 *
 * @group Utilities
 * @category Constraints
 */
class Constraint {
    static defaultMotor = new Motor();

    static writeAxes(cb, axes, limits) {
        cb.write(!!axes, BUFFER_WRITE_BOOL, false);
        if (axes) {
            const count = axes.length;
            if (limits) {
                cb.write(count / 3, BUFFER_WRITE_UINT8, false);
                for (let i = 0; i < count; i += 3) {
                    cb.write(axes[i], BUFFER_WRITE_UINT8, false);
                    cb.write(axes[i + 1], BUFFER_WRITE_FLOAT32, false);
                    cb.write(axes[i + 2], BUFFER_WRITE_FLOAT32, false);
                }
            } else {
                cb.write(count, BUFFER_WRITE_UINT8, false);
                for (let i = 0; i < count; i++) {
                    cb.write(axes[i], BUFFER_WRITE_UINT8, false);
                }
            }
        }
    }

    static writeMotorSettings(cb, settings) {
        cb.write(!!settings, BUFFER_WRITE_BOOL, false);
        if (settings !== null) {
            Constraint.writeSpringSettings(cb, settings.springSettings);
            cb.write(settings.minForceLimit, BUFFER_WRITE_FLOAT32);
            cb.write(settings.maxForceLimit, BUFFER_WRITE_FLOAT32);
            cb.write(settings.minTorqueLimit, BUFFER_WRITE_FLOAT32);
            cb.write(settings.maxTorqueLimit, BUFFER_WRITE_FLOAT32);
        }
    }

    static writeSpringSettings(cb, settings) {
        cb.write(!!settings, BUFFER_WRITE_BOOL, false);
        if (settings != null) {
            cb.write(settings.springMode ?? SPRING_MODE_FREQUENCY, BUFFER_WRITE_UINT8, false);
            if (settings.springMode === SPRING_MODE_FREQUENCY) {
                cb.write(settings.frequency ?? 1.5, BUFFER_WRITE_FLOAT32, false);
            } else {
                cb.write(settings.stiffness ?? 1.5, BUFFER_WRITE_FLOAT32, false);
            }
            cb.write(settings.damping ?? 0.5, BUFFER_WRITE_FLOAT32, false);
        }
    }

    _index = -1;

    _type = CONSTRAINT_TYPE_UNDEFINED;

    _numVelocityStepsOverride = 0;

    _numPositionStepsOverride = 0;

    /**
     * Unique constraint index to link to physics object. Index can be re-used by another constraint, when this one is
     * destroyed.
     *
     * @hidden
     */
    set index(idx) {
        this._index = idx;
    }

    /**
     * @hidden
     * @returns {number} - Constraint unique integer index.
     */
    get index() {
        return this._index;
    }

    /**
     * Override for the number of solver velocity iterations to run. If set to `0`, the constraint
     * will use global default set by Physics initialization setting
     * {@link JoltInitSettings.numVelocitySteps}.
     *
     * @returns {number} - Velocity steps override.
     * @defaultValue 0
     */
    get numVelocityStepsOverride() {
        return this._numVelocityStepsOverride;
    }

    /**
     * Override for the number of solver position iterations to run. If set to `0`, the constraint
     * will use global default set by Physics initialization setting
     * {@link JoltInitSettings.numPositionSteps}.
     *
     * @returns {number} - Positions steps override.
     * @defaultValue 0
     */
    get numPositionStepsOverride() {
        return this._numPositionStepsOverride;
    }

    /**
     * @hidden
     * @returns {import('../system.mjs').ConstraintComponentSystem} - Constraint component system.
     */
    get system() {
        return this._entity1?.constraint.system || this._entity?.constraint.system;
    }

    /**
     * @hidden
     * @returns {number} - Constraint type.
     */
    get type() {
        return this._type;
    }

    /**
     * Destroy this constraint. The connected bodies will be activated.
     */
    destroy() {
        this.system.destroyConstraint(this._index);
    }

    write(cb) {
        if ($_DEBUG) {
            let ok = Debug.checkUint(this._numVelocityStepsOverride,
                                     'Invalid number of velocity steps',
                                     this._numVelocityStepsOverride);
            ok = ok && Debug.checkUint(this._numPositionStepsOverride,
                                       'Invalid number of velocity steps',
                                       this._numPositionStepsOverride);
            if (!ok) {
                return;
            }
        }

        cb.write(this._index, BUFFER_WRITE_UINT32, false);
        cb.write(this._type, BUFFER_WRITE_UINT8, false);
        cb.write(this._numVelocityStepsOverride, BUFFER_WRITE_UINT16, false);
        cb.write(this._numPositionStepsOverride, BUFFER_WRITE_UINT16, false);
    }

    /**
     * Allows to enable/disable a constraint without destroying it.
     *
     * @param {boolean} enabled - `true` - enable constraint, `false` - disable.
     * @param {boolean} [activate] - If `true`, activate connected bodies after changing the state.
     */
    setEnabled(enabled, activate = true) {
        if ($_DEBUG) {
            let ok = Debug.checkBool(enabled, `Invalid constraint enable bool: ${enabled}`);
            ok = ok && Debug.checkBool(activate, `Invalid activate bool: ${activate}`);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_JNT_SET_ENABLED, this._index,
            enabled, BUFFER_WRITE_BOOL, false,
            activate, BUFFER_WRITE_BOOL, false
        );
    }
}

export { Constraint, Motor, Spring, applyOptions };

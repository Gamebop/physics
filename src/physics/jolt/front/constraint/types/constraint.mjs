import { Vec3 } from 'playcanvas';
import { Debug } from '../../../debug.mjs';
import {
    BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT32,
    BUFFER_WRITE_UINT8, CMD_JNT_SET_ENABLED, CONSTRAINT_SPACE_WORLD,
    CONSTRAINT_TYPE_UNDEFINED, OPERATOR_MODIFIER, SPRING_MODE_FREQUENCY
} from '../../../constants.mjs';

class SpringSettings {
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

class MotorSettings {
    minForceLimit = -Number.MAX_VALUE;

    maxForceLimit = Number.MAX_VALUE;

    minTorqueLimit = -Number.MAX_VALUE;

    maxTorqueLimit = Number.MAX_VALUE;

    springSettings = null;

    constructor(opts = {}) {
        this.minForceLimit = opts.minForceLimit ?? this.minForceLimit;
        this.maxForceLimit = opts.maxForceLimit ?? this.maxForceLimit;
        this.minTorqueLimit = opts.minTorqueLimit ?? this.minTorqueLimit;
        this.maxTorqueLimit = opts.maxTorqueLimit ?? this.maxTorqueLimit;

        if (opts.springSettings) {
            this.springSettings = new SpringSettings(opts.springSettings);
        }
    }
}

class Constraint {
    static defaultMotor = new MotorSettings();

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
        if (settings !== null) {
            cb.write(settings.springMode, BUFFER_WRITE_UINT8);
            if (settings.springMode === SPRING_MODE_FREQUENCY) {
                cb.write(settings.frequency, BUFFER_WRITE_FLOAT32);
            } else {
                cb.write(settings.stiffness, BUFFER_WRITE_FLOAT32);
            }
            cb.write(settings.damping, BUFFER_WRITE_FLOAT32);
        }
    }

    _index = -1;

    _point1 = new Vec3();

    _point2 = new Vec3();

    _type = CONSTRAINT_TYPE_UNDEFINED;

    _entity1 = null;

    _entity2 = null;

    _numVelocityStepsOverride = 0;

    _numPositionStepsOverride = 0;

    _space = CONSTRAINT_SPACE_WORLD;

    constructor(entity1, entity2, opts = {}) {
        if ($_DEBUG) {
            let ok = Debug.assert(!!entity1 && !!entity1.body, 'Invalid entity1 when adding a constraint', entity1);
            ok = ok && Debug.assert(!!entity2 && !!entity2.body, 'Invalid entity1 when adding a constraint', entity2);
            if (opts.point1) {
                ok = ok && Debug.assert(opts.point1 instanceof Vec3, 'Invalid point1 when adding a constraint. Expected a vector.', opts.point1);
            }
            if (opts.point2) {
                ok = ok && Debug.assert(opts.point2 instanceof Vec3, 'Invalid point1 when adding a constraint. Expected a vector.', opts.point2);
            }
            if (!ok) {
                return;
            }
        }

        this._entity1 = entity1;
        this._entity2 = entity2;
        if (opts.point1) this._point1.copy(opts.point1);
        if (opts.point2) this._point2.copy(opts.point2);
        this._numVelocityStepsOverride = opts.numVelocityStepsOverride ?? this._numVelocityStepsOverride;
        this._numPositionStepsOverride = opts.numPositionStepsOverride ?? this._numPositionStepsOverride;
        this._space = opts.space ?? this._space;
    }

    set index(idx) {
        this._index = idx;
    }

    get index() {
        return this._index;
    }

    get point1() {
        return this._point1;
    }

    get point2() {
        return this._point2;
    }

    get entity1() {
        return this._entity1;
    }

    get entity2() {
        return this._entity2;
    }

    get numVelocityStepsOverride() {
        return this._numVelocityStepsOverride;
    }

    get numPositionStepsOverride() {
        return this._numVelocityStepsOverride;
    }

    get space() {
        return this._space;
    }

    get system() {
        return this._entity1.constraint.system;
    }

    get type() {
        return this._type;
    }

    destroy() {
        this.system.destroyConstraint(this._index);
    }

    write(cb) {
        cb.write(this._index, BUFFER_WRITE_UINT32, false);
        cb.write(this._type, BUFFER_WRITE_UINT8, false);
        cb.write(this._entity1.body.index, BUFFER_WRITE_UINT32, false);
        cb.write(this._entity2.body.index, BUFFER_WRITE_UINT32, false);
        cb.write(this._numVelocityStepsOverride, BUFFER_WRITE_UINT8, false);
        cb.write(this._numPositionStepsOverride, BUFFER_WRITE_UINT8, false);
        cb.write(this._space, BUFFER_WRITE_UINT8, false);
    }

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

export { Constraint, MotorSettings, SpringSettings };

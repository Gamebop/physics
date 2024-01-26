import { Debug } from "../../debug.mjs";
import { IndexedCache } from "../../indexed-cache.mjs";
import { PhysicsManager } from "../../manager.mjs";
import { BodyComponentSystem } from "./body/system.mjs";
import { CharComponentSystem } from "./char/system.mjs";
import { ShapeComponent } from "./component.mjs";
import {
    BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT16,
    BUFFER_WRITE_UINT32, BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32,
    CMD_CAST_RAY, CMD_CAST_SHAPE, CMD_CHANGE_GRAVITY, CMD_CREATE_CONSTRAINT,
    CMD_CREATE_GROUPS, CMD_CREATE_SHAPE, CMD_DESTROY_CONSTRAINT, CMD_DESTROY_SHAPE, CMD_SET_CONSTRAINT_ENABLED, CMD_TOGGLE_GROUP_PAIR, COMPONENT_SYSTEM_BODY, COMPONENT_SYSTEM_CHAR, COMPONENT_SYSTEM_MANAGER, COMPONENT_SYSTEM_SOFT_BODY, COMPONENT_SYSTEM_VEHICLE, CONSTRAINT_TYPE_CONE,
    CONSTRAINT_TYPE_DISTANCE, CONSTRAINT_TYPE_FIXED, CONSTRAINT_TYPE_HINGE,
    CONSTRAINT_TYPE_POINT, CONSTRAINT_TYPE_SIX_DOF, CONSTRAINT_TYPE_SLIDER,
    CONSTRAINT_TYPE_SWING_TWIST, OPERATOR_CLEANER, OPERATOR_CREATOR, OPERATOR_MODIFIER, OPERATOR_QUERIER
} from "./constants.mjs";
import { ResponseHandler } from "./response-handler.mjs";
import { SoftBodyComponentSystem } from "./softbody/system.mjs";
import { ShapeComponentSystem } from "./system.mjs";
import { VehicleComponentSystem } from "./vehicle/system.mjs";

class JoltManager extends PhysicsManager {
    constructor(app, opts, resolve) {
        super(app, 'jolt', opts);

        // TODO
        // component systems will use Jolt constants, which
        // are not available until webworker responds with them.

        app.systems.add(new BodyComponentSystem(app, this, COMPONENT_SYSTEM_BODY));
        app.systems.add(new CharComponentSystem(app, this, COMPONENT_SYSTEM_CHAR));
        app.systems.add(new VehicleComponentSystem(app, this, COMPONENT_SYSTEM_VEHICLE));
        app.systems.add(new SoftBodyComponentSystem(app, this, COMPONENT_SYSTEM_SOFT_BODY));

        this._queryMap = new IndexedCache();
        this._constraintMap = new IndexedCache();
        this._shapeMap = new IndexedCache();
        this._gravity = new pc.Vec3(0, -9.81, 0);

        this._resolve = resolve;

        this._systems.set(COMPONENT_SYSTEM_MANAGER, this);
    }

    set gravity(gravity) {
        if (Debug.dev) {
            const ok = Debug.checkVec(gravity, `Invalid gravity vector`, gravity);
            if (!ok)
                return;
        }

        if (!this._gravity.equals(gravity)) {
            this._gravity.copy(gravity);

            const cb = this._outBuffer;

            cb.writeOperator(OPERATOR_MODIFIER);
            cb.writeCommand(CMD_CHANGE_GRAVITY);
            cb.write(gravity, BUFFER_WRITE_VEC32, false);
        }
    }

    get gravity() {
        return this._gravity;
    }

    get queryMap() {
        return this._queryMap;
    }

    onMessage(msg) {
        const data = msg.data || msg;

        super.onMessage(data);

        if (data.constants) {
            this._resolve();
        }

        if (data.drawViews) {
            ShapeComponentSystem.debugDraw(this._app, data.drawViews, this._config);
        }
    }

    processCommands(cb) {
        const command = cb.readCommand();

        switch (command) {
            case CMD_CAST_RAY:
            case CMD_CAST_SHAPE:
                ResponseHandler.handleQuery(cb, this._queryMap);
                break;
        }
    }    

    createShape(type, options = {}) {
        const cb = this._outBuffer;

        const opts = {
            // defaults
            density: 1000,
            shapePosition: new pc.Vec3(),
            shapeRotation: new pc.Vec3(),
            scale: new pc.Vec3(1, 1, 1),
            halfExtent: new pc.Vec3(0.5, 0.5, 0.5),
            convexRadius: 0.05,
            halfHeight: 0.5,
            radius: 0.5,

            // user overrides
            ...options,

            // hard rules
            shape: type,
            useEntityScale: false,
            isCompoundChild: false,
            massOffset: pc.Vec3.ZERO
        };

        const index = this._shapeMap.add(opts);

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_SHAPE);
        cb.write(index, BUFFER_WRITE_UINT32, false);

        ShapeComponent.writeShapeData(cb, opts, true /* force write rotation */);

        return index;
    }

    destroyShape(index) {
        if (Debug.dev) {
            const ok = Debug.checkUint(index, `Invalid shape number: ${ num }`);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;

        cb.writeOperator(OPERATOR_CLEANER);
        cb.writeCommand(CMD_DESTROY_SHAPE);
        cb.write(index, BUFFER_WRITE_UINT32, false);

        this._shapeMap.free(index);
    }    

    createFilterGroups(groups) {
        const cb = this._outBuffer;
        const groupsCount = groups.length;

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_GROUPS);
        cb.write(groupsCount, BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < groupsCount; i++) {
            // sub groups count
            cb.write(groups[i], BUFFER_WRITE_UINT32, false);
        }
    }

    toggleGroupPair(group, subGroup1, subGroup2, enable) {
        if (Debug.dev) {
            let ok = Debug.checkUint(group, `Invalid group 1: ${ group }`);
            ok = ok && Debug.checkUint(subGroup1, `Invalid group 1: ${ subGroup1 }`);
            ok = ok && Debug.checkUint(subGroup2, `Invalid group 2: ${ subGroup2 }`);
            ok = ok && Debug.checkBool(enable, `Invalid toggle flag: ${ enable }`);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;

        cb.writeOperator(OPERATOR_MODIFIER);
        cb.writeCommand(CMD_TOGGLE_GROUP_PAIR);
        cb.write(enable, BUFFER_WRITE_BOOL, false);
        cb.write(group, BUFFER_WRITE_UINT16, false);
        cb.write(subGroup1, BUFFER_WRITE_UINT16, false);
        cb.write(subGroup2, BUFFER_WRITE_UINT16, false);
    }    

    castRay(origin, dir, callback, opts) {
        if (Debug.dev) {
            let ok = Debug.checkVec(origin,`Invalid origin vector`);
            ok = ok && Debug.checkVec(dir, `Invalid direction vector`);
            ok = ok && Debug.assert(callback, 'castRay requires a callback function castRay(origin, dir, callback, opts)');
            if (ok && opts?.firstOnly != null) ok = Debug.checkBool(opts.firstOnly);
            if (ok && opts?.calculateNormal != null) ok = Debug.checkBool(opts.calculateNormal);
            if (ok && opts?.ignoreBackFaces != null) ok = Debug.checkBool(opts.ignoreBackFaces);
            if (ok && opts?.treatConvexAsSolid != null) ok = Debug.checkBool(opts.treatConvexAsSolid);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;
        const callbackIndex = this._queryMap.add(callback);

        cb.writeOperator(OPERATOR_QUERIER);
        cb.writeCommand(CMD_CAST_RAY);
        cb.write(callbackIndex, BUFFER_WRITE_UINT32, false);
        cb.write(origin, BUFFER_WRITE_VEC32, false);
        cb.write(dir, BUFFER_WRITE_VEC32, false);
        cb.write(opts?.firstOnly, BUFFER_WRITE_BOOL);
        cb.write(opts?.calculateNormal, BUFFER_WRITE_BOOL);
        cb.write(opts?.ignoreBackFaces, BUFFER_WRITE_BOOL);
        cb.write(opts?.treatConvexAsSolid, BUFFER_WRITE_BOOL);
        cb.write(opts?.bpFilterLayer, BUFFER_WRITE_UINT32);
        cb.write(opts?.objFilterLayer, BUFFER_WRITE_UINT32);
    }

    castShape(shapeIndex, pos, rot, dir, callback, opts) {
        if (Debug.dev) {
            let ok = Debug.checkInt(shapeIndex, `Invalid shape index`);
            ok = ok && Debug.checkVec(pos, `Invalid cast shape position vector`);
            ok = ok && Debug.checkVec(dir, `Invalid cast shape direction vector`);
            ok = ok && Debug.checkQuat(rot, `Invalid cast shape rotation`);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;
        const queryIndex = this._queryMap.add(callback);

        // TODO
        // get rid of flags

        cb.writeOperator(OPERATOR_QUERIER);
        cb.writeCommand(CMD_CAST_SHAPE);
        cb.write(queryIndex, BUFFER_WRITE_UINT32, false);
        cb.write(pos, BUFFER_WRITE_VEC32, false);
        cb.write(rot, BUFFER_WRITE_VEC32, false);
        cb.write(dir, BUFFER_WRITE_VEC32, false);
        cb.write(opts?.scale, BUFFER_WRITE_VEC32);
        cb.write(opts?.offset, BUFFER_WRITE_VEC32);
        cb.write(opts?.backFaceModeTriangles, BUFFER_WRITE_UINT8);
        cb.write(opts?.backFaceModeConvex, BUFFER_WRITE_UINT8);
        cb.write(opts?.useShrunkenShapeAndConvexRadius, BUFFER_WRITE_BOOL);
        cb.write(opts?.returnDeepestPoint, BUFFER_WRITE_BOOL);
        // TODO
        // separate a cast into [single result / multiple results] commands
        // so we don't allocate new array for a single result query
        // after we get back from the backend
        cb.write(opts?.firstOnly, BUFFER_WRITE_BOOL);
        cb.write(opts?.calculateNormal, BUFFER_WRITE_BOOL);
        cb.write(shapeIndex, BUFFER_WRITE_UINT32, false);
        cb.write(opts?.bpFilterLayer, BUFFER_WRITE_UINT32);
        cb.write(opts?.objFilterLayer, BUFFER_WRITE_UINT32);
    }

    createConstraint(type, entity1, entity2, opts = {}) {
        if (Debug.dev) {
            let ok = Debug.assert(!!entity1.c.body, `Entity has no Body Component. Cannot create constraint.`, entity1);
            ok = ok && Debug.assert(!!entity2.c.body, `Entity has no Body Component. Cannot create constraint.`, entity2);
            if (!ok) return;
        }

        const cb = this._outBuffer;
        const index = this._constraintMap.add({ entity1, entity2 });

        entity1.body.constraints.set(index, entity2);
        entity2.body.constraints.set(index, entity1);

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_CONSTRAINT);
        cb.write(type, BUFFER_WRITE_UINT8, false);

        cb.write(index, BUFFER_WRITE_UINT32, false);
        cb.write(entity1.c.body.index, BUFFER_WRITE_UINT32, false);
        cb.write(entity2.c.body.index, BUFFER_WRITE_UINT32, false);

        switch (type) {
            case CONSTRAINT_TYPE_FIXED:
                JoltManager.writeFixedConstraint(cb, opts);
                break;

            case CONSTRAINT_TYPE_POINT:
                JoltManager.writePointConstraint(cb, opts);
                break;

            case CONSTRAINT_TYPE_DISTANCE:
                JoltManager.writeDistanceConstraint(cb, opts);
                break;

            case CONSTRAINT_TYPE_HINGE:
                JoltManager.writeHingeConstraint(cb, opts);
                break;

            case CONSTRAINT_TYPE_SLIDER:
                JoltManager.writeSliderConstraint(cb, opts);
                break;

            case CONSTRAINT_TYPE_CONE:
                JoltManager.writeConeConstraint(cb, opts);
                break;

            case CONSTRAINT_TYPE_SWING_TWIST:
                JoltManager.writeSwingTwistConstraint(cb, opts);
                break;

            case CONSTRAINT_TYPE_SIX_DOF:
                JoltManager.writeSixDofConstraint(cb, opts);
                break;

            default:
                Debug.dev && Debug.error(`Unrecognized constraint type: ${ type }`);
                return;
        }

        cb.write(opts.numVelocityStepsOverride, BUFFER_WRITE_UINT8);
        cb.write(opts.numPositionStepsOverride, BUFFER_WRITE_UINT8);
        cb.write(opts.space, BUFFER_WRITE_UINT8);

        return index;
    }

    destroyConstraint(index) {
        if (Debug.dev) {
            const ok = Debug.checkUint(index, `Invalid index of a constraint trying to destroy: ${ index }`);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;

        cb.writeOperator(OPERATOR_CLEANER);
        cb.writeCommand(CMD_DESTROY_CONSTRAINT);
        cb.write(index, BUFFER_WRITE_UINT32, false);

        this.freeConstraintIndex(index);
    }

    freeConstraintIndex(index) {
        this._constraintMap.free(index);
    }

    setConstraintEnabled(index, enabled, activate = true) {
        if (Debug.dev) {
            let ok = Debug.checkUint(index, `Invalid constraint index: ${ index }`);
            ok = ok && Debug.checkBool(enabled, `Invalid constraint enable bool: ${ enabled }`);
            ok = ok && Debug.checkBool(enabled, `Invalid activate bool: ${ enabled }`);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;

        cb.writeOperator(OPERATOR_MODIFIER);
        cb.writeCommand(CMD_SET_CONSTRAINT_ENABLED);
        cb.write(index, BUFFER_WRITE_UINT32, false);
        cb.write(enabled, BUFFER_WRITE_BOOL, false);
        cb.write(activate, BUFFER_WRITE_BOOL, false);
    }

    // https://jrouwe.github.io/JoltPhysics/class_fixed_constraint_settings.html
    static writeFixedConstraint(cb, opts) {
        cb.write(opts.autoDetectPoint, BUFFER_WRITE_BOOL);
        if (!opts.autoDetectPoint) {
            cb.write(opts.point1, BUFFER_WRITE_VEC32);
            cb.write(opts.point2, BUFFER_WRITE_VEC32);
        }
        cb.write(opts.axisX1, BUFFER_WRITE_VEC32);
        cb.write(opts.axisY1, BUFFER_WRITE_VEC32);
        cb.write(opts.axisX2, BUFFER_WRITE_VEC32);
        cb.write(opts.axisY2, BUFFER_WRITE_VEC32);
    }

    // https://jrouwe.github.io/JoltPhysics/class_point_constraint_settings.html
    static writePointConstraint(cb, opts) {
        cb.write(opts.point1, BUFFER_WRITE_VEC32);
        cb.write(opts.point2, BUFFER_WRITE_VEC32);
    }

    // https://jrouwe.github.io/JoltPhysics/class_distance_constraint_settings.html
    static writeDistanceConstraint(cb, opts) {
        cb.write(opts.point1, BUFFER_WRITE_VEC32);
        cb.write(opts.point2, BUFFER_WRITE_VEC32);
        cb.write(opts.minDistance, BUFFER_WRITE_FLOAT32);
        cb.write(opts.maxDistance, BUFFER_WRITE_FLOAT32);

        JoltManager.writeSpringSettings(cb, opts.springSettings);
    }

    // https://jrouwe.github.io/JoltPhysics/class_hinge_constraint_settings.html
    static writeHingeConstraint(cb, opts) {
        cb.write(opts.point1, BUFFER_WRITE_VEC32);
        cb.write(opts.hingeAxis1, BUFFER_WRITE_VEC32);
        cb.write(opts.normalAxis1, BUFFER_WRITE_VEC32);
        cb.write(opts.point2, BUFFER_WRITE_VEC32);
        cb.write(opts.hingeAxis2, BUFFER_WRITE_VEC32);
        cb.write(opts.normalAxis2, BUFFER_WRITE_VEC32);
        cb.write(opts.limitsMin, BUFFER_WRITE_FLOAT32);
        cb.write(opts.limitsMax, BUFFER_WRITE_FLOAT32);
        cb.write(opts.maxFrictionTorque, BUFFER_WRITE_FLOAT32);

        JoltManager.writeSpringSettings(cb, opts.springSettings);
        JoltManager.writeMotorSettings(cb, opts.motorSettings);
    }

    // https://jrouwe.github.io/JoltPhysics/class_slider_constraint_settings.html
    static writeSliderConstraint(cb, opts) {
        cb.write(opts.autoDetectPoint, BUFFER_WRITE_BOOL);
        if (!opts.autoDetectPoint) {
            cb.write(opts.point1, BUFFER_WRITE_VEC32);
            cb.write(opts.point2, BUFFER_WRITE_VEC32);
        }
        cb.write(opts.sliderAxis1, BUFFER_WRITE_VEC32);
        cb.write(opts.normalAxis1, BUFFER_WRITE_VEC32);
        cb.write(opts.sliderAxis2, BUFFER_WRITE_VEC32);
        cb.write(opts.normalAxis2, BUFFER_WRITE_VEC32);
        cb.write(opts.limitsMin, BUFFER_WRITE_FLOAT32);
        cb.write(opts.limitsMax, BUFFER_WRITE_FLOAT32);
        cb.write(opts.maxFrictionForce, BUFFER_WRITE_FLOAT32);

        JoltManager.writeSpringSettings(cb, opts.springSettings);
        JoltManager.writeMotorSettings(cb, opts.motorSettings);
    }

    // https://jrouwe.github.io/JoltPhysics/class_cone_constraint_settings.html
    static writeConeConstraint(cb, opts) {
        cb.write(opts.point1, BUFFER_WRITE_VEC32);
        cb.write(opts.twistAxis1, BUFFER_WRITE_VEC32);
        cb.write(opts.point2, BUFFER_WRITE_VEC32);
        cb.write(opts.twistAxis2, BUFFER_WRITE_VEC32);
        cb.write(opts.halfConeAngle, BUFFER_WRITE_FLOAT32);
    }

    // https://jrouwe.github.io/JoltPhysics/class_swing_twist_constraint_settings.html
    static writeSwingTwistConstraint(cb, opts) {
        cb.write(opts.position1, BUFFER_WRITE_VEC32);
        cb.write(opts.twistAxis1, BUFFER_WRITE_VEC32);
        cb.write(opts.planeAxis1, BUFFER_WRITE_VEC32);
        cb.write(opts.position2, BUFFER_WRITE_VEC32);
        cb.write(opts.twistAxis2, BUFFER_WRITE_VEC32);
        cb.write(opts.planeAxis2, BUFFER_WRITE_VEC32);
        cb.write(opts.normalHalfConeAngle, BUFFER_WRITE_FLOAT32);
        cb.write(opts.planeHalfConeAngle, BUFFER_WRITE_FLOAT32);
        cb.write(opts.twistMinAngle, BUFFER_WRITE_FLOAT32);
        cb.write(opts.twistMaxAngle, BUFFER_WRITE_FLOAT32);
        cb.write(opts.maxFrictionTorque, BUFFER_WRITE_FLOAT32);

        JoltManager.writeMotorSettings(cb, opts.swingMotorSettings);
        JoltManager.writeMotorSettings(cb, opts.twistMotorSettings);
    }

    // https://jrouwe.github.io/JoltPhysics/class_six_d_o_f_constraint_settings.html
    static writeSixDofConstraint(cb, opts) {
        JoltManager.writeAxes(cb, opts.freeAxes);
        JoltManager.writeAxes(cb, opts.fixedAxes);
        JoltManager.writeAxes(cb, opts.limitedAxes, true);

        cb.write(opts.position1, BUFFER_WRITE_VEC32);
        cb.write(opts.axisX1, BUFFER_WRITE_VEC32);
        cb.write(opts.axisY1, BUFFER_WRITE_VEC32);
        cb.write(opts.position2, BUFFER_WRITE_VEC32);
        cb.write(opts.axisX2, BUFFER_WRITE_VEC32);
        cb.write(opts.axisY2, BUFFER_WRITE_VEC32);
        cb.write(opts.maxFriction, BUFFER_WRITE_FLOAT32);
        cb.write(opts.limitsMin, BUFFER_WRITE_FLOAT32);
        cb.write(opts.limitsMax, BUFFER_WRITE_FLOAT32);

        JoltManager.writeSpringSettings(cb, opts.springSettings);
        JoltManager.writeMotorSettings(cb, opts.motorSettings);
    }

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

    static writeSpringSettings(cb, springSettings) {
        cb.write(!!springSettings, BUFFER_WRITE_BOOL, false);
        if (springSettings != null) {
            cb.write(springSettings.springMode, BUFFER_WRITE_UINT8);
            cb.write(springSettings.frequency, BUFFER_WRITE_FLOAT32);
            cb.write(springSettings.stiffness, BUFFER_WRITE_FLOAT32);
            cb.write(springSettings.damping, BUFFER_WRITE_FLOAT32);
        }
    }

    static writeMotorSettings(cb, motorSettings) {
        cb.write(!!motorSettings, BUFFER_WRITE_BOOL, false);
        if (motorSettings != null) {
            this._writeSpringSettings(cb, motorSettings.springSettings);
            cb.write(motorSettings.minForceLimit, BUFFER_WRITE_FLOAT32);
            cb.write(motorSettings.maxForceLimit, BUFFER_WRITE_FLOAT32);
            cb.write(motorSettings.minTorqueLimit, BUFFER_WRITE_FLOAT32);
            cb.write(motorSettings.maxTorqueLimit, BUFFER_WRITE_FLOAT32);
        }
    }

}

export { JoltManager };


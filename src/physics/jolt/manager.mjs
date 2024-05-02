import { Debug } from './debug.mjs';
import { IndexedCache } from '../indexed-cache.mjs';
import { PhysicsManager } from '../manager.mjs';
import { BodyComponentSystem } from './front/body/system.mjs';
import { CharComponentSystem } from './front/char/system.mjs';
import { ShapeComponent } from './front/shape/component.mjs';
import { ConstraintComponentSystem } from './front/constraint/system.mjs';
import { ResponseHandler } from './front/response-handler.mjs';
import { SoftBodyComponentSystem } from './front/softbody/system.mjs';
import { ShapeComponentSystem } from './front/shape/system.mjs';
import { VehicleComponentSystem } from './front/vehicle/system.mjs';
import { Quat, Vec3, Color, LAYERID_IMMEDIATE } from 'playcanvas';
import {
    BUFFER_WRITE_BOOL, BUFFER_WRITE_UINT16, BUFFER_WRITE_UINT32, BUFFER_WRITE_UINT8,
    BUFFER_WRITE_VEC32, CMD_CAST_RAY, CMD_CAST_SHAPE, CMD_CHANGE_GRAVITY, CMD_CREATE_GROUPS,
    CMD_CREATE_SHAPE, CMD_DESTROY_SHAPE, CMD_TOGGLE_GROUP_PAIR, COMPONENT_SYSTEM_BODY,
    COMPONENT_SYSTEM_CHAR, COMPONENT_SYSTEM_CONSTRAINT, COMPONENT_SYSTEM_MANAGER,
    COMPONENT_SYSTEM_SOFT_BODY, COMPONENT_SYSTEM_VEHICLE, OPERATOR_CLEANER, OPERATOR_CREATOR,
    OPERATOR_MODIFIER, OPERATOR_QUERIER
} from './constants.mjs';

const halfExtent = new Vec3(0.5, 0.5, 0.5);

class JoltManager extends PhysicsManager {
    constructor(app, opts, resolve) {
        const config = {
            useSharedArrayBuffer: true,
            commandsBufferSize: 10000, // bytes, 10k is enough to update about 150 active dynamic objects
            allowCommandsBufferResize: true,
            useWebWorker: false,
            fixedStep: 1 / 30,
            subSteps: 1,
            useMotionStates: true,
            debugColorStatic: Color.GRAY,
            debugColorKinematic: Color.MAGENTA,
            debugColorDynamic: Color.YELLOW,
            debugDrawLayerId: LAYERID_IMMEDIATE,
            debugDrawDepth: true,
            ...opts
        };

        // Make sure requested features are supported
        config.useSharedArrayBuffer = config.useSharedArrayBuffer && typeof SharedArrayBuffer !== 'undefined';
        config.useWebWorker = config.useWebWorker && typeof Worker !== 'undefined';
        config.useSAB = config.useWebWorker && config.useSharedArrayBuffer;

        super(app, config);

        // TODO
        // component systems will use Jolt constants, which
        // are not available until webworker responds with them.
        // TODO
        // now that we moved to modules, this needs an update

        app.systems.add(new BodyComponentSystem(app, this, COMPONENT_SYSTEM_BODY));
        app.systems.add(new CharComponentSystem(app, this, COMPONENT_SYSTEM_CHAR));
        app.systems.add(new VehicleComponentSystem(app, this, COMPONENT_SYSTEM_VEHICLE));
        app.systems.add(new SoftBodyComponentSystem(app, this, COMPONENT_SYSTEM_SOFT_BODY));
        app.systems.add(new ConstraintComponentSystem(app, this, COMPONENT_SYSTEM_CONSTRAINT))

        this._queryMap = new IndexedCache();
        this._shapeMap = new IndexedCache();
        this._gravity = new Vec3(0, -9.81, 0);
        this._resolve = resolve;

        this._systems.set(COMPONENT_SYSTEM_MANAGER, this);

        const msg = Object.create(null);
        msg.type = 'create-backend';
        msg.glueUrl = null;
        msg.wasmUrl = null;
        
        // TODO
        // this needs a better handling
        if (opts.glueUrl && opts.wasmUrl) {
            // first check if user wants to use own custom build
            msg.glueUrl = opts.glueUrl;
            msg.wasmUrl = opts.wasmUrl;
        } else {
            // then check if glue/wasm are in the project assets
            const wasmAsset = app.assets.find('jolt-physics.wasm.wasm');
            const glueAsset = app.assets.find('jolt-physics.wasm.js');

            if (wasmAsset && glueAsset) {
                msg.glueUrl = glueAsset.getFileUrl();
                msg.wasmUrl = wasmAsset.getFileUrl();
            }
        }

        msg.backendName = 'jolt';
        msg.config = config;
        this.sendUncompressed(msg);
    }

    set gravity(gravity) {
        if ($_DEBUG) {
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

    addUpdateCallback(func) {
        if (this._config.useWebWorker) {
            $_DEBUG && Debug.warn('Physics update callback is not supported when Web Worker is enabled.');
            return;
        }

        this._backend.updateCallback = func;
    }

    removeUpdateCallback() {
        if (this._config.useWebWorker) {
            $_DEBUG && Debug.warn('Physics update callback is not supported when Web Worker is enabled.');
            return;
        }
                
        this._backend.updateCallback = null;
    }

    createShape(type, options = {}) {
        const cb = this._outBuffer;

        // TODO 
        // expose to docs?
        const opts = {
            // defaults
            density: 1000,
            shapePosition: Vec3.ZERO,
            shapeRotation: Quat.IDENTITY,
            scale: Vec3.ONE,
            halfExtent,
            convexRadius: 0.05,
            halfHeight: 0.5,
            radius: 0.5,

            // user overrides
            ...options,

            // hard rules
            shape: type,
            useEntityScale: false,
            isCompoundChild: false,
            massOffset: Vec3.ZERO
        };

        const index = this._shapeMap.add(opts);

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_SHAPE);
        cb.write(index, BUFFER_WRITE_UINT32, false);

        ShapeComponent.writeShapeData(cb, opts, true /* force write rotation */);

        return index;
    }

    destroyShape(index) {
        if ($_DEBUG) {
            const ok = Debug.checkUint(index, `Invalid shape number: ${ index }`);
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
        if ($_DEBUG) {
            let ok = Debug.checkUint(group, `Invalid group 1: ${ group }`);
            ok = ok && Debug.checkUint(subGroup1, `Invalid group 1: ${ subGroup1 }`);
            ok = ok && Debug.checkUint(subGroup2, `Invalid group 2: ${ subGroup2 }`);
            ok = ok && Debug.checkBool(enable, `Invalid toggle flag: ${ enable }`);
            if (!ok) {
                return;
            }
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
        if ($_DEBUG) {
            let ok = Debug.checkVec(origin,`Invalid origin vector`);
            ok = ok && Debug.checkVec(dir, `Invalid direction vector`);
            ok = ok && Debug.assert(callback, 'castRay requires a callback function castRay(origin, dir, callback, opts)');
            if (ok && opts?.firstOnly != null) ok = Debug.checkBool(opts.firstOnly);
            if (ok && opts?.calculateNormal != null) ok = Debug.checkBool(opts.calculateNormal);
            if (ok && opts?.ignoreBackFaces != null) ok = Debug.checkBool(opts.ignoreBackFaces);
            if (ok && opts?.treatConvexAsSolid != null) ok = Debug.checkBool(opts.treatConvexAsSolid);
            if (!ok) {
                return;
            }
        }

        const cb = this._outBuffer;
        const callbackIndex = this._queryMap.add(callback);

        // TODO
        // get rid of flags

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
        if ($_DEBUG) {
            let ok = Debug.checkInt(shapeIndex, `Invalid shape index`);
            ok = ok && Debug.checkVec(pos, `Invalid cast shape position vector`);
            ok = ok && Debug.checkVec(dir, `Invalid cast shape direction vector`);
            ok = ok && Debug.checkQuat(rot, `Invalid cast shape rotation`);
            if (!ok) {
                return;
            }
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
}

export { JoltManager };
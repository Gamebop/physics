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
import { Quat, Vec3, Color, LAYERID_IMMEDIATE, KEY_Q, EVENT_KEYDOWN } from 'playcanvas';
import {
    BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT16, BUFFER_WRITE_UINT32,
    BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32, CMD_CAST_RAY, CMD_CAST_SHAPE, CMD_CHANGE_GRAVITY,
    CMD_COLLIDE_POINT, CMD_COLLIDE_SHAPE_IDX, CMD_CREATE_GROUPS, CMD_CREATE_SHAPE,
    CMD_DESTROY_SHAPE, CMD_TOGGLE_GROUP_PAIR, COMPONENT_SYSTEM_BODY, COMPONENT_SYSTEM_CHAR,
    COMPONENT_SYSTEM_CONSTRAINT, COMPONENT_SYSTEM_MANAGER, COMPONENT_SYSTEM_SOFT_BODY,
    MOTION_TYPE_DYNAMIC, MOTION_TYPE_KINEMATIC, MOTION_TYPE_STATIC, OPERATOR_CLEANER,
    OPERATOR_CREATOR, OPERATOR_MODIFIER, OPERATOR_QUERIER
} from './constants.mjs';

/** @import { CastShapeCallback } from "./interfaces/query-results.mjs" */

function getColor(type, config) {
    switch (type) {
        case MOTION_TYPE_STATIC:
            return config.debugColorStatic;
        case MOTION_TYPE_KINEMATIC:
            return config.debugColorKinematic;
        case MOTION_TYPE_DYNAMIC:
            return config.debugColorDynamic;
        default:
            return Color.WHITE;
    }
}

function debugDraw(app, data, config) {
    const layer = app.scene.layers.getLayerById(config.debugDrawLayerId);
    const tempVectors = ShapeComponentSystem.tempVectors;

    if (tempVectors.length === 0) {
        tempVectors.push(new Vec3(), new Vec3(), new Vec3(), new Vec3(), new Quat());
    }

    const v1 = tempVectors[0];
    const v2 = tempVectors[1];
    const v3 = tempVectors[2];
    const v4 = tempVectors[3];
    const q1 = tempVectors[4];

    for (let d = 0, total = data.length; d < total; d += 13) {
        const length = data[d + 1];
        const byteOffset = data[d + 2];
        const motionType = data[d + 3];
        const depth = data[d + 4];
        const buffer = data[d + 5];

        const view = new Float32Array(buffer, byteOffset, length);
        const color = getColor(motionType, config);

        const p = v4.set(data[d + 6], data[d + 7], data[d + 8]);
        const r = q1.set(data[d + 9], data[d + 10], data[d + 11], data[d + 12]);

        for (let i = 0, end = view.length; i < end; i += 9) {
            v1.set(view[i], view[i + 1], view[i + 2]);
            v2.set(view[i + 3], view[i + 4], view[i + 5]);
            v3.set(view[i + 6], view[i + 7], view[i + 8]);

            r.transformVector(v1, v1);
            r.transformVector(v2, v2);
            r.transformVector(v3, v3);
            v1.add(p);
            v2.add(p);
            v3.add(p);

            app.drawLine(v1, v2, color, depth, layer);
            app.drawLine(v2, v3, color, depth, layer);
            app.drawLine(v3, v1, color, depth, layer);
        }
    }
}

/**
 * Jolt Manager is responsible to handle the Jolt Physics backend.
 *
 * @group Managers
 * @category Jolt
 */
class JoltManager extends PhysicsManager {
    static defaultHalfExtent = new Vec3(0.5, 0.5, 0.5);

    constructor(app, opts, resolve) {
        const config = {
            useSharedArrayBuffer: true,
            commandsBufferSize: 10000, // bytes, 10k is enough to update about 150 active dynamic objects
            allowCommandsBufferResize: true,
            useWebWorker: false,
            fixedStep: 1 / 30,
            subSteps: 2,
            useMotionStates: true,
            debugColorStatic: Color.GRAY,
            debugColorKinematic: Color.MAGENTA,
            debugColorDynamic: Color.YELLOW,
            debugDrawLayerId: LAYERID_IMMEDIATE,
            debugDrawDepth: true,
            debugDrawKey: KEY_Q,
            ...opts
        };

        // Make sure requested features are supported
        config.useSharedArrayBuffer = config.useSharedArrayBuffer && typeof SharedArrayBuffer !== 'undefined';
        config.useWebWorker = config.useWebWorker && typeof Worker !== 'undefined';
        config.useSAB = config.useWebWorker && config.useSharedArrayBuffer;

        super(app, config);

        const bodyCS = new BodyComponentSystem(app, this);
        const charCS = new CharComponentSystem(app, this);
        const softBodyCS = new SoftBodyComponentSystem(app, this);
        const constraintCS = new ConstraintComponentSystem(app, this);

        app.systems.add(bodyCS);
        app.systems.add(charCS);
        app.systems.add(softBodyCS);
        app.systems.add(constraintCS);

        const systems = this._systems;
        systems.set(COMPONENT_SYSTEM_BODY, bodyCS);
        systems.set(COMPONENT_SYSTEM_CHAR, charCS);
        systems.set(COMPONENT_SYSTEM_SOFT_BODY, softBodyCS);
        systems.set(COMPONENT_SYSTEM_CONSTRAINT, constraintCS);
        systems.set(COMPONENT_SYSTEM_MANAGER, this);

        // TODO
        // clear caches on destroy
        this._queryMap = new IndexedCache();
        this._shapeMap = new IndexedCache();
        this._gravity = new Vec3(0, -9.81, 0);
        this._resolve = resolve;

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

        // toggle debug draw view
        if ($_DEBUG) {
            this._draw = true;
            app.keyboard.on(EVENT_KEYDOWN, (e) => {
                if (e.key === config.debugDrawKey) {
                    this._draw = !this._draw;
                }
            });
        }

        msg.backendName = 'jolt';
        msg.config = config;
        this.sendUncompressed(msg);
    }

    /**
     * Sets the physics world gravity.
     *
     * @param {Vec3} gravity - Gravity vector.
     */
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

    /**
     * Gets the current gravity vector.
     *
     * @type {Vec3}
     * @defaultValue Vec3(0, -9.81, 0)
     */
    get gravity() {
        return this._gravity;
    }

    /**
     * @type {IndexedCache}
     * @private
     */
    get queryMap() {
        return this._queryMap;
    }

    onMessage(msg) {
        const data = msg.data || msg;

        super.onMessage(data);

        if (data.initDone) {
            this._updateEvent = this._app.systems.on('postUpdate', this.onUpdate, this);
            if ($_DEBUG) {
                console.log('Physics Components:', $_VERSION);
            }
            this._resolve();
        }

        if ($_DEBUG && data.drawViews && this._draw) {
            debugDraw(this._app, data.drawViews, this._config);
        }
    }

    processCommands(cb) {
        const command = cb.readCommand();

        switch (command) {
            case CMD_CAST_RAY:
            case CMD_CAST_SHAPE:
                ResponseHandler.handleCastQuery(cb, this._queryMap);
                break;
            case CMD_COLLIDE_POINT:
                ResponseHandler.handleCollidePointQuery(cb, this._queryMap);
                break;
            case CMD_COLLIDE_SHAPE_IDX:
                ResponseHandler.handleCollideShapeQuery(cb, this._queryMap);
                break;
        }
    }

    /**
     * Sometimes it is useful to have a callback right before the physics world steps. You can set
     * such a callback function via this method.
     *
     * Your given callback will be called after all commands have been executed and right before
     * we update virtual kinematic characters and step the physics world.
     *
     * Note, this feature is disabled, when the backend runs in a Web Worker.
     *
     * @param {function} func - Callback function to execute before stepping the physics world.
     */
    addUpdateCallback(func) {
        if (this._config.useWebWorker) {
            if ($_DEBUG) {
                Debug.warn('Physics update callback is not supported when Web Worker is enabled.');
            }
            return;
        }

        this._backend.updateCallback = func;
    }

    /**
     * Removes a callback that was set via {@link addUpdateCallback}.
     */
    removeUpdateCallback() {
        if (this._config.useWebWorker) {
            if ($_DEBUG) {
                Debug.warn('Physics update callback is not supported when Web Worker is enabled.');
            }
            return;
        }

        this._backend.updateCallback = null;
    }

    /**
     * Creates a shape in the physics backend. Note, that the shape is not added to the physics
     * world after it is created, so it won't affect the simulation.
     *
     * This is useful, when you want to use a shape for a shapecast, or want your kinematic
     * character controller to change current shape (e.g. standing, sitting, laying, etc).
     *
     * Once you no longer need the shape, you must {@link destroyShape} to avoid memory leaks.
     *
     * @example
     * ```js
     * import { SHAPE_CAPSULE } from './physics.dbg.mjs';
     *
     * // create a 2m high and 0.6m wide capsule.
     * const shapeIndex = app.physics.createShape(SHAPE_CAPSULE, {
     *     halfHeight: 1,
     *     radius: 0.3
     * });
     * ```
     *
     * @param {number} type - Shape type number.
     * options.
     * @param {ShapeSettings} [options] - Optional shape settings.
     * @see {@link ShapeComponent.shape} for available shape type options.
     * @returns {number} Shape index.
     */
    createShape(type, options = {}) {
        const cb = this._outBuffer;

        const opts = {
            // defaults
            density: 1000,
            shapePosition: Vec3.ZERO,
            shapeRotation: Quat.IDENTITY,
            scale: Vec3.ONE,
            halfExtent: JoltManager.defaultHalfExtent,
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

    /**
     * Destroys a shape that was previously created with {@link createShape}.
     *
     * @param {number} index - Shape index number.
     */
    destroyShape(index) {
        if ($_DEBUG) {
            const ok = Debug.checkUint(index, `Invalid shape number: ${index}`);
            if (!ok)
                return;
        }

        const cb = this._outBuffer;

        cb.writeOperator(OPERATOR_CLEANER);
        cb.writeCommand(CMD_DESTROY_SHAPE);
        cb.write(index, BUFFER_WRITE_UINT32, false);

        this._shapeMap.free(index);
    }

    /**
     * Creates a raycast query to the physics world.
     *
     * @example
     * ```
     * // Cast a 10 meters ray from (0, 5, 0) straight down.
     * const origin = new Vec3(0, 5, 0);
     * const dir = new Vec3(0, -10, 0);
     * app.physics.castRay(origin, dir, onResults, { firstOnly: false });
     *
     * function onResults(results) {
     *     if (results.length === 0) {
     *         return;
     *     }
     *     // do something with results
     * }
     * ```
     *
     * @param {Vec3} origin - World point where the ray originates from.
     * @param {Vec3} dir - Non-normalized ray direction. The magnitude is ray's distance.
     * @param {function} callback - Your function that will accept the raycast result.
     * @param {import('./interfaces/settings.mjs').CastRaySettings} [opts] - Settings object to customize the query.
     */
    castRay(origin, dir, callback, opts) {
        if ($_DEBUG) {
            let ok = Debug.checkVec(origin, `Invalid origin vector`);
            ok = ok && Debug.checkVec(dir, `Invalid direction vector`);
            ok = ok && Debug.assert(callback, 'castRay requires a callback function castRay(origin, dir, callback, opts)');
            if (ok && opts?.firstOnly != null) {
                ok = Debug.checkBool(opts.firstOnly, `Invalid first only boolean`);
            }
            if (ok && opts?.calculateNormal != null) {
                ok = Debug.checkBool(opts.calculateNormal, `Invalid calculate normal boolean`);
            }
            if (ok && opts?.ignoreBackFaces != null) {
                ok = Debug.checkBool(opts.ignoreBackFaces, `Invalid ignore backfaces boolean`);
            }
            if (ok && opts?.treatConvexAsSolid != null) {
                ok = Debug.checkBool(opts.treatConvexAsSolid, `Invalid treat convex as solid boolean`);
            }
            if (ok && opts?.bpFilterLayer != null) {
                ok = Debug.checkUint(opts.bpFilterLayer, `Invalid bpFilterLayer number`);
            }
            if (ok && opts?.objFilterLayer != null) {
                ok = Debug.checkUint(opts.objFilterLayer, `Invalid objFilterLayer number`);
            }
            if (ok && opts?.ignoreSensors != null) {
                ok = Debug.checkBool(opts.ignoreSensors, `Invalid ignoreSensors boolean`);
            }
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
        cb.write(callbackIndex, BUFFER_WRITE_UINT16, false);
        cb.write(origin, BUFFER_WRITE_VEC32, false);
        cb.write(dir, BUFFER_WRITE_VEC32, false);
        cb.write(opts?.firstOnly, BUFFER_WRITE_BOOL);
        cb.write(opts?.calculateNormal, BUFFER_WRITE_BOOL);
        cb.write(opts?.ignoreBackFaces, BUFFER_WRITE_BOOL);
        cb.write(opts?.treatConvexAsSolid, BUFFER_WRITE_BOOL);
        cb.write(opts?.ignoreSensors, BUFFER_WRITE_BOOL);
        cb.write(opts?.bpFilterLayer, BUFFER_WRITE_UINT32);
        cb.write(opts?.objFilterLayer, BUFFER_WRITE_UINT32);
    }

    /**
     * Creates a shapecast query to the physics world.
     *
     * @example
     * ```
     * import { SHAPE_SPHERE } from './physics.dbg.mjs';
     *
     * // Do a 10 meters cast with a 0.3 radius sphere from (0, 5, 0) straight down.
     * const shapeIndex = app.physics.createShape(SHAPE_SPHERE, { radius: 0.3 });
     * const pos = new Vec3(0, 5, 0);
     * const dir = new Vec3(0, -10, 0);
     * app.physics.castShape(shapeIndex, pos, Quat.IDENTITY, dir, onResults, {
     *     ignoreSensors: true
     * });
     *
     * function onResults(results) {
     *     if (results.length === 0) {
     *         return;
     *     }
     *     // do something with results
     * }
     * ```
     *
     * @param {number} shapeIndex - Shape index number. Create one using {@link createShape}.
     * @param {Vec3} pos - World point where the cast is originated from.
     * @param {Quat} rot - Shape rotation.
     * @param {Vec3} dir - Non-normalized ray direction. The magnitude is ray's distance.
     * @param {CastShapeCallback} callback - Your function that will accept the shapecast result.
     * @param {CastShapeSettings} [opts] - Settings object to customize the query.
     */
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
        cb.write(queryIndex, BUFFER_WRITE_UINT16, false);
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
        cb.write(opts?.ignoreSensors, BUFFER_WRITE_BOOL);
        cb.write(shapeIndex, BUFFER_WRITE_UINT32, false);
        cb.write(opts?.bpFilterLayer, BUFFER_WRITE_UINT32);
        cb.write(opts?.objFilterLayer, BUFFER_WRITE_UINT32);
    }

    /**
     * Check if a world point is inside any body shape. For this test all shapes are treated as if
     * they were solid. For a mesh shape, this test will only provide sensible information if the
     * mesh is a closed manifold.
     *
     * @example
     * ```js
     * // get all entities that overlap a world position (0, 5, 0)
     * app.physics.collidePoint(new Vec3(0, 5, 0), onResults, { ignoreSensors: true });
     *
     * function onResults(results) {
     *     if (results.length === 0) {
     *         return;
     *     }
     *     // do something with results
     * }
     * ```
     *
     * @param {Vec3} point - World position to test.
     * @param {function} callback - Function to take the query results.
     * @param {import('./interfaces/settings.mjs').QuerySettings} opts - Query customization settings.
     */
    collidePoint(point, callback, opts) {
        if ($_DEBUG) {
            let ok = Debug.checkVec(point, `Invalid point vector`);
            if (ok && opts?.bpFilterLayer != null) {
                ok = Debug.checkUint(opts.bpFilterLayer, `Invalid broadphase filter layer`);
            }
            if (ok && opts?.objFilterLayer != null) {
                ok = Debug.checkUint(opts.objFilterLayer, `Invalid object filter layer`);
            }
            if (!ok) {
                return;
            }
        }

        const cb = this._outBuffer;
        const queryIndex = this._queryMap.add(callback);

        cb.writeOperator(OPERATOR_QUERIER);
        cb.writeCommand(CMD_COLLIDE_POINT);
        cb.write(queryIndex, BUFFER_WRITE_UINT16, false);
        cb.write(opts?.ignoreSensors, BUFFER_WRITE_BOOL);
        cb.write(opts?.bpFilterLayer, BUFFER_WRITE_UINT32);
        cb.write(opts?.objFilterLayer, BUFFER_WRITE_UINT32);
        cb.write(point, BUFFER_WRITE_VEC32, false);
    }

    /**
     * Gets all entities that collide with a given shape.
     *
     * @example
     * ```js
     * import { SHAPE_BOX } from './physics.dbg.mjs';
     *
     * // create a box with a half extent (1, 1, 1) meters
     * const shapeIndex = app.physics.createShape(SHAPE_BOX, { halfExtent: Vec3.ONE });
     *
     * // get all entities that intersect a box with half extent (0.2, 0.5, 0.2) at world position
     * // (0, 10, 0)
     * const scale = new Vec3(0.2, 0.5, 0.2);
     * const pos = new Vec3(0, 10, 0);
     * app.physics.collideShape(shapeIndex, pos, Quat.IDENTITY, onResults, { scale });
     *
     * function onResults(results) {
     *     if (results.length === 0) {
     *         return;
     *     }
     *     // do something with the results
     * }
     *
     * ```
     *
     * @param {number} shapeIndex - Shape index created with {@link createShape}.
     * @param {Vec3} position - World position of the shape.
     * @param {Vec3} rotation - World rotation of the shape.
     * @param {function} callback - Callback function that will take the query results.
     * @param {import('./interfaces/settings.mjs').CollideShapeSettings} opts - Query customization settings.
     */
    collideShape(shapeIndex, position, rotation, callback, opts) {
        if ($_DEBUG) {
            let ok = Debug.checkInt(shapeIndex, `Invalid shape index`);
            ok = ok && Debug.checkVec(position, `Invalid shape position vector`);
            ok = ok && Debug.checkQuat(rotation, `Invalid rotation quaternion`);
            if (ok && opts?.scale) {
                ok = Debug.checkVec(opts.scale, `Invalid shape scale`);
            }
            if (ok && opts?.maxSeparationDistance != null) {
                ok = Debug.checkFloat(opts.maxSeparationDistance, `Invalid max separation distance`);
            }
            if (ok && opts?.backFaceMode != null) {
                ok = Debug.checkUint(opts?.backFaceMode, `Invalid back face mode`);
            }
            if (ok && opts?.offset) {
                ok = Debug.checkVec(opts.offset, `Invalid shape position linear offset vector`);
            }
            if (ok && opts?.bpFilterLayer != null) {
                ok = Debug.checkUint(opts.bpFilterLayer, `Invalid broadphase filter layer`);
            }
            if (ok && opts?.objFilterLayer != null) {
                ok = Debug.checkUint(opts.objFilterLayer, `Invalid object filter layer`);
            }
            if (!ok) {
                return;
            }
        }

        const cb = this._outBuffer;
        const queryIndex = this._queryMap.add(callback);

        cb.writeOperator(OPERATOR_QUERIER);
        cb.writeCommand(CMD_COLLIDE_SHAPE_IDX);
        cb.write(queryIndex, BUFFER_WRITE_UINT16, false);
        cb.write(opts?.firstOnly, BUFFER_WRITE_BOOL);
        cb.write(opts?.ignoreSensors, BUFFER_WRITE_BOOL);
        cb.write(shapeIndex, BUFFER_WRITE_UINT32, false);
        cb.write(position, BUFFER_WRITE_VEC32, false);
        cb.write(rotation, BUFFER_WRITE_VEC32, false);
        cb.write(opts?.scale, BUFFER_WRITE_VEC32);
        cb.write(opts?.maxSeparationDistance, BUFFER_WRITE_FLOAT32);
        cb.write(opts?.ignoreBackFaces, BUFFER_WRITE_BOOL);
        cb.write(opts?.calculateNormal, BUFFER_WRITE_BOOL);
        cb.write(opts?.offset, BUFFER_WRITE_VEC32);
        cb.write(opts?.bpFilterLayer, BUFFER_WRITE_UINT32);
        cb.write(opts?.objFilterLayer, BUFFER_WRITE_UINT32);
    }

    /**
     * Allows to create collision groups. Note, that collision groups are more expensive than
     * broadphase layers.
     *
     * The groups are created by giving an array of numbers, where each element adds a group and
     * its number represents the count of subgroups in it.
     *
     * @example
     * ```js
     * // Create `2` groups. The first group has `3` subgroups, the second `5`.
     * app.physics.createGroups([3, 5]);
     * ```
     *
     * For additional information, refer to Jolt's official documentation on
     * [Collision Filtering](https://jrouwe.github.io/JoltPhysics/index.html#collision-filtering).
     *
     * @param {Array<number>} groups - Collision groups.
     */
    createCollisionGroups(groups) {
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

    /**
     * Toggles a collision between 2 subgroups inside a group.
     *
     * @param {number} group - Group index number.
     * @param {number} subGroup1 - First subgroup number.
     * @param {number} subGroup2 - Second subgroup number.
     * @param {boolean} enable - `true` to enable, `false` to disable collision.
     */
    toggleGroupPair(group, subGroup1, subGroup2, enable) {
        if ($_DEBUG) {
            let ok = Debug.checkUint(group, `Invalid group 1: ${group}`);
            ok = ok && Debug.checkUint(subGroup1, `Invalid group 1: ${subGroup1}`);
            ok = ok && Debug.checkUint(subGroup2, `Invalid group 2: ${subGroup2}`);
            ok = ok && Debug.checkBool(enable, `Invalid toggle flag: ${enable}`);
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
}

export { JoltManager };

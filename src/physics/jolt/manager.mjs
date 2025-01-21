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
    BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_INT32, BUFFER_WRITE_UINT16,
    BUFFER_WRITE_UINT32, BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32, CMD_CAST_RAY, CMD_CAST_SHAPE,
    CMD_CHANGE_GRAVITY, CMD_COLLIDE_POINT, CMD_COLLIDE_SHAPE_IDX, CMD_CREATE_GROUPS,
    CMD_CREATE_SHAPE, CMD_DESTROY_SHAPE, CMD_RESET_PHYSICS_SYSTEM, CMD_TOGGLE_GROUP_PAIR, COMPONENT_SYSTEM_BODY,
    COMPONENT_SYSTEM_CHAR, COMPONENT_SYSTEM_CONSTRAINT, COMPONENT_SYSTEM_MANAGER,
    COMPONENT_SYSTEM_SOFT_BODY, MOTION_TYPE_DYNAMIC, MOTION_TYPE_KINEMATIC, MOTION_TYPE_STATIC,
    OPERATOR_CLEANER, OPERATOR_CREATOR, OPERATOR_MODIFIER, OPERATOR_QUERIER, UINT16_SIZE,
    UINT8_SIZE
} from './constants.mjs';
import { CommandsBuffer } from './back/commands-buffer.mjs';

/**
 * @import { CastCallback, CollidePointCallback, CollideShapeCallback }
 * from './interfaces/query-results.mjs'
 * @import { CastShapeSettings, CollideShapeSettings, CastRaySettings, QuerySettings,
 * ImmediateSettings, ShapeSettings } from './interfaces/settings.mjs'
 * @import { CastResult, CollideShapeResult } from './front/response-handler.mjs'
 * @import { Entity } from 'playcanvas'
 */

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
        config.useSharedArrayBuffer = config.useSharedArrayBuffer &&
            typeof SharedArrayBuffer !== 'undefined';
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

        this._queryMap = new IndexedCache();
        this._shapeMap = new IndexedCache();
        this._gravity = new Vec3(0, -9.81, 0);
        this._resolve = resolve;
        this._immediateBuffer = config.useWebWorker ? null : new CommandsBuffer({
            useSharedArrayBuffer: false,
            commandsBufferSize: 1000,
            allowCommandsBufferResize: true
        });
        this._immediateMessage = {
            type: 'immediate', buffer: this._immediateBuffer, origin: 'physics-manager'
        };

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
                const href = window.location.href;
                msg.glueUrl = new URL(glueAsset.getFileUrl(), `${href}${'js'}`).href;
                msg.wasmUrl = new URL(wasmAsset.getFileUrl(), `${href}${'wasm'}`).href;
            }
        }

        // toggle debug draw view
        if ($_DEBUG) {
            this._draw = true;
            this._debugDrawToggleEvent = app.keyboard.on(EVENT_KEYDOWN, (e) => {
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
            const ok = Debug.checkVec(gravity);
            if (!ok) {
                return;
            }
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
     * @param {object} instance - Jolt backend instance.
     * @hidden
     */
    set backend(instance) {
        this._backend = instance;
    }

    /**
     * Gets the Jolt Backend instance. This is useful, when components are not sufficient and you
     * wish to access Jolt's API directly.
     *
     * Note, this will be `null`, if the backend runs in a web worker. In this case you don't have
     * access to the instance.
     *
     * @example
     * ```js
     * const backend = app.physics.backend;
     * const Jolt = backend.Jolt;
     * const joltVec = new Jolt.Vec3(0, 0, 0);
     *
     * // common Jolt interfaces you might want, which the backend has already instantiated
     * backend.physicsSystem;
     * backend.bodyInterface;
     * backend.joltInterface;
     * ```
     *
     * @type {object | null}
     */
    get backend() {
        return this._backend;
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

    processImmediateBuffer(buffer) {
        const systems = this._systems;
        const operator = buffer.readOperator();
        if ($_DEBUG) {
            const ok = Debug.assert(!!systems.get(operator), `Invalid component system: ${operator}`);
            if (!ok) {
                return;
            }
        }

        buffer.reset();

        return systems.get(operator).processCommands(buffer);
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
     * A callback function to call when all rigid and soft bodies fall asleep. It will be called
     * every frame, while the bodies are not active.
     *
     * Note, that if a kinematic body has an {@link BodyComponent.isometryUpdate} set to
     * `ISOMETRY_DEFAULT` or `ISOMETRY_FRONT_TO_BACK`, then the body will have its transforms get
     * auto-updated in physics world every frame, preventing it from falling asleep. If you need
     * this callback while using a kinematic body, then set its isometry update to
     * `ISOMETRY_BACK_TO_FRONT` and control its transforms via component's move methods, e.g.
     * `{@link BodyComponent.teleport}`, {@link BodyComponent.linearVelocity} etc. That will stop
     * the frontend from sending isometry updates every frame and will rely on you setting its
     * transforms when needed.
     *
     * Feature is disabled when web worker is used.
     *
     * @param {function} func - Callback function to execute.
     */
    addIdleCallback(func) {
        // TODO
        // add support for web worker
        if (this._config.useWebWorker) {
            if ($_DEBUG) {
                Debug.warn('Physics idle callback is not supported when web worker is enabled.');
            }
            return;
        }

        this._backend.idleCallback = func;
    }

    /**
     * Removes a callback that was set via {@link addIdleCallback}.
     */
    removeIdleCallback() {
        if (this._config.useWebWorker) {
            if ($_DEBUG) {
                Debug.warn('Physics idle callback is not supported when Web Worker is enabled.');
            }
            return;
        }

        this._backend.idleCallback = null;
    }

    /**
     * Sometimes it is useful to have a callback right before the physics world steps. You can set
     * such a callback function via this method.
     *
     * Your given callback will be called after all commands have been executed and right before
     * we update virtual characters and step the physics world.
     *
     * Note, this feature is disabled, when the backend runs in a web worker.
     *
     * @param {function} func - Callback function to execute before stepping the physics world.
     */
    addUpdateCallback(func) {
        // TODO
        // add support for web worker
        if (this._config.useWebWorker) {
            if ($_DEBUG) {
                Debug.warn('Physics update callback is not supported when web worker is enabled.');
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
     * @param {number} type - Shape type number ({@link ShapeComponent.shape}).
     * @param {ShapeSettings} [opts] - Shape settings.
     * @see {@link ShapeComponent.shape} for available shape type options.
     * @returns {number} Shape index (uint).
     */
    createShape(type, opts = {}) {
        const options = {
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
            ...opts,

            // hard rules
            shape: type,
            useEntityScale: false,
            isCompoundChild: false,
            massOffset: Vec3.ZERO
        };

        const index = this._shapeMap.add(options);
        const useImmediate = !this._config.useWebWorker && (options.immediate ?? true);
        const cb = useImmediate ? this._immediateBuffer : this._outBuffer;

        if (useImmediate) {
            cb.init();
            cb.reset();
        }

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_SHAPE);
        cb.write(index, BUFFER_WRITE_UINT32, false);

        ShapeComponent.writeShapeData(cb, options, true /* force write rotation */);

        if (useImmediate) {
            // Reset outbound buffer, so backend can start reading it from the beginning.
            cb.reset();

            this._dispatcher.immediateExecution(cb, cb.meshBuffers);
        }

        return index;
    }

    /**
     * Destroys a shape that was previously created with {@link createShape}.
     *
     * @param {number} index - Shape index number.
     * @param {ImmediateSettings} [opts] - Customization options.
     */
    destroyShape(index, opts = {}) {
        if ($_DEBUG) {
            const ok = Debug.checkUint(index);
            if (!ok) {
                return;
            }
        }

        const useImmediate = !this._config.useWebWorker && (opts?.immediate ?? true);
        const cb = useImmediate ? this._immediateBuffer : this._outBuffer;

        if (useImmediate) {
            cb.init();
            cb.reset();
        }

        cb.writeOperator(OPERATOR_CLEANER);
        cb.writeCommand(CMD_DESTROY_SHAPE);
        cb.write(index, BUFFER_WRITE_UINT32, false);

        this._shapeMap.free(index);

        if (useImmediate) {
            // Reset outbound buffer, so backend can start reading it from the beginning.
            cb.reset();

            this._dispatcher.immediateExecution(cb);
        }
    }

    /**
     * Creates a raycast query to the physics world.
     *
     * Note, that a callback function is optional when running physics on main thread. When using
     * a web worker, the method will not return any results directly, but will send them to your
     * callback function instead once the frontend gets the worker's response. It also means that
     * when using a web worker a callback function is no longer optional and is required.
     *
     * @example
     * ```
     * // Cast a 10 meters ray from (0, 5, 0) straight down.
     * const origin = new Vec3(0, 5, 0);
     * const dir = new Vec3(0, -10, 0);
     * const results = app.physics.castRay(origin, dir, null, { firstOnly: false });
     * if (results.length > 0) {
     *     // do something with the results
     * }
     * ```
     *
     * @param {Vec3} origin - World point where the ray originates from.
     * @param {Vec3} dir - Non-normalized ray direction. The magnitude is ray's distance.
     * @param {CastCallback | null} [callback] - A callback function that will accept the raycast
     * results.
     * @param {CastRaySettings | null} [opts] - Settings object to customize the query.
     * @returns {CastResult[] | null} - Returns an array of cast results (empty array if no
     * result). Will return `null`, if not using {@link CastRaySettings.immediate} mode.
     */
    castRay(origin, dir, callback = null, opts = null) {
        const useWebWorker = this._config.useWebWorker;

        if ($_DEBUG) {
            let ok = Debug.checkVec(origin);
            ok = ok && Debug.checkVec(dir);
            if (ok && opts?.firstOnly != null) {
                ok = Debug.checkBool(opts.firstOnly);
            }
            if (ok && opts?.calculateNormal != null) {
                ok = Debug.checkBool(opts.calculateNormal);
            }
            if (ok && opts?.ignoreBackFaces != null) {
                ok = Debug.checkBool(opts.ignoreBackFaces);
            }
            if (ok && opts?.treatConvexAsSolid != null) {
                ok = Debug.checkBool(opts.treatConvexAsSolid);
            }
            if (ok && opts?.bpFilterLayer != null) {
                ok = Debug.checkUint(opts.bpFilterLayer);
            }
            if (ok && opts?.objFilterLayer != null) {
                ok = Debug.checkUint(opts.objFilterLayer);
            }
            if (ok && opts?.ignoreSensors != null) {
                ok = Debug.checkBool(opts.ignoreSensors);
            }
            if (useWebWorker) {
                if (opts.immediate) {
                    Debug.warn('Requesting immediate query results, which is not supported when ' +
                        'running physics in a web worker.');
                }
                if (!callback) {
                    Debug.warn('Cast ray query callback is required when using a web worker.');
                    ok = false;
                }
            } else if (!(opts.immediate ?? true) && !callback) {
                Debug.warn('Cast ray query callback is required when not using immediate mode.');
                ok = false;
            }
            if (!ok) {
                return null;
            }
        }

        const useImmediate = !this._config.useWebWorker && (opts?.immediate ?? true);
        const cb = useImmediate ? this._immediateBuffer : this._outBuffer;
        const callbackIndex = this._queryMap.add(callback);

        if (useImmediate) {
            cb.init();
            cb.reset();
        }

        // TODO
        // get rid of flags

        cb.writeOperator(OPERATOR_QUERIER);
        cb.writeCommand(CMD_CAST_RAY);
        cb.write(callbackIndex, BUFFER_WRITE_INT32, false);
        cb.write(useImmediate, BUFFER_WRITE_BOOL, false);
        cb.write(origin, BUFFER_WRITE_VEC32, false);
        cb.write(dir, BUFFER_WRITE_VEC32, false);
        cb.write(opts?.firstOnly, BUFFER_WRITE_BOOL);
        cb.write(opts?.calculateNormal, BUFFER_WRITE_BOOL);
        cb.write(opts?.ignoreBackFaces, BUFFER_WRITE_BOOL);
        cb.write(opts?.treatConvexAsSolid, BUFFER_WRITE_BOOL);
        cb.write(opts?.ignoreSensors, BUFFER_WRITE_BOOL);
        cb.write(opts?.bpFilterLayer, BUFFER_WRITE_UINT32);
        cb.write(opts?.objFilterLayer, BUFFER_WRITE_UINT32);

        if (useImmediate) {
            // Reset outbound buffer, so backend can start reading it from the beginning.
            cb.reset();

            const resultsBuffer = this._dispatcher.immediateExecution(cb);

            // Reset the inbound buffer, so components can read it from the start.
            resultsBuffer.reset();

            // skip reading operator and command
            resultsBuffer.skip(1, UINT16_SIZE + UINT8_SIZE);

            return ResponseHandler.handleCastQuery(resultsBuffer, this._queryMap);
        }

        return null;
    }

    /**
     * Creates a shapecast query to the physics world.
     *
     * Note, that a callback function is optional when running physics on main thread. When using
     * a web worker, the method will not return any results directly, but will send them to your
     * callback function instead once the frontend gets the worker's response. It also means that
     * when using a web worker a callback function is no longer optional and is required.
     *
     * @example
     * ```
     * import { SHAPE_SPHERE } from './physics.dbg.mjs';
     *
     * // Do a 10 meters cast with a 0.3 radius sphere from (0, 5, 0) straight down.
     * const shapeIndex = app.physics.createShape(SHAPE_SPHERE, { radius: 0.3 });
     * const pos = new Vec3(0, 5, 0);
     * const dir = new Vec3(0, -10, 0);
     * const results = app.physics.castShape(shapeIndex, pos, Quat.IDENTITY, dir, null, {
     *     ignoreSensors: true
     * });
     * if (results.length > 0) {
     *     // do something with the results
     * }
     * ```
     *
     * @param {number} shapeIndex - Shape index number. Create one using {@link createShape}.
     * @param {Vec3} position - World point where the cast is originated from.
     * @param {Quat} rotation - Shape rotation.
     * @param {Vec3} dir - Non-normalized ray direction. The magnitude is ray's distance.
     * @param {CastCallback | null} [callback] - A callback function that will accept the raycast
     * results.
     * @param {CastShapeSettings | null} [opts] - Settings object to customize the query.
     * @returns {CastResult[] | null} - Returns an array of cast results (empty array if no
     * result). Will return `null`, if not using {@link CastShapeSettings.immediate} mode.
     */
    castShape(shapeIndex, position, rotation, dir, callback = null, opts = null) {
        const useWebWorker = this._config.useWebWorker;

        if ($_DEBUG) {
            let ok = Debug.checkInt(shapeIndex);
            ok = ok && Debug.checkVec(position);
            ok = ok && Debug.checkQuat(rotation);
            ok = ok && Debug.checkVec(dir);

            if (useWebWorker) {
                if (opts?.immediate) {
                    Debug.warn('Requesting immediate query results, which is not supported when ' +
                        'running physics in a web worker.');
                }
                if (!callback) {
                    Debug.warn('Cast shape query callback is required when using a web worker.');
                    ok = false;
                }
            } else if (!(opts?.immediate ?? true) && !callback) {
                Debug.warn('Cast shape query callback is required when not using immediate mode.');
                ok = false;
            }

            if (!ok) {
                return null;
            }
        }

        const useImmediate = !useWebWorker && (opts?.immediate ?? true);
        const cb = useImmediate ? this._immediateBuffer : this._outBuffer;
        const queryIndex = callback ? this._queryMap.add(callback) : -1;

        if (useImmediate) {
            cb.init();
            cb.reset();
        }

        // TODO
        // get rid of flags

        cb.writeOperator(OPERATOR_QUERIER);
        cb.writeCommand(CMD_CAST_SHAPE);
        cb.write(queryIndex, BUFFER_WRITE_INT32, false);
        cb.write(useImmediate, BUFFER_WRITE_BOOL, false);
        cb.write(position, BUFFER_WRITE_VEC32, false);
        cb.write(rotation, BUFFER_WRITE_VEC32, false);
        cb.write(dir, BUFFER_WRITE_VEC32, false);
        cb.write(opts?.scale, BUFFER_WRITE_VEC32);
        cb.write(opts?.offset, BUFFER_WRITE_VEC32);
        cb.write(opts?.backFaceModeTriangles, BUFFER_WRITE_UINT8);
        cb.write(opts?.backFaceModeConvex, BUFFER_WRITE_UINT8);
        cb.write(opts?.useShrunkenShapeAndConvexRadius, BUFFER_WRITE_BOOL);
        cb.write(opts?.returnDeepestPoint, BUFFER_WRITE_BOOL);
        cb.write(opts?.firstOnly, BUFFER_WRITE_BOOL);
        cb.write(opts?.calculateNormal, BUFFER_WRITE_BOOL);
        cb.write(opts?.ignoreSensors, BUFFER_WRITE_BOOL);
        cb.write(shapeIndex, BUFFER_WRITE_UINT32, false);
        cb.write(opts?.bpFilterLayer, BUFFER_WRITE_UINT32);
        cb.write(opts?.objFilterLayer, BUFFER_WRITE_UINT32);

        if (useImmediate) {
            // Reset outbound buffer, so backend can start reading it from the beginning.
            cb.reset();

            const resultsBuffer = this._dispatcher.immediateExecution(cb);

            // Reset the inbound buffer, so components can read it from the start.
            resultsBuffer.reset();

            // skip reading operator and command
            resultsBuffer.skip(1, UINT16_SIZE + UINT8_SIZE);

            return ResponseHandler.handleCastQuery(resultsBuffer, this._queryMap);
        }

        return null;
    }

    /**
     * Check if a world point is inside any body shape. For this test all shapes are treated as if
     * they were solid. For a mesh shape, this test will only provide sensible information if the
     * mesh is a closed manifold.
     *
     * Note, that a callback function is optional when running physics on main thread. When using
     * a web worker, the method will not return any results directly, but will send them to your
     * callback function instead once the frontend gets the worker's response. It also means that
     * when using a web worker a callback function is no longer optional and is required.
     *
     * @example
     * ```js
     * // get all entities that overlap a world position (0, 5, 0)
     * const results = app.physics.collidePoint(new Vec3(0, 5, 0), null, { ignoreSensors: true });
     * if (results.length > 0) {
     *     // do something with the results
     * }
     * ```
     *
     * @param {Vec3} point - World position to test.
     * @param {CollidePointCallback | null} [callback] - Function to take the query results.
     * @param {QuerySettings | null} [opts] - Query customization settings.
     * @returns {Entity[] | null} - An array of entities that the point collided with (empty array
     * if no result). Will return `null`, if not using {@link QuerySettings.immediate} mode.
     */
    collidePoint(point, callback = null, opts = null) {
        const useWebWorker = this._config.useWebWorker;

        if ($_DEBUG) {
            let ok = Debug.checkVec(point);
            if (ok && opts?.bpFilterLayer != null) {
                ok = Debug.checkUint(opts.bpFilterLayer);
            }
            if (ok && opts?.objFilterLayer != null) {
                ok = Debug.checkUint(opts.objFilterLayer);
            }
            if (useWebWorker) {
                if (opts?.immediate) {
                    Debug.warn('Requesting immediate query results, which is not supported when ' +
                        'running physics in a web worker.');
                }
                if (!callback) {
                    Debug.warn('Collide point query callback is required when using a web worker.');
                    ok = false;
                }
            } else if (!(opts?.immediate ?? true) && !callback) {
                Debug.warn('Collide point query callback is required when not using immediate ' +
                    'mode.');
                ok = false;
            }
            if (!ok) {
                return null;
            }
        }

        const useImmediate = !useWebWorker && (opts?.immediate ?? true);
        const cb = useImmediate ? this._immediateBuffer : this._outBuffer;
        const queryIndex = this._queryMap.add(callback);

        if (useImmediate) {
            cb.init();
            cb.reset();
        }

        cb.writeOperator(OPERATOR_QUERIER);
        cb.writeCommand(CMD_COLLIDE_POINT);
        cb.write(queryIndex, BUFFER_WRITE_INT32, false);
        cb.write(useImmediate, BUFFER_WRITE_BOOL, false);
        cb.write(opts?.ignoreSensors, BUFFER_WRITE_BOOL);
        cb.write(opts?.bpFilterLayer, BUFFER_WRITE_UINT32);
        cb.write(opts?.objFilterLayer, BUFFER_WRITE_UINT32);
        cb.write(point, BUFFER_WRITE_VEC32, false);

        if (useImmediate) {
            // Reset outbound buffer, so backend can start reading it from the beginning.
            cb.reset();

            const resultsBuffer = this._dispatcher.immediateExecution(cb);

            // Reset the inbound buffer, so components can read it from the start.
            resultsBuffer.reset();

            // skip reading operator and command
            resultsBuffer.skip(1, UINT16_SIZE + UINT8_SIZE);

            return ResponseHandler.handleCollidePointQuery(resultsBuffer, this._queryMap);
        }

        return null;
    }

    /**
     * Gets all entities that collide with a given shape.
     *
     * Note, that a callback function is optional when running physics on main thread. When using
     * a web worker, the method will not return any results directly, but will send them to your
     * callback function instead once the frontend gets the worker's response. It also means that
     * when using a web worker a callback function is no longer optional and is required.
     *
     * @example
     * ```js
     * import { SHAPE_BOX } from './physics.dbg.mjs';
     *
     * // create a box with a half extent (1, 1, 1) meters (now we can use the same shape for
     * // different casts, but simply modifying its scale during the cast)
     * const shapeIndex = app.physics.createShape(SHAPE_BOX, { halfExtent: Vec3.ONE });
     *
     * // get all entities that intersect a box with half extent (0.2, 0.5, 0.2) at world position
     * // (0, 10, 0)
     * const scale = new Vec3(0.2, 0.5, 0.2);
     * const pos = new Vec3(0, 10, 0);
     * const results = app.physics.collideShape(shapeIndex, pos, Quat.IDENTITY, null, { scale });
     * if (results.length > 0) {
     *     // do something with the results
     * }
     * ```
     *
     * @param {number} shapeIndex - Shape index created with {@link createShape}.
     * @param {Vec3} position - World position of the shape.
     * @param {Quat} [rotation] - World rotation of the shape.
     * @param {CollideShapeCallback | null} [callback] - Callback function that will take the
     * query results.
     * @param {CollideShapeSettings | null} [opts] - Query customization settings.
     * @returns {CollideShapeResult[] | null} - Returns an array of collision results (empty array
     * if no result). Will return `null`, if not using {@link CollideShapeSettings.immediate} mode.
     */
    collideShape(shapeIndex, position, rotation = Quat.IDENTITY, callback = null, opts = null) {
        const useWebWorker = this._config.useWebWorker;

        if ($_DEBUG) {
            let ok = Debug.checkInt(shapeIndex);
            ok = ok && Debug.checkVec(position);
            ok = ok && Debug.checkQuat(rotation);
            if (ok && opts?.scale) {
                ok = Debug.checkVec(opts.scale);
            }
            if (ok && opts?.maxSeparationDistance != null) {
                ok = Debug.checkFloat(opts.maxSeparationDistance);
            }
            if (ok && opts?.backFaceMode != null) {
                ok = Debug.checkUint(opts?.backFaceMode);
            }
            if (ok && opts?.offset) {
                ok = Debug.checkVec(opts.offset);
            }
            if (ok && opts?.bpFilterLayer != null) {
                ok = Debug.checkUint(opts.bpFilterLayer);
            }
            if (ok && opts?.objFilterLayer != null) {
                ok = Debug.checkUint(opts.objFilterLayer);
            }
            if (useWebWorker) {
                if (ok && opts?.immediate) {
                    Debug.warn('Requesting immediate query results, which is not supported when ' +
                        'running physics in a web worker.');
                }
                if (!callback) {
                    Debug.warn('Cast shape query callback is required when using a web worker.');
                    ok = false;
                }
            } else if (!(opts?.immediate ?? true) && !callback) {
                Debug.warn('Cast shape query callback is required when not using immediate mode.');
                ok = false;
            }
            if (!ok) {
                return null;
            }
        }

        const useImmediate = !useWebWorker && (opts?.immediate ?? true);
        const cb = useImmediate ? this._immediateBuffer : this._outBuffer;
        const queryIndex = callback ? this._queryMap.add(callback) : -1;

        if (useImmediate) {
            cb.init();
            cb.reset();
        }

        cb.writeOperator(OPERATOR_QUERIER);
        cb.writeCommand(CMD_COLLIDE_SHAPE_IDX);
        cb.write(queryIndex, BUFFER_WRITE_INT32, false);
        cb.write(useImmediate, BUFFER_WRITE_BOOL, false);
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

        if (useImmediate) {
            // Reset outbound buffer, so backend can start reading it from the beginning.
            cb.reset();

            const resultsBuffer = this._dispatcher.immediateExecution(cb);

            // Reset the inbound buffer, so components can read it from the start.
            resultsBuffer.reset();

            // skip reading operator and command
            resultsBuffer.skip(1, UINT16_SIZE + UINT8_SIZE);

            return ResponseHandler.handleCollideShapeQuery(resultsBuffer, this._queryMap);
        }

        return null;
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
     * @param {ImmediateSettings} [opts] - Customization options.
     */
    createCollisionGroups(groups, opts) {
        const groupsCount = groups.length;
        const useImmediate = !this._config.useWebWorker && (opts?.immediate ?? true);
        const cb = useImmediate ? this._immediateBuffer : this._outBuffer;

        if (useImmediate) {
            cb.init();
            cb.reset();
        }

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_GROUPS);
        cb.write(groupsCount, BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < groupsCount; i++) {
            // sub groups count
            cb.write(groups[i], BUFFER_WRITE_UINT32, false);
        }

        if (useImmediate) {
            // Reset outbound buffer, so backend can start reading it from the beginning.
            cb.reset();

            this._dispatcher.immediateExecution(cb);
        }
    }

    destroy() {
        this._immediateBuffer?.destroy();
        this._immediateBuffer = null;

        this._queryMap.clear();
        this._shapeMap.clear();

        this._debugDrawToggleEvent?.off();
        this._debugDrawToggleEvent = null;

        super.destroy();
    }

    reset() {
        const cb = this._outBuffer;

        this._queryMap.clear();
        this._shapeMap.clear();

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_RESET_PHYSICS_SYSTEM);
    }

    /**
     * Toggles a collision between 2 subgroups inside a group.
     *
     * @param {number} group - Group index number.
     * @param {number} subGroup1 - First subgroup number.
     * @param {number} subGroup2 - Second subgroup number.
     * @param {boolean} enable - `true` to enable, `false` to disable collision.
     * @param {ImmediateSettings} [opts] - Query customization options.
     */
    toggleGroupPair(group, subGroup1, subGroup2, enable, opts) {
        if ($_DEBUG) {
            let ok = Debug.checkUint(group);
            ok = ok && Debug.checkUint(subGroup1);
            ok = ok && Debug.checkUint(subGroup2);
            ok = ok && Debug.checkBool(enable);
            if (!ok) {
                return;
            }
        }

        const useImmediate = !this._config.useWebWorker && (opts?.immediate ?? true);
        const cb = useImmediate ? this._immediateBuffer : this._outBuffer;

        if (useImmediate) {
            cb.init();
            cb.reset();
        }

        cb.writeOperator(OPERATOR_MODIFIER);
        cb.writeCommand(CMD_TOGGLE_GROUP_PAIR);
        cb.write(enable, BUFFER_WRITE_BOOL, false);
        cb.write(group, BUFFER_WRITE_UINT16, false);
        cb.write(subGroup1, BUFFER_WRITE_UINT16, false);
        cb.write(subGroup2, BUFFER_WRITE_UINT16, false);

        if (useImmediate) {
            // Reset outbound buffer, so backend can start reading it from the beginning.
            cb.reset();

            this._dispatcher.immediateExecution(cb);
        }
    }
}

export { JoltManager };

import { Debug } from './jolt/debug.mjs';
import { JoltManager } from './jolt/manager.mjs';

/**
 * @import { Application, Color } from 'playcanvas'
 */

/**
 * An options object to configure Jolt Physics backend. All options are optional.
 *
 * @interface
 * @group Utilities
 * @category Init
 */
class JoltInitSettings {
    /**
     * Specifies, if {@link CommandsBuffer} can be resized, when it is full. On every frame the
     * buffer starts writing from the beginning, so it has a full capacity available for it. If
     * there is more data that needs to be written than the initial size specified with
     * {@link commandsBufferSize}, then it will grow by `50%` of the current size and try to write
     * it again. It will never shrink down, and will remain at the new size until it has to grow
     * again.
     *
     * If this is set to `false`, the growth becomes forbidden and the commands that did not fit
     * into the buffer will be ignored. Generally, 10kb is enough to move about 100-150 primitive
     * objects every frame.
     *
     * @type {boolean}
     * @defaultValue true
     */
    allowCommandsBufferResize;

    /**
     * Specifies if objects can go to sleep or not.
     *
     * Note, you can specify it on each object individually with
     * {@link BodyComponent.allowSleeping}.
     *
     * @type {boolean}
     * @defaultValue true
     */
    allowSleeping;

    /**
     * Baumgarte stabilization factor (how much of the position error to "fix" in 1 update):
     * - `0`: nothing
     * - `1`: 100%
     *
     * @type {number}
     * @defaultValue 0.2 (dimensionless)
     */
    baumgarte;

    /**
     * Enables objects filtering using group and mask bits, similar to Bullet, Rapier, etc. If
     * provided, it will disable default filtering. Uses group bits and mask bits to find collision
     * pairs. Two layers can collide if `object1.group` and `object2.mask` is non-zero and
     * `object2.group` and `object1.mask` is non-zero.
     *
     * Default Jolt build uses 16 bits for group filtering. In case you need more groups, you can
     * compile it with additional flag to enable 32 bits. Refer to official Jolt documentation for
     * building details.
     *
     * Group - an object group the object belongs to.
     * Mask - object groups the object can collide with.
     *
     * To enable the bits filtering, you should provide an array of numbers, where elements are
     * read in pairs:
     * - Each pair forms a new broadphase layer.
     * - First element of the pair are the groups to be included in that layer.
     * - Second element of the pair are the groups to be excluded from that layer.
     *
     * @example
     * ```js
     * // Layer that objects can be in, determines which other objects it can collide with
     * // Typically you at least want to have 1 layer for moving bodies and 1 layer for static bodies, but you can have more
     * // layers if you want.
     * const GROUP_STATIC = 1;
     * const GROUP_FLOOR1 = 2;
     * const GROUP_FLOOR2 = 4;
     * const GROUP_FLOOR3 = 8;
     * const GROUP_ALL = GROUP_STATIC | GROUP_FLOOR1 | GROUP_FLOOR2 | GROUP_FLOOR3;
     *
     * // init physics
     * await init(app, {
     *     fixedStep: 1 / 30,
     *     // ... other options,
     *
     *     // Each pair in array is a broadphase layer: [included groups, excluded groups]
     *     bitFiltering: [
     *         GROUP_STATIC, 0,
     *         GROUP_FLOOR1 | GROUP_FLOOR2 | GROUP_FLOOR3, 0
     *     ]
     * });
     *
     * // create floor that collides with everything
     * floorEntity.addComponent('body', {
     *     group: GROUP_STATIC,
     *     mask: GROUP_ALL
     * });
     *
     * // create a dynamic body that collides with a floor GROUP_FLOOR2
     * dynamicEntity.addComponent('body', {
     *     group: GROUP_FLOOR2,
     *     mask: GROUP_ALL
     * });
     * ```
     * @type {Array<number> | null}
     * @defaultValue null
     */
    bitFiltering;

    /**
     * Maximum relative delta orientation for body pairs to be able to reuse collision results from
     * last update, stored as
     * ```
     * cos(max angle / 2)
     * ```
     *
     * @type {number}
     * @defaultValue 0.9998476951563912 (radians)
     */
    bodyPairCacheCosMaxDeltaRotationDiv2;

    /**
     * Maximum relative delta position for body pairs to be able to reuse collision results from
     * last update.
     *
     * @type {number}
     * @defaultValue Math.sqrt(0.001) (meter^2)
     */
    bodyPairCacheMaxDeltaPositionSq;

    /**
     * Array of unique integer numbers, representing the broadphase layers. For additional details,
     * refer to Jolt's documentation:
     * [Collision Detection](https://jrouwe.github.io/JoltPhysics/index.html#collision-detection).
     *
     * @type {Array<number>}
     * @defaultValue [BP_LAYER_NON_MOVING, BP_LAYER_MOVING] ([0, 1])
     */
    broadPhaseLayers;

    /**
     * If `false`, characters will not emit contact events, which saves performance (no additional
     * JS callback calls from Wasm).
     *
     * @type {boolean}
     * @defaultValue true
     */
    charContactEventsEnabled;

    /**
     * When false, we prevent collision against non-active (shared) edges.
     *
     * @type {boolean}
     * @defaultValue true
     */
    checkActiveEdges;

    /**
     * Initial size of the {@link CommandsBuffer} in bytes.
     *
     * @type {number}
     * @defaultValue 10000 (10kb)
     */
    commandsBufferSize;

    /**
     * Whether or not to use warm starting for constraints (initially applying previous frames
     * impulses).
     *
     * @type {boolean}
     * @defaultValue true
     */
    constraintWarmStart;

    /**
     * If `true`, the collision result of two bodies will include the contact points. If you don't
     * need the exact points of collision (e.g. if it is enough to simply know if and which bodies
     * collided, but not at which point in world space), you should disable it to save some CPU work.
     *
     * @type {boolean}
     * @defaultValue true
     */
    contactPoints;

    /**
     * Ignored if {@link contactPoints} is `false`. If this is `true`, then the collision result
     * points will be averaged into a single point. Otherwise all points from collision manifold of
     * a body pair will be provided.
     *
     * For example, a box resting on a floor:
     * - `false`: will generate 4 contact points, one per each vertex of the box touching the
     * floor.
     * - `true`: will generate 1 contact point in the middle of 4 vertices of the box.
     *
     * @type {number}
     * @defaultValue true
     */
    contactPointsAveraged;

    /**
     * If `false`, bodies will not emit contact events, which saves performance (no additional JS
     * callback calls from Wasm).
     *
     * @type {boolean}
     * @defaultValue true
     */
    contactEventsEnabled;

    /**
     * Maximum allowed distance between old and new contact point to preserve contact forces for
     * warm start.
     *
     * @type {number}
     * @defaultValue Math.sqrt(0.01) (meter^2)
     */
    contactPointPreserveLambdaMaxDistSq;

    /**
     * Line color of the dynamic objects during a debug draw.
     *
     * @type {Color}
     * @defaultValue Color.YELLOW
     */
    debugColorDynamic;

    /**
     * Line color of the kinematic objects during a debug draw.
     *
     * @type {Color}
     * @defaultValue Color.MAGENTA
     */
    debugColorKinematic;

    /**
     * Line color of the static objects during a debug draw.
     *
     * @type {Color}
     * @defaultValue Color.GRAY
     */
    debugColorStatic;

    /**
     * The PlayCanvas Layer ID, where to debug draw lines.
     *
     * @type {number}
     * @defaultValue LAYERID_IMMEDIATE
     */
    debugDrawLayerId;

    /**
     * Makes the simulation deterministic at the cost of performance. Simulation runs faster, if
     * determinism is disabled.
     *
     * @type {boolean}
     * @defaultValue true
     */
    deterministicSimulation;

    /**
     * A fixed time intervals to update physics simulation at. Affects performance, so try to set
     * it as large as possible (fewer updates per second), until you start getting collision and
     * motion artifacts. Generally, `1/30` (30 updates per second) is a good option.
     *
     * @type {number}
     * @defaultValue 1/30
     */
    fixedStep;

    /**
     * Full path to JS glue file of Jolt Wasm generated by Emscripten.
     *
     * @type {string}
     */
    glueUrl;

    /**
     * Fraction of its inner radius a body may penetrate another body for the
     * `MOTION_QUALITY_LINEAR_CAST` of a {@link BodyComponent.motionQuality}.
     *
     * @type {number}
     * @defaultValue 0.25
     */
    linearCastMaxPenetration;

    /**
     * Fraction of its inner radius a body must move per step to enable casting for the
     * `MOTION_QUALITY_LINEAR_CAST` of a {@link BodyComponent.motionQuality }.
     *
     * @type {number}
     * @defaultValue 0.75
     */
    linearCastThreshold;

    /**
     * Max squared distance to use to determine if two points are on the same plane for determining
     * the contact manifold between two shape faces.
     *
     * @type {number}
     * @defaultValue 1.0e-6 (meter^2)
     */
    manifoldToleranceSq;

    /**
     * Array of non-unique integers, representing of one-to-one map of object layer to broadphase
     * layer. Each object layer can only belong to one and only one broadphase layer.
     *
     * For example, an array `[0, 0, 1, 1]` means that an object layer `0` belongs to broadphase
     * layer `0`, and object layer `1` belongs to broadphase layer `1`.
     *
     * For additional details, refer to Jolt's documentation:
     * [Collision Detection](https://jrouwe.github.io/JoltPhysics/index.html#collision-detection).
     *
     * @type {Array<number>}
     * @defaultValue [OBJ_LAYER_NON_MOVING, BP_LAYER_NON_MOVING, OBJ_LAYER_MOVING, BP_LAYER_MOVING]
     * (0, 0, 1, 1)
     */
    mapObjectToBroadPhaseLayer;

    /**
     * Size of body pairs array, corresponds to the maximum amount of potential body pairs that can
     * be in flight at any time. Setting this to a low value will use less memory inside Wasm (no
     * change on JS heap), but slow down simulation as threads may run out of narrow phase work.
     *
     * Note, that you would need a custom Wasm build to support multi-threading. Refer to Jolt's
     * [build section](https://github.com/jrouwe/JoltPhysics.js?tab=readme-ov-file#building) for
     * details.
     *
     * @type {number}
     * @defaultValue 16384
     */
    maxInFlightBodyPairs;

    /**
     * Maximum distance to correct in a single iteration when solving position constraints.
     *
     * @type {number}
     * @defaultValue 0.2 (meters)
     */
    maxPenetrationDistance;

    /**
     * Maximum number of physics updates we allow to fast-forward. For example, if we switch a
     * browser tab, the main thread will pause. Once the app comes back to focus, the delta time
     * from the last update will be large. The system will try to catch up the missed time by
     * looping the physics update until the accumulated time is exhausted.
     *
     * This setting effectively clamps the missed time, so the resulting delta time is small on
     * resume. For example, if we missed 1000 updates, and this setting is set to 5, then once
     * application resumes, the system will run 5 updates before continuing running updates as
     * usual.
     *
     * It is difficult to advice on a good number, as it depends on {@link fixedStep},
     * {@link subSteps}, and others. Probably 2-5 is a good range to start with. Keep it low and
     * experiment with your app switching tabs. The lower this number is the better.
     *
     * @type {number}
     * @defaultValue 3
     */
    maxSkippedSteps;

    /**
     * Minimal velocity needed before a collision can be elastic.
     *
     * @type {number}
     * @defaultValue 1 (m/s)
     */
    minVelocityForRestitution;

    /**
     * Number of solver position iterations to run.
     *
     * @type {number}
     * @defaultValue 2
     */
    numPositionSteps;

    /**
     * Number of solver velocity iterations to run. Note that this needs to be `>= 2` in order for
     * friction to work (friction is applied using the non-penetration impulse from the previous
     * iteration).
     *
     * @type {number}
     * @defaultValue 10
     */
    numVelocitySteps;

    /**
     * Array of non-unique integers, representing pairs of object layers. Objects that belong to
     * one of the layers in the pair are allowed to collide. For additional details, refer to
     * Jolt's documentation:
     * [Collision Detection](https://jrouwe.github.io/JoltPhysics/index.html#collision-detection).
     *
     * For example: `[0, 1, 2, 0, 2, 2]` - means three pairs of layers `[0, 1]`, `[2, 0]` and
     * `[2, 2]`:
     * - Objects that belong to layer `0` can collide with layer `1` and `2`.
     * - Objects that belong to layer `1` can only collide with layer `0`.
     * - Objects that belong to layer `2` can collide with layer `0` and with other objects in the
     * same layer `2`.
     *
     * @type {Array<number>}
     * @defaultValue [OBJ_LAYER_NON_MOVING, OBJ_LAYER_MOVING, OBJ_LAYER_MOVING, OBJ_LAYER_MOVING]
     * ([0, 1, 1, 1])
     */
    objectLayerPairs;

    /**
     * How much bodies are allowed to sink into each other.
     *
     * @type {number}
     * @defaultValue 0.02 (meters)
     */
    penetrationSlop;

    /**
     * Velocity of points on bounding box of object below which an object can be considered
     * sleeping.
     *
     * @type {number}
     * @defaultValue 0.03 (m/s)
     */
    pointVelocitySleepThreshold;

    /**
     * Radius around objects inside which speculative contact points will be detected. Note that if
     * this is too big you will get ghost collisions as speculative contacts are based on the
     * closest points during the collision detection step which may not be the actual closest
     * points by the time the two objects hit.
     *
     * @type {number}
     * @defaultValue 0.02 (meters)
     */
    speculativeContactDistance;

    /**
     * How many step listener batches are needed before spawning another job (set to
     * `Number.MAX_SAFE_INTEGER`, if no parallelism is desired).
     *
     * Note, that you would need a custom Wasm build to support multi-threading. Refer to Jolt's
     * [build section](https://github.com/jrouwe/JoltPhysics.js?tab=readme-ov-file#building) for
     * details.
     *
     * @type {number}
     * @defaultValue 1
     */
    stepListenerBatchesPerJob;

    /**
     * How many PhysicsStepListeners to notify in `1` batch.
     *
     * Note, that you would need a custom Wasm build to support multi-threading. Refer to Jolt's
     * [build section](https://github.com/jrouwe/JoltPhysics.js?tab=readme-ov-file#building) for
     * details.
     *
     * @type {number}
     * @defaultValue 8
     */
    stepListenersBatchSize;

    /**
     * A number of sub-steps per single {@link fixedStep}. Affects performance, so try to keep it
     * low. Increasing the number of substeps will make constraints feel stronger and collisions
     * more rigid.
     *
     * @type {number}
     * @defaultValue 2
     */
    subSteps;

    /**
     * Time before object is allowed to go to sleep.
     *
     * @type {number}
     * @defaultValue 0.5 (seconds)
     */
    timeBeforeSleep;

    /**
     * Whether or not to use the body pair cache, which removes the need for narrow phase collision
     * detection when orientation between two bodies didn't change.
     *
     * @type {boolean}
     * @defaultValue true
     */
    useBodyPairContactCache;

    /**
     * If we split up large islands into smaller parallel batches of work (to improve performance).
     *
     * Note, that you would need a custom Wasm build to support multi-threading. Refer to Jolt's
     * [build section](https://github.com/jrouwe/JoltPhysics.js?tab=readme-ov-file#building) for
     * details.
     *
     * @type {boolean}
     * @defaultValue true
     */
    useLargeIslandSplitter;

    /**
     * Whether or not to reduce manifolds with similar contact normals into one contact manifold.
     *
     * @type {boolean}
     * @defaultValue true
     */
    useManifoldReduction;

    /**
     * If `true`, enables the use of motion states for all physical objects that support it. When
     * disabled, the position of an object is updated once a physics update completes (which
     * happens at {@link fixedStep} intervals). If the browser refresh rate is faster than
     * {@link fixedStep}, the object will visibly "stutter" while moving. To make its motion
     * smooth, you can make {@link fixedStep} smaller to match the browser refresh rate (expensive)
     * or use this motion state option.
     *
     * When enabled, the system will interpolate the object's position and rotation, based on its
     * current velocities. It effectively "guesses" the isometry of an object at the next frame,
     * until the real physics update happens.
     *
     * @type {boolean}
     * @defaultValue true
     */
    useMotionStates;

    /**
     * If `true`, tries to use a `Shared Array Buffer` (SAB) for the {@link CommandsBuffer}. If SAB
     * is not supported, or `false` is set, then falls back to `Array Buffer`.
     *
     * @type {boolean}
     * @defaultValue true
     */
    useSharedArrayBuffer;

    /**
     * If `true`, tries to run the physics backend in a Web Worker. If the Web Worker is not
     * supported, or this option is set to `false`, will fall back to main thread.
     *
     * Note, that some features, like debug draw, are disabled, when using Web Worker.
     *
     * @type {boolean}
     * @defaultValue false
     */
    useWebWorker;

    /**
     * If `false`, vehicles will not emit contact events, which saves performance (no additional
     * JS callback calls from Wasm).
     *
     * @type {boolean}
     * @defaultValue true
     */
    vehicleContactEventsEnabled;

    /**
     * Full path to Wasm binary file of Jolt Wasm, generated by Emscripten.
     *
     * @type {string}
     */
    wasmUrl;
}

/**
 * A helper function to initialize the physics components.
 *
 * @example
 * ```js
 * // load-jolt.mjs
 *
 * import { ScriptType } from 'playcanvas';
 * import { init } from './physics.dbg.mjs';
 *
 * export class LoadJolt extends ScriptType {
 *     async initialize() {
 *         await init(this.app, {
 *             useSharedArrayBuffer: true,
 *             fixedStep: 1 / 45,
 *             useWebWorker: true
 *         });
 *
 *         this.app.fire('physics:ready');
 *     }
 * }
 * ```
 *
 * @param {Application} app - PlayCanvas Application instance
 * @param {JoltInitSettings} opts - Jolt Physics initialization settings.
 * @group Utilities
 * @category Init
 * @returns {Promise<import('./jolt/manager.mjs').JoltManager>} - A Promise to return a Jolt Manager
 */
function init(app, opts = {}) {
    const options = {
        backend: 'jolt',
        propertyName: 'physics',
        ...opts
    };

    const { backend, propertyName } = options;

    return new Promise((resolve, reject) => {

        if (backend !== 'jolt') {
            if ($_DEBUG) {
                Debug.warn(`Selected backend is not supported: ${backend}`);
            }
            reject(new Error('Selected backend is not supported'));
            return;
        }

        if (app[propertyName]) {
            if ($_DEBUG) {
                Debug.warn('Unable to initialize Physics Manager. Application has an existing ' +
                    `property name that conflicts. Tried to use "app.${propertyName}". Use ` +
                    '{ propertyName: string } in init options to use a custom property name. Aborting.');
            }
            reject(new Error('Selected property name is not available.'));
            return;
        }

        const manager = new JoltManager(app, options, onReady);

        function onReady() {
            app.on('destroy', () => destroy());
            app[propertyName] = manager;
            resolve(manager);
        }

        function destroy() {
            app[propertyName].destroy();
            app[propertyName] = null;
        }
    });
}

export { init, JoltInitSettings };

import { Debug } from './jolt/debug.mjs';
import { JoltManager } from './jolt/manager.mjs';
import { extendPCMath } from './jolt/math.mjs';

/**
 * Components initialization method.
 * 
 * @param {import('playcanvas').Application} app - PlayCanvas Application instance
 * @param {object} opts - An options object to configure the physics backend. All options are
 * optional:
 * @param {string} opts.backend - Name of the physics backend to initialize.
 * 
 * Default: `jolt`.
 * @param {boolean} opts.useSharedArrayBuffer - If `true`, tries to use a Shared Array Buffer (SAB)
 * for the {@link CommandsBuffer | Commands Buffer}. If SAB is not supported, or `false` is set,
 * then falls back to Array Buffer.
 * 
 * Default: `true`.
 * @param {number} opts.commandsBufferSize - Initial size of the
 * {@link CommandsBuffer | Commands Buffer} in bytes.
 * 
 * Default: `10000` (10kb).
 * @param {boolean} opts.allowCommandsBufferResize - Specifies, if
 * {@link CommandsBuffer | Commands Buffer} can be resized, when full. On every frame the buffer
 * starts writing from the beginning, so it has a full capacity available for it. If there is more
 * data that needs to be written than the initial size specified with `commandsBufferSize`, then it
 * will grow by 50% of the current size and try to write it again. It will never shrink down, and
 * remain at the new size until it has to grow again. If this is set to `false`, the growth becomes
 * forbidden and the commands that did not fit into the buffer will be ignored. Generally, 10kb is
 * enough to move about 100-150 primitive objects every frame.
 * 
 * Default: `true`.
 * @param {boolean} opts.useWebWorker - If `true`, tries to run the physics backend in Web Worker.
 * If Web Worker is not supported, or this option is set to `false`, will fall back to main thread.
 * Note, that some features, like debug draw, are disabled, when using Web Worker.
 * 
 * Default: `false`.
 * @param {number} opts.fixedStep - A fixed time intervals to update physics simulation at. Affects
 * performance, so try to set it as large as possible (fewer updates per second), until you start
 * getting collision and motion artifacts.
 * 
 * Default: `1/30` (30 updates per second).
 * @param {number} opts.subSteps - A number of sub-steps in a single update. Affects
 * performance, so try to keep at 1, unless you start getting collision and motion artifacts.
 * Increasing the number of substeps will make constraints feel stronger and collisions "harder".
 * 
 * Default: `1`.
 * @param {boolean} opts.useMotionStates - If `true`, enables the use of motion states for all
 * physical objects that support it. When disabled, the position of an object is updated once a
 * physics update completes (which happens at `fixedStep` intervals). If the browser refresh rate
 * is faster than `fixedStep`, the object will visibly "stutter" while moving. To make its motion
 * smooth, you can make `fixedStep` smaller to match the browser refresh rate (expensive) or use
 * this motion state option. When enabled, the system will interpolate the object's position and
 * rotation, based on its current velocities. It effectively "guesses" the isometry of an object
 * at the next frame, until the real physics update happens.
 * 
 * Default: `true`.
 * @param {import('playcanvas').Color} opts.debugColorStatic - Line color of the static objects
 * during a debug draw.
 * 
 * Default: `Color.GRAY`
 * @param {import('playcanvas').Color} opts.debugColorKinematic - Line color of the kinematic
 * objects during a debug draw.
 * 
 * Default: `Color.MAGENTA`
 * @param {import('playcanvas').Color} opts.debugColorDynamic - Line color of the dynamic objects
 * during a debug draw.
 * 
 * Default: `Color.YELLOW`
 * @param {number} opts.debugDrawLayerId - The PlayCanvas Layer ID, where to debug draw lines.
 * 
 * Default: `LAYERID_IMMEDIATE` (alias integer)
 * @param {boolean} opts.debugDrawDepth - If `true`, debug draw will consider scene depth, so lines
 * that are behind a visual mesh will not be drawn ontop of it.
 * 
 * Default: `true`.
 * @param {number} opts.baumgarte - Baumgarte stabilization factor (how much of the position error
 * to "fix" in 1 update)
 * - 0 = nothing
 * - 1 = 100%
 * 
 * Default: `0.2` (dimensionless)
 * @param {number} opts.maxSkippedSteps - Maximum number of physics updates we allow to
 * fast-forward. For example, if we switch a browser tab, the main thread will pause. Once the app
 * comes back to focus, the delta time from the last update will be large. The system will try to
 * catch up the missed time by looping the physics update until the accumulated time is exhausted.
 * This setting effectively clamps the missed time, so the resulting delta time is small on resume.
 * For example, if we missed 1000 updates, and this setting is set to 5, then once application
 * resumes, the system will run 5 updates before continuing running updates as usual. It is
 * difficult to advice on a good number, as it depends on `fixedStep`, `subSteps`, and others.
 * Probably 2-5 is a good range to start with. Keep it low and experiment your app switching tabs.
 * The lower this number is the better.
 * 
 * Default: `5`.
 * @param {number} opts.bodyPairCacheCosMaxDeltaRotationDiv2 - Maximum relative delta orientation
 * for body pairs to be able to reuse collision results from last update, stored as
 * `cos(max angle / 2)`.
 * 
 * Default: `0.9998476951563912` (radians).
 * @param {number} opts.bodyPairCacheMaxDeltaPositionSq - Maximum relative delta position for body
 * pairs to be able to reuse collision results from last update.
 * 
 * Default: `Math.sqrt(0.001)` (meter^2).
 * @param {number} opts.contactPointPreserveLambdaMaxDistSq - Maximum allowed distance between
 * old and new contact point to preserve contact forces for warm start.  
 * Default: `Math.sqrt(0.01)` (meter^2).
 * @param {boolean} opts.deterministicSimulation - Makes the simulation deterministic at the cost
 * of performance. Simulation runs faster, if determinism is disabled.
 * 
 * Default: `true` (enabled).
 * @param {number} opts.linearCastMaxPenetration - Fraction of its inner radius a body may
 * penetrate another body for the `MOTION_QUALITY_LINEAR_CAST` of a
 * {@link BodyComponent.motionQuality | Body Component Motion Quality}.
 * 
 * Default: `0.25`.
 * @param {number} opts.linearCastThreshold - Fraction of its inner radius a body must move per
 * step to enable casting for the `MOTION_QUALITY_LINEAR_CAST` of a
 * {@link BodyComponent.motionQuality | Body Component Motion Quality}.
 * 
 * Default: `0.75`.
 * @param {number} opts.manifoldToleranceSq - Max squared distance to use to determine if two
 * points are on the same plane for determining the contact manifold between two shape faces.
 * 
 * Default: `1.0e-6` (meter^2).
 * @param {number} opts.maxInFlightBodyPairs - Size of body pairs array, corresponds to the maximum
 * amount of potential body pairs that can be in flight at any time. Setting this to a low value
 * will use less memory inside Wasm (no change on JS heap), but slow down simulation as threads may
 * run out of narrow phase work. Note, that you would need a custom Wasm build to support 
 * multi-threading. Refer to Jolt's
 * [build section](https://github.com/jrouwe/JoltPhysics.js?tab=readme-ov-file#building) for
 * details.
 * 
 * Default: `16384`.
 * @param {number} opts.maxPenetrationDistance - Maximum distance to correct in a single iteration
 * when solving position constraints.
 * 
 * Default: `0.2` (meters).
 * @param {number} opts.minVelocityForRestitution - Minimal velocity needed before a collision can
 * be elastic.
 * 
 * Default: `1` (m/s).
 * @param {number} opts.numPositionSteps - Number of solver position iterations to run. Default: 2.
 * @param {number} opts.numVelocitySteps - Number of solver velocity iterations to run. Note that
 * this needs to be >= 2 in order for friction to work (friction is applied using the
 * non-penetration impulse from the previous iteration).
 * 
 * Default: `10`.
 * @param {number} opts.penetrationSlop - How much bodies are allowed to sink into each other.
 * 
 * Default: `0.02` (meters).
 * @param {number} opts.pointVelocitySleepThreshold - Velocity of points on bounding box of object
 * below which an object can be considered sleeping.
 * 
 * Default: `0.03` (m/s).
 * @param {number} opts.speculativeContactDistance - Radius around objects inside which speculative
 * contact points will be detected. Note that if this is too big you will get ghost collisions as
 * speculative contacts are based on the closest points during the collision detection step which
 * may not be the actual closest points by the time the two objects hit.
 * 
 * Default: `0.02` (meters).
 * @param {number} opts.stepListenerBatchesPerJob - How many step listener batches are needed
 * before spawning another job (set to Number.MAX_SAFE_INTEGER, if no parallelism is desired).
 * Note, that you would need a custom Wasm build to support multi-threading. Refer to Jolt's
 * [build section](https://github.com/jrouwe/JoltPhysics.js?tab=readme-ov-file#building) for
 * details.
 * 
 * Default: `1`.
 * @param {number} opts.stepListenersBatchSize - How many PhysicsStepListeners to notify in 1
 * batch. Note, that you would need a custom Wasm build to support multi-threading. Refer to Jolt's
 * [build section](https://github.com/jrouwe/JoltPhysics.js?tab=readme-ov-file#building) for
 * details.
 * 
 * Default: `8`.
 * @param {number} opts.timeBeforeSleep - Time before object is allowed to go to sleep.
 * 
 * Default: `0.5` (seconds).
 * @param {boolean} opts.constraintWarmStart - Whether or not to use warm starting for constraints
 * (initially applying previous frames impulses).
 * 
 * Default: `true`.
 * @param {boolean} opts.useBodyPairContactCache - Whether or not to use the body pair cache, which
 * removes the need for narrow phase collision detection when orientation between two bodies didn't
 * change.
 * 
 * Default: `true`.
 * @param {boolean} opts.useManifoldReduction - Whether or not to reduce manifolds with similar
 * contact normals into one contact manifold.
 * 
 * Default: `true`.
 * @param {boolean} opts.useLargeIslandSplitter - If we split up large islands into smaller
 * parallel batches of work (to improve performance). Note, that you would need a custom Wasm build
 * to support multi-threading. Refer to Jolt's
 * [build section](https://github.com/jrouwe/JoltPhysics.js?tab=readme-ov-file#building) for
 * details.
 * 
 * Default: `true`.
 * @param {boolean} opts.allowSleeping - Specifies if objects can go to sleep or not.
 * 
 * Default: `true`.
 * @param {boolean} opts.checkActiveEdges - When false, we prevent collision against non-active
 * (shared) edges.
 * 
 * Default: `true`.
 * @param {boolean} opts.charContactEventsEnabled - If `false`, characters will not emit contact
 * events, which saves performance (no additional JS callback calls from Wasm).
 * 
 * Default: `true`.
 * @param {boolean} opts.vehicleContactEventsEnabled - If `false`, vehicles will not emit contact
 * events, which saves performance (no additional JS callback calls from Wasm).
 * 
 * Default: `true`.
 * @param {boolean} opts.contactEventsEnabled - If `false`, bodies will not emit contact
 * events, which saves performance (no additional JS callback calls from Wasm).
 * 
 * Default: `true`.
 * @param {boolean} opts.contactPoints - If `true`, the collision result of two bodies will include
 * the contact points. If you don't need the exact points of collision (e.g. if it is enough to
 * simply know if and which bodies collided, but not at which point in world space), you should disable it to
 * save some CPU work.
 * 
 * Default: `true`.
 * @param {boolean} opts.contactPointsAveraged - Ignored if `contactPoints` is `false`. If this is
 * `true`, then the collision result points will be averaged into a single point. Otherwise all
 * points from collision manifold of a body pair will be provided.
 * 
 * Default: `true`.
 * @param {array<number>} opts.broadPhaseLayers - Array of unique integer numbers, representing the
 * broadphase layers.  
 * For additional details, refer to Jolt's documentation:
 * [Collision Detection](https://jrouwe.github.io/JoltPhysics/index.html#collision-detection).
 * 
 * Default: `[BP_LAYER_NON_MOVING, BP_LAYER_MOVING]` (alias integers), where:
 * - BP_LAYER_NON_MOVING = 0;
 * - BP_LAYER_MOVING = 1;  
 * @param {array<number>} opts.objectLayerPairs - Array of non-unique integers, representing pairs
 * of object layers. Objects that belong to one of the layers in the pair are allowed to collide.  
 * For additional details, refer to Jolt's documentation:
 * [Collision Detection](https://jrouwe.github.io/JoltPhysics/index.html#collision-detection).  
 * For example: [0, 1, 2, 0, 2, 2] - means three pairs of layers [0, 1], [2, 0] and [2, 2]:
 * - Objects that belong to layer 0 can collide with layer 1 and 2.
 * - Objects that belong to layer 1 can only collide with layer 0.
 * - Objects that belong to layer 2 can collide with layer 0 and with other objects in the same
 * layer.
 * 
 * Default: `[OBJ_LAYER_NON_MOVING, OBJ_LAYER_MOVING, OBJ_LAYER_MOVING, OBJ_LAYER_MOVING]` (alias
 * integers), where:
 * - OBJ_LAYER_NON_MOVING = 0;
 * - OBJ_LAYER_MOVING = 1;  
 * @param {array<number>} opts.mapObjectToBroadPhaseLayer - Array of non-unique integers,
 * representing of one-to-one map of object layer to broadphase layer. Each object layer can only
 * belong to one and only one broadphase layer. For example, an array [0, 0, 1, 1] means that an
 * object layer 0 belongs to broadphase layer 0, and object layer 1 belongs to broadphase
 * layer 1.  
 * For additional details, refer to Jolt's documentation:
 * [Collision Detection](https://jrouwe.github.io/JoltPhysics/index.html#collision-detection).
 * 
 * Default: `[OBJ_LAYER_NON_MOVING, BP_LAYER_NON_MOVING, OBJ_LAYER_MOVING, BP_LAYER_MOVING]`,
 * where:
 * - OBJ_LAYER_NON_MOVING = 0;
 * - OBJ_LAYER_MOVING = 1;
 * - BP_LAYER_NON_MOVING = 0;
 * - BP_LAYER_MOVING = 1;  
 * @group Utilities
 * @returns Promise
 */
function init(app, opts = {}) {
    const options = {
        backend: 'jolt',
        propertyName: 'physics',    // TODO: remove this, as we remove the pc namespace
        ...opts
    };
    
    const { backend, propertyName } = options;

    return new Promise((resolve, reject) => {

        if (backend !== 'jolt') {
            if ($_DEBUG) {
                Debug.warn(`Selected backend is not supported: ${ backend }`);
            }
            return reject();
        }

        extendPCMath();
        
        if (app[propertyName]) {
            $_DEBUG && Debug.warn(`Unable to initialize Physics Manager. Application has an existing property name that conflicts. ` + 
                `Tried to use "app.${ propertyName }". Use { propertyName: string } in init options to use a custom property name. Aborting.`);
            return null;
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

export { init };
import { CommandsBuffer } from './jolt/back/commands-buffer.mjs';
import { Debug } from './jolt/debug.mjs';
import { Dispatcher } from './dispatcher.mjs';
import { IndexedCache } from './indexed-cache.mjs';

/**
 * @import { EventHandle } from 'playcanvas';
 */

class PhysicsManager {
    constructor(app, config = {}) {
        this._createDispatcher(config);

        this._systems = new Map();
        this._backend = null;

        this._outBuffer = new CommandsBuffer(config);
        this._outBuffers = [];
        this._inBuffer = null;
        this._updateEvent = null;
        this._paused = false;
        this._steps = 0;
        this._fixedStep = config.fixedStep;
        this._canDispatch = true;
        this._stepMessage = {
            type: 'step', buffer: null, inBuffer: null, origin: 'physics-manager'
        };

        if ($_DEBUG) {
            this._perfCache = new IndexedCache();
        }

        this._frame = app.stats.frame;

        this._config = config;
        this._app = app;
    }

    /**
     * @type {Map<number, import('./jolt/front/body/system.mjs').BodyComponentSystem |
     * import('./jolt/front/char/system.mjs').CharComponentSystem |
     * import('./jolt/front/constraint/system.mjs').ConstraintComponentSystem |
     * import('./jolt/front/shape/system.mjs').ShapeComponentSystem |
     * import('./jolt/front/softbody/system.mjs').SoftBodyComponentSystem>}
     * @private
     */
    get systems() {
        return this._systems;
    }

    /**
     * Allows to pause/unpause physics update. Useful, when you have some UI popup and want to
     * freeze the game world, but still be able to interact with the application.
     *
     * @param {boolean} bool - If `true`, will pause the physics world update.
     */
    set paused(bool) {
        this._paused = bool;
    }

    /**
     * Gets the current state of the physics world. Whether it is paused or not.
     *
     * @type {boolean}
     * @defaultValue false
     */
    get paused() {
        return this._paused;
    }

    /**
     * @type {CommandsBuffer}
     * @private
     */
    get commandsBuffer() {
        return this._outBuffer;
    }

    /**
     * @type {import('./init.mjs').JoltInitSettings}
     * @private
     */
    get config() {
        return this._config;
    }

    /**
     * Gets the number of times the physics world has been updated (steps count).
     *
     * @type {number}
     * @defaultValue 0
     */
    get steps() {
        return this._steps;
    }

    /**
     * Gets the fixed timestep size that the physics world is stepping with. This was set via
     * {@link JoltInitSettings.fixedStep}.
     *
     * @type {number}
     * @defaultValue 1/30
     */
    get fixedStep() {
        return this._fixedStep;
    }

    /**
     * Sets the update event to step physics.
     *
     * @type {EventHandle | null}
     */
    set updateEvent(eventHandle) {
        this._updateEvent?.off();
        this._updateEvent = eventHandle;
    }

    /**
     * Gets the update event used to step physics.
     *
     * @type {EventHandle | null}
     */
    get updateEvent() {
        return this._updateEvent;
    }

    onUpdate() {
        if (this._paused) return;

        if (!this._canDispatch) {
            this._skipped = true;
            return;
        }

        let index;
        if ($_DEBUG) {
            const startTime = performance.now();
            index = this._perfCache.add(startTime);

            this._lastIndex = index;

            if (index > 50) {
                this._paused = true;
            }
        }

        this._canDispatch = false;
        this._skipped = false;

        this._writeIsometry();
        this._dispatchCommands(this._frame.dt, index);
    }

    sendUncompressed(msg) {
        msg.origin = 'physics-manager';
        this._dispatcher.postMessage(msg);
    }

    // TODO
    // move the commands buffer handling out to Jolt Manager
    onMessage(msg) {
        if (this._paused || msg.origin !== 'physics-worker') return;

        this._canDispatch = true;

        const systems = this._systems;
        let inBuffer = this._inBuffer;

        if (msg.buffer) {
            if (!inBuffer) {
                inBuffer = this._inBuffer = new CommandsBuffer();
            }

            // Make sure to use the incoming buffer, as the old one could
            // have been destroyed during resize.
            inBuffer.buffer = msg.buffer;
            if (msg.inBuffer) {
                this._outBuffer.buffer = msg.inBuffer;
            }

            const count = inBuffer.commandsCount;
            for (let i = 0; i < count; i++) {
                const operator = inBuffer.readOperator();
                if ($_DEBUG) {
                    const ok = Debug.assert(!!systems.get(operator), `Invalid component system: ${operator}`);
                    if (!ok) {
                        this._updateEvent.off();
                        return;
                    }
                }

                systems.get(operator).processCommands(inBuffer);
            }

            inBuffer.reset();
        }

        this._steps = msg.steps ?? 0;

        if ($_DEBUG) {
            const perfIndex = msg.perfIndex;

            if (perfIndex == null) return;

            const cache = this._perfCache;
            const startTime = cache.get(perfIndex);
            const frame = this._app.stats.frame;

            cache.free(perfIndex);
            frame.physicsTime = performance.now() - startTime + msg.time;
        }

        if (this._skipped) {
            this._canDispatch = false;
            this._skipped = false;
            this._writeIsometry();
            this._dispatchCommands(this._frame.dt, this._lastIndex);
        }
    }

    destroy() {
        this._systems.forEach((system) => {
            system.destroy();
        });
        this._systems.clear();

        const msg = Object.create(null);
        msg.type = 'destroy';
        this.sendUncompressed(msg);
        this._stepMessage = null;
        this._backend = null;

        this._commandsBuffer.destroy();
        this._commandsBuffer = null;

        this._dispatcher = null;
        this._frame = null;

        this._updateEvent?.off();
        this._updateEvent = null;

        this._app[this._config.propertyName] = null;
    }

    _writeIsometry() {
        this._systems.forEach((system) => {
            system.requestIsometry?.();
        });
    }

    _dispatchCommands(dt, perfIndex) {
        const cb = this._outBuffer;
        const inBuffer = this._inBuffer;
        const msg = this._stepMessage;
        const useSAB = this._config.useSAB;

        msg.dt = dt;

        if ($_DEBUG) {
            msg.perfIndex = perfIndex;
        }

        if (!cb.dirty) {
            msg.buffer = null;
            if (inBuffer && inBuffer.buffer.byteLength > 0) {
                const ib = inBuffer.buffer;
                msg.inBuffer = ib;
                this._dispatcher.postMessage(msg, useSAB ? null : [ib]);
            } else {
                msg.inBuffer = null;
                this._dispatcher.postMessage(msg);
            }
            return;
        }

        const buffer = cb.buffer;
        const buffers = this._outBuffers;

        msg.buffer = buffer;
        buffers.length = 0;

        // Also add any potential mesh and convex hull shapes buffers
        const meshBuffers = cb.meshBuffers;
        if (meshBuffers.length > 0) {
            msg.meshBuffers = meshBuffers;
            buffers.push(...meshBuffers);
        } else {
            msg.meshBuffers = null;
        }

        // Must reset before we post message to backend. This is because when executing on main
        // thread, the postMessage will synchronously step the physics, and possibly execute
        // user and contact callbacks. If user uses these callbacks to issue new commands to the
        // backend, they will be ignored, if we reset the commands buffer right after.
        cb.reset();

        if (useSAB) {
            this._dispatcher.postMessage(msg);
        } else {
            buffers.push(buffer);
            if (inBuffer) {
                const ib = inBuffer.buffer;
                msg.inBuffer = ib;
                buffers.push(ib);
            }
            this._dispatcher.postMessage(msg, buffers);
        }

        cb.meshBuffers.length = 0;
    }

    _createDispatcher(config) {
        if (config.useWebWorker) {
            this._dispatcher = new Worker(new URL('./dispatcher.mjs', import.meta.url));
            this._dispatcher.onmessage = this.onMessage.bind(this);
        } else {
            this._dispatcher = new Dispatcher(this);
        }
    }
}

export { PhysicsManager };

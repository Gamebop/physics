import { JoltBackend } from "../backends/jolt/backend.mjs";
import { Debug } from "./debug.mjs";

let backend = null;

function createBackend(name, messenger, config) {
    switch (name) {
        case 'jolt':
            backend = new JoltBackend(messenger, config);
            break;

        // intentional fall-through
        case 'ammo':
        case 'rapier':
        case 'physx':
            Debug.warn(`Invalid backend selection: ${ backend }`);
            break;

        default:
            Debug.warn(`Invalid backend selection: ${ backend }`);
    }
}

class Dispatcher {
    constructor(manager = null, useWebWorker = false) {
        this._useWebWorker = useWebWorker;
        this._manager = manager;
        this._destroying = false;

        if (useWebWorker) {
            this.postMessage = self.postMessage;
        }
    }

    postMessage(msg) {
        this.handleMessage(msg);
    }

    handleMessage(data) {
        if (this._destroying) return;

        switch (data.type) {
            case 'step':
                backend.step(data);
                break;

            case 'create-backend':
                createBackend(data.backendName, this, data.config);
                // If we don't use a Web Worker, expose the backend instance to main thread for dev convenience
                if (this._manager) {
                    this._manager.backend = backend;
                }
                break;

            case 'override-contacts':
                backend.overrideContacts(data.listener, data.overrides);
                break;

            case 'destroy':
                this.destroy();
                break;

            default:
                break;
        }
    }

    destroy() {
        this._destroying = true;

        backend.destroy();
        backend = null;
        self.onmessage = (e) => {};
        dispatcher = null;
    }

    respond(msg) {
        msg.origin = 'physics-worker';
        if (this._useWebWorker) {
            self.postMessage(msg);
        } else {
            this._manager.onMessage(msg);
        }
    }
}

let dispatcher = new Dispatcher();

self.onmessage = function(event) {
    if (event.origin !== 'physics-manager') return;
    dispatcher.handleMessage(event);
}

export { Dispatcher };
import { JoltBackend } from "../backends/jolt/backend.mjs";
import { Debug } from "./debug.mjs";

let backend = null;

function createBackend(messenger, data) {
    switch (data.backendName) {
        case 'jolt':
            backend = new JoltBackend(messenger, data);
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
    constructor(manager = null) {
        this._useMainThread = !!manager;
        this._manager = manager;
        this._destroying = false;

        if (!manager) {
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
                backend?.step(data);
                break;

            case 'create-backend':
                createBackend(this, data);
                // If we don't use a Web Worker, expose the backend instance to main thread for dev convenience
                if (this._manager) {
                    this._manager.backend = backend;
                }
                break;

            case 'override-contacts':
                backend?.overrideContacts(data.listener, data.overrides);
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

    respond(msg, buffers) {
        if (this._useMainThread) {
            this._manager.onMessage(msg);
        } else {
            if (buffers) {
                self.postMessage(msg, buffers);
            } else {
                self.postMessage(msg);
            }
        }
    }
}

let dispatcher = new Dispatcher();

self.onmessage = function(event) {
    const data = event.data;
    if (data?.origin !== 'physics-manager') return;
    dispatcher.handleMessage(data);
}

export { Dispatcher };
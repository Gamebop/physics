import { JoltBackend } from "../backends/jolt/backend.mjs";
import { Debug } from "./debug.mjs";

function createBackend(dispatcher, data) {
    switch (data.backendName) {
        case 'jolt':
            Dispatcher.backend = new JoltBackend(dispatcher, data);
            break;

        default:
            Debug.warn(`Invalid backend selection: ${ data.backendName }`);
    }
}

class Dispatcher {
    static backend = null;

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
                Dispatcher.backend?.step(data);
                break;

            case 'create-backend':
                createBackend(this, data);
                // If we don't use a Web Worker, expose the backend instance to main thread for DX
                if (this._useMainThread) {
                    this._manager.backend = Dispatcher.backend;
                }
                break;

            case 'override-contacts':
                Dispatcher.backend?.overrideContacts(data.listener, data.overrides);
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

        Dispatcher.backend.destroy();
        Dispatcher.backend = null;
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
};

export { Dispatcher };
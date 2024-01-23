import { BodyComponentSystem } from "./components/jolt/body/system.mjs";
import { CharComponentSystem } from "./components/jolt/char/system.mjs";
import { VehicleComponentSystem } from "./components/jolt/vehicle/system.mjs";
import { Debug } from "./debug.mjs";
import { JoltManager } from "./components/jolt/manager.mjs";
import { 
    COMPONENT_SYSTEM_BODY, COMPONENT_SYSTEM_CHAR, COMPONENT_SYSTEM_SOFT_BODY, COMPONENT_SYSTEM_VEHICLE
} from "./components/jolt/constants.mjs";
import { SoftBodyComponentSystem } from "./components/jolt/softbody/system.mjs";
import { extendPCMath } from "./math.mjs";

// Override chunk location in order for the engine to locate them in PlayCanvas Editor.
const oldFn = __webpack_get_script_filename__;
__webpack_get_script_filename__ = (chunkId) => {
    const filename = oldFn(chunkId);
    const app = pc.Application.getApplication();
    const asset = app.assets.find(filename, 'script');
    const url = asset.getFileUrl();
    return url;
};

// TODO
// Once we add webworker support, init should be changed to async
// function and wait for worker response to resolve.

function init(app = pc.Application.getApplication(), opts = {}) {
    const options = {
        backend: 'jolt',
        propertyName: 'physics',
        ...opts
    };

    extendPCMath();

    const { backend, propertyName } = options;

    if (backend === 'jolt') {
        if (app[propertyName]) {
            Debug.dev && Debug.warn(`Unable to initialize Physics Manager. Application has an existing property name that conflicts. ` + 
                `Tried to use "app.${ propertyName }". Use { propertyName: string } in init options to use a custom property name. Aborting.`);
            return;
        }

        function onReady() {
            app.on('destroy', () => destroy());

            resolve();
        }
        
        return new Promise((resolve, reject) => {
            const manager = new JoltManager(app, options, resolve);
            app[propertyName] = manager;
        });
    }

    function destroy() {
        app[propertyName].destroy();
        app[propertyName] = null;
    }
}

export { init };
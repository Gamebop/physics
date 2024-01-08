import { BodyComponentSystem } from "./components/jolt/body/system.mjs";
import { CharComponentSystem } from "./components/jolt/char/system.mjs";
import { Debug } from "./debug.mjs";
import { JoltManager } from "./components/jolt/manager.mjs";
import { VehicleComponentSystem } from "./components/jolt/vehicle/system.mjs";


// TODO
// Once we add webworker support, init should be changed to async
// function and wait for worker response to resolve.

function init(app = pc.Application.getApplication(), opts = {}) {
    const options = {
        backend: 'jolt',
        propertyName: 'physics',
        ...opts
    };

    const { backend, propertyName } = options;

    switch(backend) {
        case 'jolt': {
            if (app[propertyName]) {
                Debug.dev && Debug.warn(`Unable to initialize Physics Manager. Application has an existing property name that conflicts. ` + 
                    `Tried to use "app.${ propertyName }". Use { propertyName: string } in init options to use a custom property name. Aborting.`);
                return;
            }

            const manager = new JoltManager(app, backend, options);
            app[propertyName] = manager;

            app.systems.add(new BodyComponentSystem(app, manager));
            app.systems.add(new CharComponentSystem(app, manager));
            app.systems.add(new VehicleComponentSystem(app, manager));
            break;
        }

        default:
            Debug.dev && Debug.warn(`Backend not implemented: ${ backend }`);
            return destroy();
    }

    app.on('destroy', () => destroy());

    function destroy() {
        app[propertyName].destroy();
        app[propertyName] = null;
    }
}

export { init };
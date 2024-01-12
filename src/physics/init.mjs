import { BodyComponentSystem } from "./components/jolt/body/system.mjs";
import { CharComponentSystem } from "./components/jolt/char/system.mjs";
import { VehicleComponentSystem } from "./components/jolt/vehicle/system.mjs";
import { Debug } from "./debug.mjs";
import { JoltManager } from "./components/jolt/manager.mjs";
import { COMPONENT_SYSTEM_BODY, COMPONENT_SYSTEM_CHAR, COMPONENT_SYSTEM_SOFT_BODY, COMPONENT_SYSTEM_VEHICLE } from "./components/jolt/constants.mjs";
import { SoftBodyComponentSystem } from "./components/jolt/softbody/system.mjs";


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

            const manager = new JoltManager(app, options);
            app[propertyName] = manager;

            app.systems.add(new BodyComponentSystem(app, manager, COMPONENT_SYSTEM_BODY));
            app.systems.add(new CharComponentSystem(app, manager, COMPONENT_SYSTEM_CHAR));
            app.systems.add(new VehicleComponentSystem(app, manager, COMPONENT_SYSTEM_VEHICLE));
            app.systems.add(new SoftBodyComponentSystem(app, manager, COMPONENT_SYSTEM_SOFT_BODY));
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
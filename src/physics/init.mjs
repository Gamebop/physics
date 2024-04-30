import { Debug } from './jolt/debug.mjs';
import { JoltManager } from './jolt/front/manager.mjs';
import { extendPCMath } from './jolt/math.mjs';

/**
 * Components initialization method.
 * 
 * @param {import('playcanvas').Application} app - PlayCanvas Application instance
 * @param {object} opts 
 * @returns Promise
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
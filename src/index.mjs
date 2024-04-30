/**
 * This is a module that contains several physics components for PlayCanvas. At the moment,
 * only JoltPhysics backend based components are implemented.
 *
 * @module PhysicsComponents
 */

import { init } from './physics/init.mjs';

export { BodyComponent } from './physics/jolt/front/body/component.mjs';
export { BodyComponentSystem } from './physics/jolt/front/body/system.mjs';

export * from './physics/jolt/constants.mjs';

export { init };
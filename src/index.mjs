/**
 * This is a module that contains several physics components for PlayCanvas. At the moment,
 * only Jolt Physics backend based components are implemented.
 *
 * @module PhysicsComponents
 */

import { init } from './physics/init.mjs';

export { BodyComponent } from './physics/jolt/front/body/component.mjs';
export { BodyComponentSystem } from './physics/jolt/front/body/system.mjs';

export { SoftBodyComponent } from './physics/jolt/front/softbody/component.mjs';
export { SoftBodyComponentSystem } from './physics/jolt/front/softbody/system.mjs';

export { CommandsBuffer } from './physics/jolt/back/commands-buffer.mjs';

export * from './physics/jolt/constants.mjs';

export { init };

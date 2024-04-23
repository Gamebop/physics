/**
 * This is a module that contains several physics components for PlayCanvas. At the moment,
 * only Jolt Physics backend based components are implemented.
 *
 * @module PhysicsComponents
 */

export { init } from './physics/init.mjs';
export { CommandsBuffer } from './backends/jolt/commands-buffer.mjs';
export { IndexedCache } from './physics/indexed-cache.mjs';

export { JoltManager } from './physics/components/jolt/manager.mjs';

export { ShapeComponent } from './physics/components/jolt/component.mjs';
export { ShapeComponentSystem } from './physics/components/jolt/system.mjs';

export { BodyComponent } from './physics/components/jolt/body/component.mjs';
export { BodyComponentSystem } from './physics/components/jolt/body/system.mjs';

export { SoftBodyComponent } from './physics/components/jolt/softbody/component.mjs';
export { SoftBodyComponentSystem } from './physics/components/jolt/softbody/system.mjs';

export { CharComponent } from './physics/components/jolt/char/component.mjs';
export { CharComponentSystem } from './physics/components/jolt/char/system.mjs';

export { VehicleComponent, props } from './physics/components/jolt/vehicle/component.mjs';
export { VehicleComponentSystem } from './physics/components/jolt/vehicle/system.mjs';

/**
 * This is a module that contains several physics components for PlayCanvas. At the moment,
 * only Jolt Physics backend based components are implemented.
 *
 * @module PhysicsComponents
 */

import { init } from './physics/init.mjs';

export { ShapeComponent } from './physics/jolt/front/shape/component.mjs';
export { ShapeComponentSystem } from './physics/jolt/front/shape/system.mjs';

export { BodyComponent } from './physics/jolt/front/body/component.mjs';
export { BodyComponentSystem } from './physics/jolt/front/body/system.mjs';

export { SoftBodyComponent } from './physics/jolt/front/softbody/component.mjs';
export { SoftBodyComponentSystem } from './physics/jolt/front/softbody/system.mjs';

export { CommandsBuffer } from './physics/jolt/back/commands-buffer.mjs';

export { ConeConstraint } from './physics/jolt/front/constraint/types/cone.mjs';
export { DistanceConstraint } from './physics/jolt/front/constraint/types/distance.mjs';
export { FixedConstraint } from './physics/jolt/front/constraint/types/fixed.mjs';
export { HingeConstraint } from './physics/jolt/front/constraint/types/hinge.mjs';
export { PointConstraint } from './physics/jolt/front/constraint/types/point.mjs';
export { PulleyConstraint } from './physics/jolt/front/constraint/types/pulley.mjs';
export { SixDOFConstraint } from './physics/jolt/front/constraint/types/six-dof.mjs';
export { SliderConstraint } from './physics/jolt/front/constraint/types/slider.mjs';
export { SwingTwistConstraint } from './physics/jolt/front/constraint/types/swing-twist.mjs';

export * from './physics/jolt/constants.mjs';

export { init };

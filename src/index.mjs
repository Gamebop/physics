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

export { CharComponent } from './physics/jolt/front/char/component.mjs';
export { CharComponentSystem } from './physics/jolt/front/char/system.mjs';

export { SoftBodyComponent } from './physics/jolt/front/softbody/component.mjs';
export { SoftBodyComponentSystem } from './physics/jolt/front/softbody/system.mjs';

export { ConstraintComponent } from './physics/jolt/front/constraint/component.mjs';
export { ConstraintComponentSystem } from './physics/jolt/front/constraint/system.mjs';

export { Constraint } from './physics/jolt/front/constraint/types/constraint.mjs';
export { ConeConstraint } from './physics/jolt/front/constraint/types/joint/cone.mjs';
export { DistanceConstraint } from './physics/jolt/front/constraint/types/joint/distance.mjs';
export { FixedConstraint } from './physics/jolt/front/constraint/types/joint/fixed.mjs';
export { HingeConstraint } from './physics/jolt/front/constraint/types/joint/hinge.mjs';
export { PointConstraint } from './physics/jolt/front/constraint/types/joint/point.mjs';
export { PulleyConstraint } from './physics/jolt/front/constraint/types/joint/pulley.mjs';
export { SixDOFConstraint } from './physics/jolt/front/constraint/types/joint/six-dof.mjs';
export { SliderConstraint } from './physics/jolt/front/constraint/types/joint/slider.mjs';
export { SwingTwistConstraint } from './physics/jolt/front/constraint/types/joint/swing-twist.mjs';
export { WheeledVehicleConstraint } from './physics/jolt/front/constraint/types/vehicle/wheeled-vehicle.mjs';
export { TrackedVehicleConstraint } from './physics/jolt/front/constraint/types/vehicle/tracked-vehicle.mjs';
export { MotoVehicleConstraint } from './physics/jolt/front/constraint/types/vehicle/moto-vehicle.mjs';
export { JointConstraint } from './physics/jolt/front/constraint/types/joint/joint-constraint.mjs';
export { VehicleConstraint } from './physics/jolt/front/constraint/types/vehicle/vehicle-constraint.mjs';
export { WheelWV } from './physics/jolt/front/constraint/types/vehicle/wheel-wv.mjs';
export { WheelTV } from './physics/jolt/front/constraint/types/vehicle/wheel-tv.mjs';

export { CommandsBuffer } from './physics/jolt/back/commands-buffer.mjs';
export { IndexedCache } from './physics/indexed-cache.mjs';

export * from './physics/jolt/front/constraint/types/settings.mjs';
export * from './physics/jolt/constants.mjs';

export { init };

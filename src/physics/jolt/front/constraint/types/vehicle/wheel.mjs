import { Vec3 } from 'playcanvas';

class Wheel {
    _longitudinalSlip = 0;

    _lateralSlip = 0;

    _combinedLongitudinalFriction = 0;

    _combinedLateralFriction = 0;

    _brakeImpulse = 0;

    _position = Vec3.ZERO;
    
    _suspensionForcePoint = Vec3.ZERO;

    _suspensionDirection = Vec3.DOWN;

    _steeringAxis = Vec3.UP;

    _wheelUp = Vec3.UP;

    _wheelForward = Vec3.BACK;

    _suspensionMinLength = 0.3;

    _suspensionMaxLength = 0.5;

    _suspensionPreloadLength = 0;

    _radius = 0.3;

    _width = 0.1;
    
    _enableSuspensionForcePoint = false;

    _springSettings = null;

    _longitudinalFrictionCurve = null;

    _lateralFrictionCurve = null;

    constructor(otps = {}) {
        
    }

                // Read-only. Velocity difference between ground and wheel relative to ground velocity.
                desc.longitudinalSlip = 0;
                // Read-only. Angular difference (in radians) between ground and wheel relative to ground velocity.
                desc.lateralSlip = 0;
                // Read-only. Combined friction coefficient in longitudinal direction (combines terrain and tires)
                desc.combinedLongitudinalFriction = 0;
                // Read-only. Combined friction coefficient in lateral direction (combines terrain and tires)
                desc.combinedLateralFriction = 0;
                // Ready-only. Amount of impulse that the brakes can apply to the floor (excluding friction)
                desc.brakeImpulse = 0;
        
                // Attachment point of wheel suspension in local space of the body.
                cb.write(desc.position, BUFFER_WRITE_VEC32, false);
        
                // Where tire forces (suspension and traction) are applied, in local space of the body.
                // A good default is the center of the wheel in its neutral pose. See enableSuspensionForcePoint.
                cb.write(desc.suspensionForcePoint || Vec3.ZERO, BUFFER_WRITE_VEC32, false);
        
                // Direction of the suspension in local space of the body, should point down.
                cb.write(desc.suspensionDirection || Vec3.DOWN, BUFFER_WRITE_VEC32, false);
        
                // Direction of the steering axis in local space of the body, should point up (e.g. for a
                // bike would be -suspensionDirection)
                cb.write(desc.steeringAxis || Vec3.UP, BUFFER_WRITE_VEC32, false);
        
                // Up direction when the wheel is in the neutral steering position (usually
                // component.up but can be used to give the wheel camber or for a bike would be -suspensionDirection)
                cb.write(desc.wheelUp || Vec3.UP, BUFFER_WRITE_VEC32, false);
        
                // Forward direction when the wheel is in the neutral steering position (usually
                // component.forward but can be used to give the wheel toe, does not need to be perpendicular
                // to wheelUp)
                cb.write(desc.wheelForward || Vec3.BACK, BUFFER_WRITE_VEC32, false);
        
                // How long the suspension is in max raised position relative to the attachment point (m)
                cb.write(desc.suspensionMinLength ?? 0.3, BUFFER_WRITE_FLOAT32, false);
        
                // How long the suspension is in max droop position relative to the attachment point (m)
                cb.write(desc.suspensionMaxLength ?? 0.5, BUFFER_WRITE_FLOAT32, false);
        
                // The natural length (m) of the suspension spring is defined as suspensionMaxLength +
                // suspensionPreloadLength. Can be used to preload the suspension as the spring is compressed
                // by suspensionPreloadLength when the suspension is in max droop position. Note that this means
                // when the vehicle touches the ground there is a discontinuity so it will also make the vehicle
                // more bouncy as we're updating with discrete time steps.
                cb.write(desc.suspensionPreloadLength ?? 0, BUFFER_WRITE_FLOAT32, false);
        
                // Radius of the wheel (m)
                cb.write(desc.radius ?? 0.3, BUFFER_WRITE_FLOAT32, false);
        
                // Width of the wheel (m)
                cb.write(desc.width ?? 0.1, BUFFER_WRITE_FLOAT32, false);
        
                // If disabled, the forces are applied at the collision contact point. This leads to a more
                // accurate simulation when interacting with dynamic objects but makes the vehicle less stable.
                // When setting this to true, all forces will be applied to a fixed point on the vehicle body.
                cb.write(desc.enableSuspensionForcePoint ?? false, BUFFER_WRITE_BOOL, false);
        
                // wheel spring data
                const spring = desc.spring || {};
                cb.write(spring.mode ?? SPRING_MODE_FREQUENCY, BUFFER_WRITE_UINT8, false);
                cb.write(spring.frequency ?? 1.5, BUFFER_WRITE_FLOAT32, false);
                cb.write(spring.stiffness ?? 1.5, BUFFER_WRITE_FLOAT32, false);
                cb.write(spring.damping ?? 0.5, BUFFER_WRITE_FLOAT32, false);
        
                // Friction in forward direction of tire as a function of the slip ratio (fraction):
                // (omega_wheel * r_wheel - v_longitudinal) / |v_longitudinal|.
                // Slip ratio here is a ratio of wheel spinning relative to the floor. At 0 the wheel has full
                // traction and is rolling perfectly in sync with the ground. At 1 the wheel is locked and
                // is sliding over the ground.
                // Default curve keys: [[0, 0], [0.06, 1.2], [0.2, 1]]
                writeCurvePoints(cb, desc.longitudinalFrictionCurve);
        
                // Friction in sideway direction of tire as a function of the slip angle (degrees):
                // angle between relative contact velocity and vehicle direction.
                // If tire forward matches the vehicle direction, then the angle is 0 degrees. If the
                // vehicle is sliding sideways, e.g. on ice, then the angle is 90 degrees. Example curve keys could
                // be: [[0, 1], [90, 0.3]] - full friction at zero degrees, and 0.3 friction at 90.
                // Default curve keys: [[0, 0], [3, 1.2], [20, 1]]
                writeCurvePoints(cb, desc.lateralFrictionCurve);
}

export { Wheel };
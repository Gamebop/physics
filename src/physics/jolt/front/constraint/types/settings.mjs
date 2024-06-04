/**
 * @interface
 * @group Utilities
 * @category Settings
 */
class ConstraintSettings {
    /**
     * Override for the number of solver position iterations to run. If set to `0`, the constraint
     * will use global default set by Physics initialization setting (TODO add link).
     *
     * @type {number}
     * @defaultValue 0
     */
    numPositionStepsOverride;

    /**
     * Override for the number of solver velocity iterations to run. If set to `0`, the constraint
     * will use global default set by Physics initialization setting (TODO add link).
     *
     * @type {number}
     * @defaultValue 0
     */
    numVelocityStepsOverride;

    /**
     * First body position in constraint reference frame. Space is determined by {@link space}
     * property.
     *
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 0, 0)
     */
    point1;

    /**
     * Second body position in constraint reference frame. Space is determined by {@link space}
     * property.
     *
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 0, 0)
     */
    point2;

    /**
     * Reference frame that `point1` and `point2` use. Following constants available:
     * ```
     * CONSTRAINT_SPACE_LOCAL
     * ```
     * ```
     * CONSTRAINT_SPACE_WORLD
     * ```
     *
     * @type {number}
     * @defaultValue CONSTRAINT_SPACE_WORLD
     */
    space;
}

/**
 * @interface
 * @group Utilities
 * @category Settings
 */
class SpringSettings {
    /**
     * Selects the spring mode. Following constants available:
     * ```
     * SPRING_MODE_FREQUENCY
     * ```
     * ```
     * SPRING_MODE_STIFFNESS
     * ```
     * @type {number}
     * @defaultValue SPRING_MODE_FREQUENCY
     */
    springMode;

    /**
     * Spring frequency. Only used, when {@link springMode} is set to `SPRING_MODE_FREQUENCY`.
     *
     * @type {number}
     * @defaultValue 0
     */
    frequency = 0;

    /**
     * Spring stiffness. Only used, when {@link springMode} is set to `SPRING_MODE_STIFFNESS`.
     *
     * @type {number}
     * @defaultValue 0
     */
    stiffness = 1;

    /**
     * Spring damping.
     *
     * @type {number}
     * @defaultValue 0
     */
    damping = 0;
}

/**
 * @interface
 * @group Utilities
 * @category Settings
 */
class MotorSettings {
    /**
     * Minimum force to apply in case of a linear constraint. Not used when motor is an angular
     * motor.
     *
     * @type {number}
     * @defaultValue -Infinity (N)
     */
    minForceLimit;

    /**
     * Maximum force to apply in case of a linear constraint. Not used when motor is an angular
     * motor.
     *
     * @type {number}
     * @defaultValue +Infinity (N)
     */
    maxForceLimit;

    /**
     * Minimum torque to apply in case of a angular constraint. Not used when motor is a position
     * motor.
     *
     * @type {number}
     * @defaultValue -Infinity (N m)
     */
    minTorqueLimit = -Number.MAX_VALUE;

    /**
     * Maximum torque to apply in case of a angular constraint. Not used when motor is a position
     * motor.
     *
     * @type {number}
     * @defaultValue -Infinity (N m)
     */
    maxTorqueLimit = Number.MAX_VALUE;

    /**
     * Settings for the spring that is used to drive to the position target (not used when motor
     * is a velocity motor).
     *
     * @type {SpringSettings | null}
     * @defaultValue null
     */
    springSettings;
}

/**
 * @interface
 * @group Utilities
 * @category Settings
 */
class ConeConstraintSettings extends ConstraintSettings {
    /**
     * Twist axis of body 1.
     *
     * @type {Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    twistAxis1;

    /**
     * Twist axis of body 2.
     *
     * @type {Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    twistAxis2;

    /**
     * Half of maximum angle between twist axis of body 1 and 2.
     *
     * @type {number}
     * @defaultValue 0 (radians)
     */
    halfConeAngle;
}

/**
 * @interface
 * @group Utilities
 * @category Settings
 */
class DistanceConstraintSettings extends ConstraintSettings {
    /**
     * Specifies a minimum distance to keep bodies apart. If set to negative number, uses initial
     * distance between two bodies, when the joint was created. Only works when {@link space} is
     * set to `CONSTRAINT_SPACE_WORLD`.
     *
     * @type {number}
     * @defaultValue -1
     */
    minDistance;

    /**
     * Specifies a maximum distance to keep bodies apart. If set to negative number, uses initial
     * distance between two bodies, when the joint was created. Only works when {@link space} is
     * set to `CONSTRAINT_SPACE_WORLD`.
     *
     * @type {number}
     * @defaultValue -1
     */
    maxDistance = -1;

    /**
     * Optional spring to use when constraining distance.
     *
     * @type {SpringSettings | null}
     * @defaultValue null
     */
    limitsSpringSettings;
}

/**
 * @interface
 * @group Utilities
 * @category Settings
 */
class FixedConstraintSettings extends ConstraintSettings {
    /**
     * If `true`, will auto-calculate and use the distance between two bodies upon creation. Only
     * used when {@link space} is set to `CONSTRAINT_SPACE_WORLD`.
     *
     * @type {boolean}
     * @defaultValue true
     */
    _autoDetectPoint;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    _axisX1;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    _axisX2;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    _axisY1;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    _axisY2;
}

/**
 * @interface
 * @group Utilities
 * @category Settings
 */
class HingeConstraintSettings extends ConstraintSettings {
    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    hingeAxis1;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    hingeAxis2;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    normalAxis1;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    normalAxis2;

    /**
     * Bodies are assumed to be placed so that the hinge angle equals zero. Movement will be
     * limited between [{@link limitsMin}, {@link limitsMax}] where {@link limitsMin} belongs to
     * range `[-PI, 0]` and {@link limitsMax} belongs to `[0, PI]`. Both angles are in radians.
     *
     * @type {number}
     * @defaultValue Math.PI
     */
    limitsMax;

    /**
     * See {@link limitsMax}.
     *
     * @type {number}
     * @defaultValue -Math.PI
     */
    limitsMin;

    /**
     * Optional spring settings to use a spring when constraining limits.
     *
     * @type {SpringSettings | null}
     * @defaultValue null
     */
    limitsSpringSettings;

    /**
     * Optional motor to power the constraint around the hinge axis.
     *
     * @type {MotorSettings | null}
     * @defaultValue null
     */
    motorSettings;

    /**
     * Maximum amount of torque to apply as friction when the constraint is not powered by a motor.
     *
     * @type {number}
     * @defaultValue 0 (N m)
     */
    maxFrictionTorque = 0;
}

/**
 * @interface
 * @group Utilities
 * @category Settings
 */
class PulleyConstraintSettings extends ConstraintSettings {
    /**
     * Fixed world point to which body 1 is connected (always in world space).
     *
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 0, 0)
     */
    fixedPoint1;

    /**
     * Fixed world point to which body 2 is connected (always in world space).
     *
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 0, 0)
     */
    fixedPoint2;

    /**
     * Ratio between the two line segments:
     * ```
     * MinDistance <= Length1 + Ratio * Length2 <= MaxDistance
     * ```
     *
     * @type {number}
     * @defaultValue 1
     */
    ratio;

    /**
     * The minimum length of the line segments. Use -1 to calculate the length based on the
     * positions of the objects when the constraint is created.
     *
     * @type {number}
     * @defaultValue 0
     */
    minLength;

    /**
     * The maximum length of the line segments. Use -1 to calculate the length based on the
     * positions of the objects when the constraint is created.
     *
     * @type {number}
     * @defaultValue -1
     */
    maxLength;
}

/**
 * @interface
 * @group Utilities
 * @category Settings
 */
class SixDOFConstraintSettings extends ConstraintSettings {
    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    axisX1;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    axisX2;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    axisY1;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    axisY2;

    /**
     * Make one or more axis fixed (fixed at value 0). Provided as an array of numbers.
     * @example
     * ```js
     * // Prevent translating along X axis and rotating around Y axis
     * [CONSTRAINT_SIX_DOF_TRANSLATION_X, CONSTRAINT_SIX_DOF_ROTATION_Y]
     * ```
     *
     * Following axis constants available can be used:
     * ```
     * CONSTRAINT_SIX_DOF_TRANSLATION_X
     * ```
     * ```
     * CONSTRAINT_SIX_DOF_TRANSLATION_Y
     * ```
     * ```
     * CONSTRAINT_SIX_DOF_TRANSLATION_Z
     * ```
     * ```
     * CONSTRAINT_SIX_DOF_ROTATION_X
     * ```
     * ```
     * CONSTRAINT_SIX_DOF_ROTATION_Y
     * ```
     * ```
     * CONSTRAINT_SIX_DOF_ROTATION_Z
     * ```
     *
     * @type {number[] | null}
     * @defaultValue null
     */
    fixedAxes;

    /**
     * Make one or more axis free (unconstrained). Provided as an array of numbers.
     * See {@link fixedAxes}.
     *
     * @type {number[] | null}
     * @defaultValue null
     */
    freeAxes;

    /**
     * Set limits to one or more axis. Provided as an array of non-interleaved values of axis and
     * limits (meters for position, radians for rotation).
     * ```
     * [a1, min1, max1, a2, min2, max2, ..., aN, minN, maxN]
     * ```
     * where:
     * - `aN` - axis alias number
     * - `minN` - lower constraint limit
     * - `maxN` - upper constraint limit
     *
     * @example
     * ```
     * // Allow 0.2m movement on X axis and 10 degrees around Y
     * [
     *     CONSTRAINT_SIX_DOF_TRANSLATION_X, -0.1, 0.1,
     *     CONSTRAINT_SIX_DOF_ROTATION_Y, -5*rads, 5*rads,
     * ]
     * ```
     *
     * See available aliases in {@link fixedAxes}.
     *
     * @type {number[] | null}
     * @defaultValue null
     */
    limitedAxes;

    /**
     * Upper limit for axis (meters for position, radians for rotation). Provided as an array with
     * 6 float numbers:
     * ```
     * [posX, posY, posZ, rotX, rotY, rotZ]
     * ```
     * @type {number[] | null}
     * @defaultValue null
     */
    limitMax;

    /**
     * Lower limit for axis. See {@link limitMax}.
     *
     * @type {number[] | null}
     * @defaultValue null
     */
    limitMin;

    /**
     * Specifies friction values for each axis (friction force for translation, friction torque for
     * rotation). Provided as an array with 6 float numbers. See {@link limitMax}.
     *
     * @type {number[] | null}
     * @defaultValue null
     */
    maxFriction;

    /**
     * The type of swing constraint to use. Following aliases for types available:
     * ```
     * CONSTRAINT_SWING_TYPE_CONE
     * ```
     * ```
     * CONSTRAINT_SWING_TYPE_PYRAMID
     * ```
     *
     * @type {number}
     * @defaultValue CONSTRAINT_SWING_TYPE_CONE
     */
    swingType;

    /**
     * Optional spring to use when applying positional and rotational limits.
     *
     * @type {SpringSettings}
     * @defaultValue null
     */
    limitsSpringSettings;

    /**
     * Optional motor to power the constraint.
     *
     * @type {MotorSettings}
     * @defaultValue null
     */
    motorSettings;
}

/**
 * @interface
 * @group Utilities
 * @category Settings
 */
class SliderConstraintSettings extends ConstraintSettings {
    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    sliderAxis1;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    sliderAxis2;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    normalAxis1;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    normalAxis2;

    /**
     * Upper limit of the constraint. In meters.
     *
     * @type {number}
     * @defaultValue +Infinity
     */
    limitsMax;

    /**
     * Lower limit of the constraint. In meters.
     *
     * @type {number}
     * @defaultValue -Infinity
     */
    limitsMin;

    /**
     * Maximum amount of friction force to apply when not driven by a motor.
     *
     * @type {number}
     * @defaultValue 0 (newtons)
     */
    maxFrictionForce;

    /**
     * Optional spring settings to use a spring when constraining limits.
     *
     * @type {SpringSettings | null}
     * @defaultValue null
     */
    limitsSpringSettings = null;

    /**
     * Optional motor settings to use a motor that will drive the constraint.
     *
     * @type {MotorSettings}
     * @defaultValue null
     */
    motorSettings = null;
}

/**
 * @interface
 * @group Utilities
 * @category Settings
 */
class SwingTwistConstraintSettings extends ConstraintSettings {
    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    twistAxis1;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    twistAxis2;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    planeAxis1;

    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    planeAxis2;

    /**
     * @type {number}
     * @defaultValue 0
     */
    normalHalfConeAngle;

    /**
     * @type {number}
     * @defaultValue 0
     */
    planeHalfConeAngle;

    /**
     * @type {number}
     * @defaultValue 0
     */
    twistMinAngle;

    /**
     * @type {number}
     * @defaultValue 0
     */
    twistMaxAngle;

    /**
     * @type {number}
     * @defaultValue 0
     */
    maxFrictionTorque;

    /**
     * @type {MotorSettings | null}
     * @defaultValue null
     */
    swingMotorSettings = null;

    /**
     * @type {MotorSettings | null}
     * @defaultValue null
     */
    twistMotorSettings;
}

/**
 * @interface
 * @group Utilities
 * @category Settings
 */
class TrackedWheelSettings {
    /**
     * @type {import('playcanvas').Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    twistAxis1;

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
    
            if (isWheeled) {
    
                // Moment of inertia (kg m^2), for a cylinder this would be 0.5 * M * R^2 which is
                // 0.9 for a wheel with a mass of 20 kg and radius 0.3 m.
                cb.write(desc.inertia ?? 0.9, BUFFER_WRITE_FLOAT32, false);
    
                // Angular damping factor of the wheel: dw/dt = -c * w.
                cb.write(desc.angularDamping ?? 0.2, BUFFER_WRITE_FLOAT32, false);
    
                // How much this wheel can steer (radians). Defaults to ~1.22 rad (70 degrees).
                cb.write(desc.maxSteerAngle ?? 1.2217304763960306, BUFFER_WRITE_FLOAT32, false);
    
                // How much torque (Nm) the brakes can apply to this wheel.
                cb.write(desc.maxBrakeTorque ?? 1500, BUFFER_WRITE_FLOAT32, false);
    
                // How much torque (Nm) the hand brake can apply to this wheel (usually only applied
                // to the rear wheels)
                cb.write(desc.maxHandBrakeTorque ?? 4000, BUFFER_WRITE_FLOAT32, false);
            }
}

export {
    SpringSettings, MotorSettings, ConstraintSettings, ConeConstraintSettings, DistanceConstraintSettings,
    FixedConstraintSettings, HingeConstraintSettings, PulleyConstraintSettings, SixDOFConstraintSettings,
    SliderConstraintSettings, SwingTwistConstraintSettings
};

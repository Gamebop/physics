/**
 * @import { Vec3, Entity, Curve } from 'playcanvas'
 */

/**
 * @interface
 * @group Utilities
 * @category Constraints
 */
class ConstraintSettings {
    /**
     * Override for the number of solver position iterations to run. If set to `0`, the constraint
     * will use global default set by Physics initialization setting
     * {@link JoltInitSettings.numPositionSteps}.
     *
     * @type {number}
     * @defaultValue 0
     */
    numPositionStepsOverride;

    /**
     * Override for the number of solver velocity iterations to run. If set to `0`, the constraint
     * will use global default set by Physics initialization setting
     * {@link JoltInitSettings.numVelocitySteps}.
     *
     * @type {number}
     * @defaultValue 0
     */
    numVelocityStepsOverride;

    /**
     * First body position in constraint reference frame. Space is determined by {@link space}
     * property.
     *
     * @type {Vec3}
     * @defaultValue Vec3(0, 0, 0)
     */
    point1;

    /**
     * Second body position in constraint reference frame. Space is determined by {@link space}
     * property.
     *
     * @type {Vec3}
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
 * @category Constraints
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
    frequency;

    /**
     * Spring stiffness. Only used, when {@link springMode} is set to `SPRING_MODE_STIFFNESS`.
     *
     * @type {number}
     * @defaultValue 0
     */
    stiffness;

    /**
     * Spring damping.
     *
     * @type {number}
     * @defaultValue 0
     */
    damping;
}

/**
 * @interface
 * @group Utilities
 * @category Constraints
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
 * @category Joint Constraints
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
 * @category Joint Constraints
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
 * @category Joint Constraints
 */
class FixedConstraintSettings extends ConstraintSettings {
    /**
     * If `true`, will auto-calculate and use the distance between two bodies upon creation. Only
     * used when {@link space} is set to `CONSTRAINT_SPACE_WORLD`.
     *
     * @type {boolean}
     * @defaultValue true
     */
    autoDetectPoint;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    axisX1;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    axisX2;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    axisY1;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    axisY2;
}

/**
 * @interface
 * @group Utilities
 * @category Joint Constraints
 */
class HingeConstraintSettings extends ConstraintSettings {
    /**
     * @type {Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    hingeAxis1;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    hingeAxis2;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    normalAxis1;

    /**
     * @type {Vec3}
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
 * @category Joint Constraints
 */
class PulleyConstraintSettings extends ConstraintSettings {
    /**
     * Fixed world point to which body 1 is connected (always in world space).
     *
     * @type {Vec3}
     * @defaultValue Vec3(0, 0, 0)
     */
    fixedPoint1;

    /**
     * Fixed world point to which body 2 is connected (always in world space).
     *
     * @type {Vec3}
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
 * @category Joint Constraints
 */
class SixDOFConstraintSettings extends ConstraintSettings {
    /**
     * @type {Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    axisX1;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    axisX2;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    axisY1;

    /**
     * @type {Vec3}
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
 * @category Joint Constraints
 */
class SliderConstraintSettings extends ConstraintSettings {
    /**
     * If `true`, will auto-calculate and use the distance between two bodies upon creation. Only
     * used when {@link space} is set to `CONSTRAINT_SPACE_WORLD`.
     *
     * @type {boolean}
     * @defaultValue true
     */
    autoDetectPoint;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    sliderAxis1;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    sliderAxis2;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    normalAxis1;

    /**
     * @type {Vec3}
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
 * @category Joint Constraints
 */
class SwingTwistConstraintSettings extends ConstraintSettings {
    /**
     * @type {Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    twistAxis1;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(1, 0, 0)
     */
    twistAxis2;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    planeAxis1;

    /**
     * @type {Vec3}
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
 * @category Vehicle Constraints
 */
class BarSettings {
    /**
     * Index (in wheels) that represents the left wheel of this anti-rollbar.
     *
     * @type {number}
     * @defaultValue 0
     */
    leftWheel;

    /**
     * Index (in wheels) that represents the right wheel of this anti-rollbar.
     *
     * @type {number}
     * @defaultValue 1
     */
    rightWheel;

    /**
     * Stiffness of anti rollbar, can be 0 to disable the anti-rollbar.
     *
     * @type {number}
     * @defaultValue 1000 (N/m)
     */
    stiffness;
}

/**
 * @interface
 * @group Utilities
 * @category Vehicle Constraints
 */
class WheelSettings {
    /**
     * If disabled, the forces are applied at the collision contact point. This leads to a more
     * accurate simulation when interacting with dynamic objects but makes the vehicle less stable.
     * When setting this to true, all forces will be applied to a fixed point on the vehicle body.
     *
     * @type {boolean}
     * @defaultValue false
     */
    enableSuspensionForcePoint;

    /**
     * PlayCanvas Entity that will be used as a visual wheel. Its position and rotation will be
     * updated automatically to match the physical wheel.
     *
     * @type {Entity | null}
     * @defaultValue null
     */
    entity;

    /**
     * Attachment point of wheel suspension in local space of the body.
     *
     * @type {Vec3}
     * @defaultValue Vec3(0, 0, 0)
     */
    position;

    /**
     * A spring of the wheel.
     *
     * @type {number}
     * @defaultValue 0.3
     */
    radius;

    /**
     * Wheel spring settings.
     *
     * @type {SpringSettings}
     * @defaultValue Frequency spring (frequency: 1.5, damping: 0.5)
     */
    springSettings;

    /**
     * Direction of the steering axis in local space of the body, should point up (e.g. for a bike
     * would be `-suspensionDirection`).
     *
     * @type {Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    steeringAxis;

    /**
     * Direction of the suspension in local space of the body, should point down.
     *
     * @type {Vec3}
     * @defaultValue Vec3(0, -1, 0)
     */
    suspensionDirection;

    /**
     * Where tire forces (suspension and traction) are applied, in local space of the body. A good
     * default is the center of the wheel in its neutral pose. See
     * {@link enableSuspensionForcePoint}.
     *
     * @type {Vec3}
     * @defaultValue Vec3(0, 0, 0)
     */
    suspensionForcePoint;

    /**
     * How long the suspension is in max droop position relative to the attachment point.
     *
     * @type {number}
     * @defaultValue 0.5 (m)
     */
    suspensionMaxLength;

    /**
     * How long the suspension is in min raised position relative to the attachment point.
     *
     * @type {number}
     * @defaultValue 0.3 (m)
     */
    suspensionMinLength;

    /**
     * The natural length of the suspension spring is defined as {@link suspensionMaxLength} +
     * `suspensionPreloadLength`. Can be used to preload the suspension as the spring is
     * compressed by `suspensionPreloadLength` when the suspension is in max droop position. Note,
     * that this means when the vehicle touches the ground there is a discontinuity, so it will
     * also make the vehicle more bouncy as we're updating with discrete time steps.
     *
     * @type {number}
     * @defaultValue 0
     */
    suspensionPreloadLength;

    /**
     * Forward direction when the wheel is in the neutral steering position (usually
     * `component.forward` but can be used to give the wheel toe, does not need to be perpendicular
     * to {@link wheelUp}).
     *
     * @type {Vec3}
     * @defaultValue Vec3(0, 0, 1)
     */
    wheelForward;

    /**
     * Up direction when the wheel is in the neutral steering position (usually `component.up` but
     * can be used to give the wheel camber or for a bike would be `-suspensionDirection`).
     *
     * @type {Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    wheelUp;

    /**
     * A width of the wheel.
     *
     * @type {number}
     * @defaultValue 0.1
     */
    width;
}

/**
 * @interface
 * @group Utilities
 * @category Vehicle Constraints
 */
class WheelWVSettings extends WheelSettings {
    /**
     * Angular damping factor of the wheel:
     * ```
     * dw/dt = -c * w.
     * ```
     *
     * @type {number}
     * @defaultValue 0.2
     */
    angularDamping;

    /**
     * Moment of inertia. For a cylinder this would be
     * ```
     * 0.5 * M * R^2
     * ```
     * which is `0.9` for a wheel with a mass of `20 kg` and radius `0.3 m`.
     *
     * @type {number}
     * @defaultValue 0.9 (kg m^2)
     */
    inertia;

    /**
     * Friction in sideway direction of tire as a function of the slip angle (degrees): angle
     * between relative contact velocity and vehicle direction.
     *
     * If tire forward matches the vehicle direction, then the angle is `0` degrees. If the vehicle
     * is sliding sideways, e.g. on ice, then the angle is 90 degrees. Example curve keys could be:
     * `[[0, 1], [90, 0.3]]` - full friction at zero degrees, and `0.3` friction at `90`.
     *
     * @type {Curve | null}
     * @defaultValue Curve([0, 0, 3, 1.2, 20, 1]);
     */
    lateralFrictionCurve;

    /**
     * Friction in forward direction of tire as a function of the slip ratio (fraction):
     * ```
     * (omega_wheel * r_wheel - v_longitudinal) / |v_longitudinal|.
     * ```
     *
     * Slip ratio here is a ratio of wheel spinning relative to the floor. At `0` the wheel has
     * full traction and is rolling perfectly in sync with the ground. At 1 the wheel is locked and
     * is sliding over the ground.
     *
     * @type {Curve | null}
     * @defaultValue Curve([0, 0, 0.06, 1.2, 0.2, 1])
     */
    longitudinalFrictionCurve;

    /**
     * How much torque the brakes can apply to this wheel.
     *
     * @type {number}
     * @defaultValue 1500 (Nm)
     */
    maxBrakeTorque;

    /**
     * How much torque the hand brake can apply to this wheel (usually only applied to the
     * rear wheels).
     *
     * @type {number}
     * @defaultValue 4000 (Nm)
     */
    maxHandBrakeTorque;

    /**
     * How much this wheel can steer.
     *
     * @type {number}
     * @defaultValue ~1.22 rad (70 degrees).
     */
    maxSteerAngle;
}

/**
 * @interface
 * @group Utilities
 * @category Vehicle Constraints
 */
class WheelTVSettings {
    /**
     * Friction in sideway direction of tire.
     *
     * @type {number}
     * @defaultValue 2
     */
    lateralFriction;

    /**
     * Friction in forward direction of tire.
     *
     * @type {number}
     * @defaultValue 4
     */
    longitudinalFriction;
}

/**
 * @interface
 * @group Utilities
 * @category Vehicle Constraints
 */
class VehicleConstraintSettings {
    /**
     * @type {Entity | null}
     * @defaultValue null
     */
    entity;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    up;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(0, 0, 1)
     */
    forward;

    /**
     * @type {number}
     * @defaultValue 1.0471975511965976
     */
    maxPitchRollAngle = 1.0471975511965976;

    /**
     * @type {Array<Array<number>>}
     * @defaultValue []
     */
    tracks;

    /**
     * @type {Array<WheelWVSettings> | Array<WheelTVSettings>}
     * @defaultValue []
     */
    wheelsSettings;

    /**
     * @type {number}
     * @defaultValue 500
     */
    maxTorque;

    /**
     * @type {number}
     * @defaultValue 1000
     */
    minRPM = 1000;

    /**
     * @type {number}
     * @defaultValue 6000
     */
    maxRPM;

    /**
     * @type {number}
     * @defaultValue 0.5
     */
    inertia;

    /**
     * @type {number}
     * @defaultValue 0.2
     */
    wheelAngularDamping;

    /**
     * @type {Curve | null}
     * @defaultValue Curve([0, 0.8])
     */
    normalizedTorque;

    /**
     * @type {number}
     * @defaultValue TRANSMISSION_AUTO
     */
    mode;

    /**
     * @type {Array<number>}
     * @defaultValue [2.66, 1.78, 1.3, 1, 0.74]
     */
    gearRatios;

    /**
     * @type {Array<number>}
     * @defaultValue [-2.9]
     */
    reverseGearRatios;

    /**
     * @type {number}
     * @defaultValue 0.5
     */
    switchTime;

    /**
     * @type {number}
     * @defaultValue 0.5
     */
    clutchReleaseTime;

    /**
     * @type {number}
     * @defaultValue 0.5
     */
    switchLatency;

    /**
     * @type {number}
     * @defaultValue 4000
     */
    shiftUpRPM;

    /**
     * @type {number}
     * @defaultValue 2000
     */
    shiftDownRPM;

    /**
     * @type {number}
     * @defaultValue 10
     */
    clutchStrength;

    /**
     * @type {Array<BarSettings>}
     * @defaultValue []
     */
    antiRollBars;

    /**
     * @type {number}
     * @defaultValue VEHICLE_CAST_TYPE_RAY
     */
    castType;

    /**
     * @type {number}
     * @defaultValue OBJ_LAYER_MOVING
     */
    castObjectLayer;

    /**
     * @type {Vec3}
     * @defaultValue Vec3(0, 1, 0)
     */
    castUp;

    /**
     * @type {number}
     * @defaultValue 1.3962634015954636
     */
    castMaxSlopeAngle;

    /**
     * @type {number}
     * @defaultValue 0.3
     */
    castRadius;

    /**
     * @type {number}
     * @defaultValue 0.3
     */
    castFraction = 0.3;
}

/**
 * @interface
 * @group Utilities
 * @category Vehicle Constraints
 */
class WheeledVehicleConstraintSettings extends VehicleConstraintSettings {
    /**
     * @type {number}
     * @defaultValue 1.4
     */
    differentialLimitedSlipRatio;

    /**
     * @type {Array<number>}
     * @defaultValue []
     */
    differentials;
}

/**
 * @interface
 * @group Utilities
 * @category Vehicle Constraints
 */
class MotoVehicleConstraintSettings extends VehicleConstraintSettings {
    /**
     * @type {number}
     * @defaultValue 45 * math.DEG_TO_RAD
     */
    maxLeanAngle;

    /**
     * @type {number}
     * @defaultValue 5000
     */
    leanSpringConstant;

    /**
     * @type {number}
     * @defaultValue 1000
     */
    leanSpringDamping;

    /**
     * @type {number}
     * @defaultValue 0
     */
    leanSpringIntegrationCoefficient;

    /**
     * @type {number}
     * @defaultValue 4
     */
    leanSpringIntegrationCoefficientDecay;

    /**
     * @type {number}
     * @defaultValue 0.8
     */
    leanSmoothingFactor;
}

/**
 * @interface
 * @group Utilities
 * @category Vehicle Constraints
 */
class TrackedVehicleConstraintSettings extends VehicleConstraintSettings {}

/**
 * @interface
 * @group Utilities
 * @category Vehicle Constraints
 */
class DifferentialSettings {
    /**
     * Index (in mWheels) that represents the left wheel of this differential (can be `-1` to
     * indicate no wheel).
     *
     * @type {number}
     * @defaultValue -1
     */
    leftWheel;

    /**
     * Same as {@link leftWheel}, but for the right one.
     *
     * @type {number}
     * @defaultValue -1
     */
    rightWheel;

    /**
     * Ratio between rotation speed of gear box and wheels.
     *
     * @type {number}
     * @defaultValue 3.42
     */
    differentialRatio;

    /**
     * Defines how the engine torque is split across the left and right wheel:
     * - `0`: left
     * - `0.5`: center
     * - `1`: right
     *
     * @type {number}
     * @defaultValue 0.5
     */
    leftRightSplit;

    /**
     * Ratio max / min wheel speed. When this ratio is exceeded, all torque gets distributed to the
     * slowest moving wheel. This allows implementing a limited slip differential. Set to
     * `Number.MAX_VALUE` for an open differential. Value should be `> 1`.
     *
     * @type {number}
     * @defaultValue 1.4
     */
    limitedSlipRatio;

    /**
     * How much of the engines torque is applied to this differential:
     * - `0`: none
     * - `1`: full
     *
     * Make sure the sum of all differentials is `1`.
     *
     * @type {number}
     * @defaultValue 1
     */
    engineTorqueRatio;
}

export {
    SpringSettings, MotorSettings, ConstraintSettings, ConeConstraintSettings, DistanceConstraintSettings,
    FixedConstraintSettings, HingeConstraintSettings, PulleyConstraintSettings, SixDOFConstraintSettings,
    SliderConstraintSettings, SwingTwistConstraintSettings, VehicleConstraintSettings, WheelSettings,
    WheeledVehicleConstraintSettings, MotoVehicleConstraintSettings, TrackedVehicleConstraintSettings,
    BarSettings, WheelTVSettings, WheelWVSettings, DifferentialSettings
};

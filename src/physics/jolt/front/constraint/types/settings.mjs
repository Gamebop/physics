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
     * Reference frame that `point1` and `point2` use. Following enum aliases available:
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
     * Selects the spring mode. Following enum aliases available:
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
    normalAxis2 = Vec3.RIGHT;

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
     * Following axis enum aliases available can be used:
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

export {
    SpringSettings, MotorSettings, ConstraintSettings, ConeConstraintSettings, DistanceConstraintSettings,
    FixedConstraintSettings, HingeConstraintSettings, PulleyConstraintSettings, SixDOFConstraintSettings,
    SliderConstraintSettings, SwingTwistConstraintSettings
};
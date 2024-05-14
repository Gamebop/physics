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

export {
    SpringSettings, MotorSettings, ConstraintSettings, ConeConstraintSettings, DistanceConstraintSettings,
    FixedConstraintSettings, HingeConstraintSettings
};
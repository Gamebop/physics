import { Debug } from "../../../debug.mjs";
import { BodyComponent } from "../body/component.mjs";

export const springSettings = {
    mode: 
};

/** Wheel creation options. */
export const wheelSettings = {
    /** @type {import('playcanvas').Vec3} */
    position: pc.Vec3(),
    spring: {
        mode: SPRING_MODE_FREQUENCY
    }
};

/**
 * Vehicle Component describes all properties of a Jolt Vehicle. There are different types of
 * vehicles supported:
 * - Wheeled vehicle - a vehicle with wheels, e.g. a car, truck, etc.
 * - Motorcycle vehicle - a two-wheeled vehicle, e.g. motorcycle, bicycle, etc.
 * - Tracked vehicle - a vehicle with tracks, e.g. tank, traktor, etc.
 * 
 * @category Vehicle Component
 */
class VehicleComponent extends BodyComponent {

    _numVelocityStepsOverride = 0;

    _numPositionStepsOverride = 0;

    _up = pc.Vec3.UP;

    _forward = pc.Vec3.BACK;

    _maxPitchRollAngle = 1.0471975511965976;

    // TODO
    // lazy allocate array
    _tracks = [];

    /** @type {wheelSettings[]} @hidden */
    _wheels = [];

    _type = VEHICLE_TYPE_WHEEL;

    _maxTorque = 500;
    
    _minRPM = 1000;

    _maxRPM = 6000;

    _inertia = 0.5;

    _wheelAngularDamping = 0.2;

    _normalizedTorque = new pc.Curve([0, 0.8]);

    _mode = pc.JOLT_TRANSMISSION_AUTO;

    _gearRatios = [2.66, 1.78, 1.3, 1, 0.74];

    _reverseGearRatios = [-2.9];

    _switchTime = 0.5;

    _clutchReleaseTime = 0.3;

    _switchLatency = 0.5;

    _shiftUpRPM = 4000;

    _shiftDownRPM = 2000;

    _clutchStrength = 10;

    _differentials = [];

    _differentialLimitedSlipRatio = 1.4;

    _antiRollBars = [];    

    _castType = VEHICLE_CAST_TYPE_RAY;

    _castObjectLayer = OBJ_LAYER_MOVING;

    _castUp = pc.Vec3.UP;

    _castMaxSlopeAngle = 1.3962634015954636;

    _castRadius = 0.3;

    _castFraction = 0.1;

    _maxLeanAngle = 45;
    
    _leanSpringConstant = 5000;

    _leanSpringDamping = 1000;

    _leanSpringIntegrationCoefficient = 0;

    _leanSpringIntegrationCoefficientDecay = 4;

    _leanSmoothingFactor = 0.8;

    constructor(system, entity) {
        super(system, entity);
    }

    /**
     * An anti-roll bar is a stiff spring that connects two wheels to reduce the amount of roll the
     * vehicle makes in sharp corners See: [Anti-roll bar](https://en.wikipedia.org/wiki/Anti-roll_bar).
     * 
     * @defaultValue []
     */
    get antiRollBars() {
        return this._antiRollBars;
    }

    /**
     * Fraction of half the wheel width (or wheel radius if it is smaller) that is used as the
     * convex radius.
     * 
     * @defaultValue 0.1 // float, percent
     */
    get castFraction() {
        return this._castFraction;
    }

    /**
     * Max angle that is considered for colliding wheels. This is to avoid colliding with vertical
     * walls.
     * 
     * @defaultValue 80 * Math.PI / 180 // radians
     */
    get castMaxSlopeAngle() {
        return this._castMaxSlopeAngle;
    }

    /**
     * Object layer to test collision against. Default ones available:
     * ```
     * OBJ_LAYER_MOVING
     * ```
     * ```
     * OBJ_LAYER_NON_MOVING
     * ```
     * You can define custom layers. See (TODO add link).
     * 
     * @defaultValue OBJ_LAYER_MOVING // enum integer
     */
    get castObjectLayer() {
        return this._castObjectLayer;
    }

    /**
     * Sets the radius of the sphere used in cast.
     * 
     * @defaultValue 0.3 // meters
     */
    get castRadius() {
        return this._castRadius;
    }

    /**
     * A collision tester that tests wheels collision. Can be one of the following:
     * ```
     * VEHICLE_CAST_TYPE_RAY
     * ```
     * ```
     * VEHICLE_CAST_TYPE_SPHERE
     * ```
     * ```
     * VEHICLE_CAST_TYPE_CYLINDER
     * ```
     * 
     * @defaultValue VEHICLE_CAST_TYPE_RAY // enum integer
     */
    get castType() {
        return this._castType;
    }

    /**
     * World space up vector, used to avoid colliding with vertical walls.
     * 
     * @defaultValue Vec3(0, 1, 0)
     */
    get castUp() {
        return this._castUp;
    }

    /**
     * How long it takes to release the clutch (go to full friction), only used in auto mode.
     * 
     * @defaultValue 0.3 // seconds
     */
    get clutchReleaseTime() {
        return this._clutchReleaseTime;
    }

    /**
     * Strength of the clutch when fully engaged. Total torque a clutch applies is 
     * ```text
     * Torque = ClutchStrength * (Velocity Engine - Avg Velocity Wheels At Clutch)
     * ```
     * 
     * @defaultValue 10 // k m^2 s^-1
     */
    get clutchStrength() {
        return this._clutchStrength;
    }

    /**
     * Used when vehicle is of wheeled type. Ratio max/min average wheel speed of each differential
     * (measured at the clutch). When the ratio is exceeded all torque gets distributed to the
     * differential with the minimal average velocity. This allows implementing a limited slip
     * differential between differentials. Set to Number.MAX_VALUE for an open differential. Value
     * should be > 1.
     * 
     * @defaultValue 1.4 // float
     */
    get differentialLimitedSlipRatio() {
        return this._differentialLimitedSlipRatio;
    }

    /**
     * List of differentials and their properties.
     * 
     * @defaultValue []
     */
    get differentials() {
        return this._differentials;
    }

    /**
     * Vector indicating forward direction of the vehicle (in local space to the body).
     * 
     * @defaultValue Vec3(0, 0, 1)
     */
    get forward() {
        return this._forward;
    }

    /**
     * Ratio in rotation rate between engine and gear box. First element is the 1st gear, 2nd
     * element is 2nd gear etc.
     * 
     * @defaultValue [2.66, 1.78, 1.3, 1, 0.74] // array of floats
     */
    get gearRatios() {
        return this._gearRatios;
    }

    /**
     * Moment of inertia of the engine.
     * 
     * @defaultValue 0.5 // kg m^2
     */
    get inertia() {
        return this._inertia;
    }

    /**
     * How much to smooth the lean angle. Used only by motorcycle type.
     * - 0 = no smoothing
     * - 1 = lean angle never changes
     * 
     * @defaultValue 0.8 // float
     */
    get leanSmoothingFactor() {
        return this._leanSmoothingFactor;
    }

    /**
     * Spring constant for the lean spring. Used only by motorcycle type.
     * 
     * @defaultValue 5000 // float
     */
    get leanSpringConstant() {
        return this._leanSpringConstant;
    }

    /**
     * Spring damping constant for the lean spring. Used only by motorcycle type.
     * 
     * @defaultValue 1000 // float
     */
    get leanSpringDamping() {
        return this._leanSpringDamping;
    }

    /**
     * The lean spring applies an additional force equal to 
     * ```
     * coefficient * Integral(delta angle, 0, t)
     * ```
     * This effectively makes the lean spring a PID controller. Used only by motorcycle type.
     * 
     * @defaultValue 0 // float
     */
    get leanSpringIntegrationCoefficient() {
        return this._leanSpringIntegrationCoefficient;
    }

    /**
     * How much to decay the angle integral when the wheels are not touching the floor:
     * ```
     * new_value = e^(-decay * t) * initial_value
     * ```
     * Used only by motorcycle type.
     * 
     * @defaultValue 4 // float
     */
    get leanSpringIntegrationCoefficientDecay() {
        return this._leanSpringIntegrationCoefficientDecay;
    }

    /**
     * How far we're willing to make the bike lean over in turns. Used only by motorcycle type.
     * 
     * @defaultValue 45 * Math.PI / 180 // radians
     */
    get maxLeanAngle() {
        return this._maxLeanAngle;
    }    

    /**
     * Defines the maximum pitch/roll angle. Can be used to avoid the car from getting upside down.
     * The vehicle up direction will stay within a cone centered around the up axis with half top
     * angle `maxPitchRollAngle`. Set to `Math.PI` to turn off.
     * 
     * @defaultValue 60 * Math.PI / 180 // radians
     */
    get maxPitchRollAngle() {
        return this._maxPitchRollAngle;
    }

    /**
     * Max amount of torque that the engine can deliver.
     * 
     * @defaultValue 500 // Nm
     */
    get maxTorque() {
        return this._maxTorque;
    }

    /**
     * Min amount of revolutions per minute the engine can produce without stalling.
     * 
     * @defaultValue 1000 // revolutions per minute, RPM
     */
    get minRPM() {
        return this._minRPM;
    }

    /**
     * Max amount of revolutions per minute the engine can generate.
     * 
     * @defaultValue 6000 // revolutions per minute, RPM
     */
    get maxRPM() {
        return this._maxRPM;
    }

    /**
     * How to switch gears. Possible values:
     * ```
     * TRANSMISSION_AUTO
     * ```
     * ```
     * TRANSMISSION_MANUAL
     * ```
     * 
     * @defaultValue TRANSMISSION_AUTO // enum integer
     */
    get mode() {
        return this._mode;
    }

    /**
     * Curve that describes a ratio of the max torque the engine can produce vs the fraction of the
     * max RPM of the engine.
     * 
     * @defaultValue Curve([0, 0.8])
     */
    get normalizedTorque() {
        return this._normalizedTorque;
    }

    /**
     * Override for the number of solver position iterations to run, 0 means use the default that
     * was set using `numPositionSteps` param during initialization: {@link init}.
     * 
     * @defaultValue 0 // integer
     */
    get numPositionStepsOverride() {
        return this._numPositionStepsOverride;
    }

    /**
     * Override for the number of solver velocity iterations to run, 0 means use the default that
     * was set using `numVelocitySteps` param during initialization: {@link init}. The number of
     * iterations to use is the max of all contacts and constraints in the island.
     * 
     * @defaultValue 0 // integer
     */
    get numVelocityStepsOverride() {
        return this._numVelocityStepsOverride;
    }

    /**
     * Ratio in rotation rate between engine and gear box when driving in reverse.
     * 
     * @defaultValue [-2.9] // array of floats
     */
    get reverseGearRatios() {
        return this._reverseGearRatios;
    }

    /**
     * If RPM of engine is smaller then this we will shift a gear down, only used in auto mode.
     * 
     * @defaultValue 2000 // revolutions per minute, RPM
     */
    get shiftDownRPM() {
        return this._shiftDownRPM;
    }

    /**
     * If RPM of engine is bigger then this we will shift a gear up, only used in auto mode.
     * 
     * @defaultValue 4000 // revolutions per minute, RPM
     */
    get shiftUpRPM() {
        return this._shiftUpRPM;
    }

    /**
     * How long to wait after releasing the clutch before another switch is attempted, only used in
     * auto mode.
     * 
     * @defaultValue 0.5 // seconds
     */
    get switchLatency() {
        return this._switchLatency;
    }

    /**
     * How long it takes to switch gears, only used in auto mode.
     * 
     * @defaultValue 0.5 // seconds
     */
    get switchTime() {
        return this._switchTime;
    }
    
    /**
     * An array of arrays. Each array represents a track and lists indices of wheels that are
     * inside that track. The last element in each track array will become a driven wheel (an index
     * that points to a wheel that is connected to the engine).  
     * Example with 2 tracks, and each having 4 wheels. Wheels 3 and 7 are driven wheels:
     * ```
     * [[0, 1, 2, 3], [4, 5, 6, 7]]
     * ```
     * 
     * @defaultValue []
     */
    get tracks() {
        return this._tracks;
    }

    /**
     * Vehicle type. Can be one of the following
     * ```
     * VEHICLE_TYPE_WHEEL
     * ```
     * ```
     * VEHICLE_TYPE_TRACK
     * ```
     * ```
     * VEHICLE_TYPE_MOTORCYCLE
     * ```
     * 
     * @defaultValue VEHICLE_TYPE_WHEEL // enum integer
     */
    get type() {
        return this._type;
    }

    /**
     * Vector indicating the up direction of the vehicle (in local space to the body).
     * 
     * @defaultValue Vec3(0, 1, 0)
     */
    get up() {
        return this._up;
    }

    /**
     * Angular damping factor of the wheel.
     * ```
     * dw/dt = -c * w.
     * ```
     * 
     * @defaultValue 0.2 // float
     */
    get wheelAngularDamping() {
        return this._wheelAngularDamping;
    }

    /**
     * An array of objects that describe each wheel: `[{}, {}, ...]`. The element's index in the
     * array corresponds to the wheel's index (`[wheel1, wheel2, ...]`).
     * 
     * @defaultValue []
     */
    get wheels() {
        return this._wheels;
    }

    writeVehicleData(cb) {
        const type = this._type;

        // general vehicle data
        cb.write(this._index, BUFFER_WRITE_UINT32, false);
        cb.write(type, BUFFER_WRITE_UINT8, false);
        cb.write(this._numVelocityStepsOverride, BUFFER_WRITE_UINT16, false);
        cb.write(this._numVelocityStepsOverride, BUFFER_WRITE_UINT16, false);
        cb.write(this._up, BUFFER_WRITE_VEC32, false);
        cb.write(this._forward, BUFFER_WRITE_VEC32, false);
        cb.write(this._maxPitchRollAngle, BUFFER_WRITE_FLOAT32, false);

        // engine data
        cb.write(this._maxTorque, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._minRPM, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxRPM, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._inertia, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._wheelAngularDamping, BUFFER_WRITE_FLOAT32, false);
        VehicleComponent.writeCurvePoints(cb, this._normalizedTorque);

        // transmission data
        cb.write(this._mode, BUFFER_WRITE_UINT8, false);
        cb.write(this._switchTime, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._clutchReleaseTime, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._switchLatency, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._shiftUpRPM, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._shiftDownRPM, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._clutchStrength, BUFFER_WRITE_FLOAT32, false);
        VehicleComponent.writeGears(cb, this._gearRatios);
        VehicleComponent.writeGears(cb, this._reverseGearRatios);

        // wheels data
        const isWheeled = type === VEHICLE_TYPE_WHEEL || type === VEHICLE_TYPE_MOTORCYCLE;
        if (isWheeled) {
            this._writeWheelsData(cb);
        } else {
            this._writeTracksData(cb);
        }

        if (isWheeled) {
            // differentials
            this._writeDifferentials(cb);
            cb.write(this._differentialLimitedSlipRatio, BUFFER_WRITE_FLOAT32, false);

            if (type === VEHICLE_TYPE_MOTORCYCLE) {
                cb.write(this._maxLeanAngle, BUFFER_WRITE_FLOAT32, false);
                cb.write(this._leanSpringConstant, BUFFER_WRITE_FLOAT32, false);
                cb.write(this._leanSpringDamping, BUFFER_WRITE_FLOAT32, false);
                cb.write(this._leanSpringIntegrationCoefficient, BUFFER_WRITE_FLOAT32, false);
                cb.write(this._leanSpringIntegrationCoefficientDecay, BUFFER_WRITE_FLOAT32, false);
                cb.write(this._leanSmoothingFactor, BUFFER_WRITE_FLOAT32, false);
            }
        }

        this._writeAntiRollBars(cb);

        // cast type
        const castType = this._castType;
        cb.write(castType, BUFFER_WRITE_UINT8, false);
        cb.write(this._castObjectLayer, BUFFER_WRITE_UINT32, false);
        switch (castType) {
            case VEHICLE_CAST_TYPE_RAY:
                cb.write(this._castUp, BUFFER_WRITE_VEC32, false);
                cb.write(this._castMaxSlopeAngle, BUFFER_WRITE_FLOAT32, false);
                break;
            case VEHICLE_CAST_TYPE_SPHERE:
                cb.write(this._castUp, BUFFER_WRITE_VEC32, false);
                cb.write(this._castMaxSlopeAngle, BUFFER_WRITE_FLOAT32, false);
                cb.write(this._castRadius, BUFFER_WRITE_FLOAT32, false);
                break;
            case VEHICLE_CAST_TYPE_CYLINDER:
                cb.write(this._castFraction, BUFFER_WRITE_FLOAT32, false);
                break;
        }
    }

    // Any type:
    //      input0 - Value between -1 and 1 for auto transmission and value between 0 and 1 indicating 
    //              desired driving direction and amount the gas pedal is pressed
    // Wheeled:
    //      input1 - Value between -1 and 1 indicating desired steering angle (1 = right)
    //      input2 - Value between 0 and 1 indicating how strong the brake pedal is pressed
    //      input3 - Value between 0 and 1 indicating how strong the hand brake is pulled
    // Tracked:
    //      input1 - Value between -1 and 1 indicating an extra multiplier to the rotation rate of the left track (used for steering)
    //      input2 - Value between -1 and 1 indicating an extra multiplier to the rotation rate of the right track (used for steering)
    //      input3 - Value between 0 and 1 indicating how strong the brake pedal is pressed
    setDriverInput(input0, input1, input2, input3) {
        if (DEBUG) {
            let ok = Debug.checkRange(input0, -1, 1, `Invalid driver input for forward (input0). Expected a number in [-1:1] range. Received: ${ input0 }`);
            if (this._type === VEHICLE_TYPE_WHEEL || this._type === VEHICLE_TYPE_MOTORCYCLE) {
                ok = ok && Debug.checkRange(input1, -1, 1, `Invalid driver input for right (input1). Expected a number in [-1:1] range. Received: ${ input1 }`);
                ok = ok && Debug.checkRange(input2, 0, 1, `Invalid driver input for brake (input2). Expected a number in [0:1] range. Received: ${ input2 }`);
                ok = ok && Debug.checkRange(input3, 0, 1, `Invalid driver input for hand brake (input3). Expected a number in [0:1] range. Received: ${ input3 }`);
            } else {
                ok = ok && Debug.checkRange(input1, -1, 1, `Invalid driver input for left ratio (input1). Expected a number in [-1:1] range. Received: ${ input1 }`);
                ok = ok && Debug.checkRange(input2, -1, 1, `Invalid driver input for right ratio (input2). Expected a number in [-1:1] range. Received: ${ input2 }`);
                ok = ok && Debug.checkRange(input3, 0, 1, `Invalid driver input for brake (input3). Expected a number in [0:1] range. Received: ${ input3 }`);
            }
            if (!ok)
                return;
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_DRIVER_INPUT, this._index,
            input0, BUFFER_WRITE_FLOAT32, false,
            input1, BUFFER_WRITE_FLOAT32, false,
            input2, BUFFER_WRITE_FLOAT32, false,
            input3, BUFFER_WRITE_FLOAT32, false
        );
    }

    onEnable() {
        const system = this.system;

        this._index = system.getIndex(this.entity);

        system.createVehicle(this);
    }

    _writeTracksData(cb) {
        const tracks = this._tracks;
        const count = tracks.length;

        if (DEBUG && count === 0) {
            Debug.warn('Invalid tracks data. Need at least one track.', tracks);
            return;
        }

        this._writeWheelsData(cb);

        cb.write(count, BUFFER_WRITE_UINT32, false);
        
        for (let t = 0; t < count; t++) {
            const track = tracks[t];
            const wheelsCount = track.length;

            cb.write(wheelsCount, BUFFER_WRITE_UINT32, false);

            for (let i = 0; i < wheelsCount; i++) {
                cb.write(track[i], BUFFER_WRITE_UINT32, false);
            }
        }
    }

    _writeWheelsData(cb) {
        const wheels = this._wheels;
        const count = wheels.length;

        // TODO
        // consider making wheel as its own component

        cb.write(count, BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < count; i++) {
            const desc = wheels[i];

            if (DEBUG) {
                let ok = Debug.assert(desc.position, 
                    'A wheel description requires an attachment position of wheel' +
                    'suspension in local space of the vehicle', desc);
                const spring = desc.spring;
                if (spring) {
                    const { stiffness, frequency } = spring;
                    if (stiffness != null) {
                        Debug.assert(stiffness !== 0, 'Wheel spring stiffness cannot be zero', spring);
                    }
                    if (frequency != null) {
                        Debug.assert(frequency !== 0, 'Wheel spring frequency cannot be zero', spring);
                    }
                }
                if (!ok)
                    return;
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
            cb.write(desc.suspensionForcePoint || pc.Vec3.ZERO, BUFFER_WRITE_VEC32, false);

            // Direction of the suspension in local space of the body, should point down.
            cb.write(desc.suspensionDirection || pc.Vec3.DOWN, BUFFER_WRITE_VEC32, false);

            // Direction of the steering axis in local space of the body, should point up (e.g. for a 
            // bike would be -suspensionDirection)
            cb.write(desc.steeringAxis || pc.Vec3.UP, BUFFER_WRITE_VEC32, false);

            // Up direction when the wheel is in the neutral steering position (usually 
            // component.up but can be used to give the wheel camber or for a bike would be -suspensionDirection)
            cb.write(desc.wheelUp || pc.Vec3.UP, BUFFER_WRITE_VEC32, false);

            // Forward direction when the wheel is in the neutral steering position (usually 
            // component.forward but can be used to give the wheel toe, does not need to be perpendicular
            // to wheelUp)
            cb.write(desc.wheelForward || pc.Vec3.BACK, BUFFER_WRITE_VEC32, false);

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
            cb.write(spring.mode ?? pc.JOLT_SPRING_MODE_FREQUENCY, BUFFER_WRITE_UINT8, false);
            cb.write(spring.frequency ?? 1.5, BUFFER_WRITE_FLOAT32, false);
            cb.write(spring.stiffness ?? 1.5, BUFFER_WRITE_FLOAT32, false);
            cb.write(spring.damping ?? 0.5, BUFFER_WRITE_FLOAT32, false);

            // Friction in forward direction of tire as a function of the slip ratio (fraction):
            // (omega_wheel * r_wheel - v_longitudinal) / |v_longitudinal|.
            // Slip ratio here is a ratio of wheel spinning relative to the floor. At 0 the wheel has full
            // traction and is rolling perfectly in sync with the ground. At 1 the wheel is locked and
            // is sliding over the ground.
            // Default curve keys: [[0, 0], [0.06, 1.2], [0.2, 1]]
            VehicleComponent.writeCurvePoints(cb, desc.longitudinalFrictionCurve);

            // Friction in sideway direction of tire as a function of the slip angle (degrees):
            // angle between relative contact velocity and vehicle direction.
            // If tire forward matches the vehicle direction, then the angle is 0 degrees. If the 
            // vehicle is sliding sideways, e.g. on ice, then the angle is 90 degrees. Example curve keys could
            // be: [[0, 1], [90, 0.3]] - full friction at zero degrees, and 0.3 friction at 90.
            // Default curve keys: [[0, 0], [3, 1.2], [20, 1]]
            VehicleComponent.writeCurvePoints(cb, desc.lateralFrictionCurve);

            const type = this._type;
            if (type === VEHICLE_TYPE_WHEEL || type === VEHICLE_TYPE_MOTORCYCLE) {

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
    }

    _writeDifferentials(cb) {
        const differentials = this._differentials;
        const count = differentials.length;

        if (DEBUG && count === 0) {
            Debug.warnOnce('Vehicle component is missing wheels differentials.' +
                'Default values will make a vehicle without wheels.');
        }

        cb.write(count, BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < count; i++) {
            const diff = differentials[i];

            // Index (in mWheels) that represents the left wheel of this 
            // differential (can be -1 to indicate no wheel)
            cb.write(diff.leftWheel ?? -1, BUFFER_WRITE_INT32, false);

            // Same as leftWheel, but for the right one.
            cb.write(diff.rightWheel ?? -1, BUFFER_WRITE_INT32, false);

            // Ratio between rotation speed of gear box and wheels.
            cb.write(diff.differentialRatio ?? 3.42, BUFFER_WRITE_FLOAT32, false);

            // Defines how the engine torque is split across the left and right 
            // wheel (0 = left, 0.5 = center, 1 = right)
            cb.write(diff.leftRightSplit ?? 0.5, BUFFER_WRITE_FLOAT32, false);

            // Ratio max / min wheel speed. When this ratio is exceeded, all
            // torque gets distributed to the slowest moving wheel. This allows
            // implementing a limited slip differential. Set to Number.MAX_VALUE
            // for an open differential. Value should be > 1.
            cb.write(diff.limitedSlipRatio ?? 1.4, BUFFER_WRITE_FLOAT32, false);

            // How much of the engines torque is applied to this differential
            // (0 = none, 1 = full), make sure the sum of all differentials is 1.
            cb.write(diff.engineTorqueRatio ?? 1, BUFFER_WRITE_FLOAT32, false);
        }
    }

    _writeAntiRollBars(cb) {
        const bars = this._antiRollBars;
        const count = bars.length;

        cb.write(count, BUFFER_WRITE_UINT32, false);

        for (let i = 0; i < count; i++) {
            const bar = bars[i];

            // Index (in wheels) that represents the left wheel of this anti-rollbar.
            cb.write(bar.leftWheel ?? 0, BUFFER_WRITE_UINT32, false);

            // Index (in wheels) that represents the right wheel of this anti-rollbar.
            cb.write(bar.rightWheel ?? 1, BUFFER_WRITE_UINT32, false);

            // Stiffness (spring constant in N/m) of anti rollbar, can be 0 to disable the anti-rollbar.
            cb.write(bar.stiffness ?? 1000, BUFFER_WRITE_FLOAT32, false);
        }
    }

    static writeCurvePoints(cb, curve) {
        cb.write(!!curve, BUFFER_WRITE_BOOL, false);

        if (curve) {
            const keys = curve.keys;
            const count = keys.length;

            cb.write(count, BUFFER_WRITE_UINT32, false);

            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];

                cb.write(key[0], BUFFER_WRITE_FLOAT32, false);
                cb.write(key[1], BUFFER_WRITE_FLOAT32, false);
            }
        }
    }

    static writeGears(cb, gears) {
        const count = gears.length;
        cb.write(count, BUFFER_WRITE_UINT32, false);
        for (let i = 0; i < count; i++) {
            cb.write(gears[i], BUFFER_WRITE_FLOAT32, false);
        }
    }    
}

export { VehicleComponent };


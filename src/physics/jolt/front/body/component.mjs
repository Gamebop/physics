import { Asset, Quat, Vec3 } from 'playcanvas';
import { Debug } from '../../debug.mjs';
import { ShapeComponent } from '../shape/component.mjs';
import {
    DOF_ALL, BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT32, BUFFER_WRITE_UINT8,
    BUFFER_WRITE_VEC32, CMD_ADD_FORCE, CMD_ADD_IMPULSE, CMD_APPLY_BUOYANCY_IMPULSE,
    CMD_DESTROY_BODY, CMD_MOVE_BODY, CMD_MOVE_KINEMATIC, CMD_RESET_VELOCITIES, CMD_SET_ANG_VEL,
    CMD_SET_DOF, CMD_SET_GRAVITY_FACTOR, CMD_SET_LIN_VEL, CMD_SET_MOTION_QUALITY,
    CMD_SET_MOTION_TYPE, CMD_SET_OBJ_LAYER, CMD_USE_MOTION_STATE, MOTION_QUALITY_DISCRETE,
    MOTION_TYPE_DYNAMIC, MOTION_TYPE_KINEMATIC, MOTION_TYPE_STATIC, OBJ_LAYER_NON_MOVING,
    OMP_CALCULATE_MASS_AND_INERTIA, OMP_MASS_AND_INERTIA_PROVIDED, OPERATOR_CLEANER,
    OPERATOR_MODIFIER, SHAPE_CONVEX_HULL, SHAPE_HEIGHTFIELD, SHAPE_MESH, CMD_SET_AUTO_UPDATE_ISOMETRY,
    CMD_SET_ALLOW_SLEEPING, CMD_SET_ANG_FACTOR, BUFFER_WRITE_INT32, CMD_SET_COL_GROUP, CMD_SET_FRICTION, CMD_SET_IS_SENSOR
} from '../../constants.mjs';

const vec3 = new Vec3();

/**
 * Body Component description.
 *
 * @category Body Component
 */
class BodyComponent extends ShapeComponent {
    // ---- BODY PROPS ----

    _angularVelocity = new Vec3();

    _allowedDOFs = DOF_ALL;

    _allowDynamicOrKinematic = false;

    _allowSleeping = true;

    _angularDamping = 0;

    _autoUpdateIsometry = true;

    _collisionGroup = -1;

    _friction = 0.2;

    _gravityFactor = 1;

    _inertiaMultiplier = 1;

    _isSensor = false;

    _linearDamping = 0;

    _linearVelocity = new Vec3();

    _maxAngularVelocity = 47.12388980384689;

    _maxLinearVelocity = 500;

    _motionQuality = MOTION_QUALITY_DISCRETE;

    _motionType = MOTION_TYPE_STATIC;

    _objectLayer = OBJ_LAYER_NON_MOVING;

    _overrideInertiaPosition = new Vec3();

    _overrideInertiaRotation = new Quat();

    _overrideMass = 1;

    _overrideMassProperties = OMP_CALCULATE_MASS_AND_INERTIA;

    _position = new Vec3();

    _rotation = new Quat();

    _restitution = 0;

    _subGroup = -1;

    _useMotionState = true;

    /**
     * When this body is created as `MOTION_TYPE_STATIC`, this setting tells Jolt system to create
     * a `MotionProperties` object internally, so that the object can be switched to kinematic or
     * dynamic. Use `false`, if you don't intend to switch the type of this body from static. This
     * is a performance optimization.
     *
     * @returns {boolean} Allow/Disallow a static body to be switched to kinematic/dynamic.
     * @defaultValue false
     */
    get allowDynamicOrKinematic() {
        return this._allowDynamicOrKinematic;
    }

    /**
     * Changes the allowed degrees of freedom. You can use a combination of following bits:
     * ```
     * DOF_TRANSLATION_X
     * ```
     * ```
     * DOF_TRANSLATION_Y
     * ```
     * ```
     * DOF_TRANSLATION_Z
     * ```
     * ```
     * DOF_ROTATION_X
     * ```
     * ```
     * DOF_ROTATION_Y
     * ```
     * ```
     * DOF_ROTATION_Z
     * ```
     * ```
     * DOF_ALL
     * ```
     * @example
     * ```javascript
     * // lock translation to X and Z axis and rotation to Y axis
     * entity.body.allowedDOFs = DOF_TRANSLATION_X | DOF_TRANSLATION_Z | DOF_ROTATION_Y;
     * ```
     *
     * @param {number} degree - Constant number, representing a degree of freedom.
     */
    set allowedDOFs(degree) {
        if (this._allowedDOFs === degree) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkInt(degree, `Invalid degree of freedom: ${degree}`);
            if (!ok) {
                return;
            }
        }

        this._allowedDOFs = degree;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_DOF, this._index,
            degree, BUFFER_WRITE_UINT8, false
        );
    }

    /**
     * Which degrees of freedom this body has (can be used to limit simulation to 2D).
     * For example, using `DOF_TRANSLATION_X` restricts a body to move in world space X axis.
     *
     * @returns {number} Bit number, representing the degrees of freedom.
     * @defaultValue DOF_ALL
     */
    get allowedDOFs() {
        return this._allowedDOFs;
    }

    /**
     * Specifies, whether a body can go to sleep or not.
     * - `true`: allow sleeping
     * - `false`: do not allow to go sleep
     *
     * @param {boolean} bool - Boolean, telling if a body may go to sleep
     */
    set allowSleeping(bool) {
        if (this._allowSleeping === bool) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkBool(bool, `Invalid allow sleeping bool: ${bool}`);
            if (!ok) {
                return;
            }
        }

        this._allowSleeping = bool;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_ALLOW_SLEEPING, this._index,
            bool, BUFFER_WRITE_BOOL, false
        );
    }

    /**
     * Specifies if this body go to sleep or not.
     *
     * @returns {boolean} Boolean, telling if a body can go to sleep.
     * @defaultValue true
     */
    get allowSleeping() {
        return this._allowSleeping;
    }

    /**
     * Sets angular damping factor. The formula used:
     * ```
     * dw/dt = -factor * w
     * ```
     * `factor` must be between `0` and `1` but is usually close to `0`.
     *
     * @param {number} factor - Factor number.
     */
    set angularDamping(factor) {
        if (this._angularDamping === factor) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkFloat(factor, `Invalid angular factor float: ${factor}`);
            if (!ok) {
                return;
            }
        }

        this._angularDamping = factor;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_ANG_FACTOR, this._index,
            factor, BUFFER_WRITE_BOOL, false
        );
    }

    /**
     * Tells how quickly a body loses angular velocity.
     *
     * @returns {number} Number, representing angular damping.
     * @defaultValue 0
     */
    get angularDamping() {
        return this._angularDamping;
    }

    /**
     * @param {Vec3} velocity - Angular velocity Vec3 (rad/s per axis) to set this body to.
     */
    set angularVelocity(velocity) {        
        if ($_DEBUG) {
            const ok = Debug.checkVec(velocity, `Invalid angular velocity vector`);
            if (!ok) return;
        }

        if (this._angularVelocity.equals(velocity)) {
            return;
        }
        
        this._angularVelocity.copy(velocity);
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_ANG_VEL, this._index,
            velocity, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * World space angular velocity.
     *
     * @returns {Vec3} Vec3, containing the current angular velocity of this body.
     * @defaultValue Vec3(0, 0, 0) (rad/s)
     */
    get angularVelocity() {
        return this._angularVelocity;
    }

    /**
     * Changes the isometry update method:
     * - `true`: framework will synchronize entity position/rotation in visual world with a
     * physical body in physics world automatically.
     * - `false`: framework expects a user to do it manually.
     *
     * If `false` is set, then physics will no longer auto-update entity/body position/rotation.
     * - Backend will not tell frontend where dynamic body is.
     * - Frontend will not tell backend where kinematic body is.
     * - This setting has no effect on a static body.
     *
     * This is useful, for example, when you have many kinematic objects and you rarely change
     * their isometry. In some cases this is also useful for dynamic bodies, e.g. when their
     * gravity factor is set to zero, and you use {@link moveKinematic} to translate it manually.
     *
     * @example
     * ```js
     * entity.addComponent('body', {
     *     motionType: MOTION_TYPE_KINEMATIC,
     *     objectLayer: OBJ_LAYER_MOVING,
     *     autoUpdateIsometry: false
     * });
     *
     * // then on frame update, or when needed, move both - body and entity
     * entity.setPosition(newPosition);
     * entity.body.teleport(newPosition);
     * // or any of the body movement methods, e.g.
     * // entity.body.moveKinematic(newPosition, Quat.IDENTITY, time);
     * ```
     */
    set autoUpdateIsometry(bool) {
        if ($_DEBUG) {
            const ok = Debug.checkBool(bool, `Invalid manual isometry update state boolean`);
            if (!ok) return;
        }

        if (this._autoUpdateIsometry === bool) {
            return;
        }

        this._autoUpdateIsometry = bool;

        const type = this._motionType;
        if (bool && type === MOTION_TYPE_DYNAMIC || type === MOTION_TYPE_KINEMATIC) {
            this._isometryEvent = this.system.on('write-isometry', this.writeIsometry, this);
        } else {
            this._isometryEvent?.off();
            this._isometryEvent = null;
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_AUTO_UPDATE_ISOMETRY, this._index,
            bool, BUFFER_WRITE_BOOL, false
        );
    }

    /**
     * Returns a boolean, telling if the position and rotation of this body is updated
     * automatically.
     *
     * @returns {boolean} - Boolean, telling the isometry update state.
     * @defaultValue false
     */
    get autoUpdateIsometry() {
        return this._autoUpdateIsometry;
    }

    /**
     * The collision group this body belongs to (determines if two objects can collide).
     * Expensive, so disabled by default. Prefer to use broadphase and object layers instead for
     * filtering.
     *
     * @returns {number} returns a number, representing a collision group this body belongs to. If
     * no group is set, returns `-1`;
     * @defaultValue -1 (disabled)
     */
    get collisionGroup() {
        return this._collisionGroup;
    }

    /**
     * Sets friction. Dimensionless number, usually between `0` and `1`:
     * - `0`: no friction
     * - `1`: friction force equals force that presses the two bodies together
     *
     * Note: bodies can have negative friction, but the combined friction should never go below
     * zero.
     *
     * @param {number} friction - Friction scalar.
     */
    set friction(friction) {
        if (this._friction === friction) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkFloat(friction, `Invalid friction scalar: ${friction}`);
            if (!ok) {
                return;
            }
        }

        this._friction = friction;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_FRICTION, this._index,
            friction, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * Friction of the body.
     *
     * @returns {number} Number, representing friction factor.
     * @defaultValue 0.2
     */
    get friction() {
        return this._friction;
    }

    /**
     * Changes the gravity factor of a body.
     *
     * @param {number} factor - Gravity factor to multiply.
     */
    set gravityFactor(factor) {
        if (this._gravityFactor === factor) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkFloat(factor, `Invalid gravity factor: ${factor}`);
            if (!ok) {
                return;
            }
        }

        this._gravityFactor = factor;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_GRAVITY_FACTOR, this._index,
            factor, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * Value to multiply gravity with for this body.
     *
     * @returns {number} Number, representing the gravity factor affecting this body.
     * @defaultValue 1
     */
    get gravityFactor() {
        return this._gravityFactor;
    }

    /**
     * When calculating the inertia the calculated inertia will be multiplied by this value. This
     * factor is ignored when {@link overrideMassProperties} is set to
     * `OMP_MASS_AND_INERTIA_PROVIDED` - you are expected to calculate inertia yourself in that
     * case.
     * Cannot be changed after a body is created.
     *
     * @returns {number} Number, representing inertia factor.
     * @defaultValue 1
     */
    get inertiaMultiplier() {
        return this._inertiaMultiplier;
    }

    /**
     * Specifies if the body is a sensor or not.
     * - `true`: changes a body into a sensor
     * - `false`: changes a body into a rigid body
     *
     * @param {boolean} bool - Boolean, telling if this body is a sensor.
     */
    set isSensor(bool) {
        if (this._isSensor === bool) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkBool(bool, `Invalid isSensor bool: ${bool}`);
            if (!ok) {
                return;
            }
        }

        this._isSensor = bool;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_IS_SENSOR, this._index,
            bool, BUFFER_WRITE_BOOL, false
        );
    }

    /**
     * If this body is a sensor. A sensor will receive collision callbacks, but will not
     * cause any collision responses and can be used as a trigger volume.
     *
     * @returns {boolean} Boolean, telling if this body is a sensor.
     * @defaultValue false
     */
    get isSensor() {
        return this._isSensor;
    }

    /**
     * Specifies how quickly the body loses linear velocity. Uses formula:
     * ```
     * dv/dt = -c * v.
     * ```
     * `c` must be between 0 and 1 but is usually close to 0.
     *
     * @returns {number} Number, representing a linear damping factor.
     * @defaultValue 0
     */
    get linearDamping() {
        return this._linearDamping;
    }

    /**
     * @param {Vec3} velocity - Linear velocity Vec3 (m/s per axis) to set this body to.
     */
    set linearVelocity(velocity) {
        if ($_DEBUG) {
            const ok = Debug.checkVec(velocity, `Invalid linear velocity vector`);
            if (!ok) return;
        }

        if (this._linearVelocity.equals(velocity)) {
            return;
        }
        
        this._linearVelocity.copy(velocity);
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_LIN_VEL, this._index,
            velocity, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * World space linear velocity of the center of mass of this body.
     *
     * @returns {Vec3} Vec3, representing the current linear velocity of this body.
     * @defaultValue Vec3(0, 0, 0) (m/s)
     */
    get linearVelocity() {
        return this._linearVelocity;
    }

    /**
     * Maximum angular velocity that this body can reach.
     *
     * @returns {number} Number, representing maximum angular velocity this body can reach.
     * @defaultValue 47.12388980384689 (0.25 * PI * 60.0, rad/s)
     */
    get maxAngularVelocity() {
        return this._maxAngularVelocity;
    }

    /**
     * Maximum linear velocity that this body can reach.
     *
     * @returns {number} Number, representing maximum linear velocity this body can reach.
     * @defaultValue 500 (m/s)
     */
    get maxLinearVelocity() {
        return this._maxLinearVelocity;
    }

    /**
     * Changes the body motion quality. Following constants available:
     * ```
     * MOTION_QUALITY_DISCRETE
     * ```
     * ```
     * MOTION_QUALITY_LINEAR_CAST
     * ```
     *
     * Use linear cast (CCD) for fast moving objects, in other cases prefer discrete one since it
     * is cheaper.
     *
     * @param {number} quality - Quality constant.
     */
    set motionQuality(quality) {
        if (this._motionQuality === quality) {
            return;
        }

        if ($_DEBUG) {
            Debug.checkUint(quality, `Invalid motion quality: ${quality}`);
        }

        this._motionQuality = quality;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_MOTION_QUALITY, this._index,
            quality, BUFFER_WRITE_UINT8, false
        );
    }

    /**
     * Motion quality, or how well it detects collisions when it has a high velocity.
     *
     * @returns {number} Constant number, representing the collision detection algorithm for this body.
     * @defaultValue MOTION_QUALITY_DISCRETE
     */
    get motionQuality() {
        return this._motionQuality;
    }

    /**
     * @param {number} type - Number, representing motion quality constant.
     */
    set motionType(type) {
        if (this._motionType === type) {
            return;
        }

        if ($_DEBUG) {
            Debug.checkUint(type, `Invalid motion type: ${type}`);
        }

        this._motionType = type;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_MOTION_TYPE, this._index,
            type, BUFFER_WRITE_UINT8, false
        );
    }

    /**
     * Motion type, determines if the object is static, dynamic or kinematic. You can use the
     * following constants:
     * ```
     * MOTION_TYPE_STATIC
     * ```
     * ```
     * MOTION_TYPE_DYNAMIC
     * ```
     * ```
     * MOTION_TYPE_KINEMATIC
     * ```
     *
     * @returns {number} Number, representing motion type of this body.
     * @defaultValue MOTION_TYPE_STATIC
     */
    get motionType() {
        return this._motionType;
    }

    /**
     * Changes the object layer that this body belongs to. Allows cheap filtering. Following
     * default aliases available:
     * ```
     * OBJ_LAYER_NON_MOVING
     * ```
     * ```
     * OBJ_LAYER_MOVING
     * ```
     * Where:
     * - `OBJ_LAYER_NON_MOVING` = 0
     * - `OBJ_LAYER_MOVING` = 1
     *
     * @param {number} layerNumber - Layer number.
     */
    set objectLayer(layerNumber) {
        if (this._objectLayer === layerNumber) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkInt(layerNumber, `Invalid layer number: ${layerNumber}`);
            if (!ok) {
                return;
            }
        }

        this._objectLayer = layerNumber;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_OBJ_LAYER, this._index,
            layerNumber, BUFFER_WRITE_UINT32, false
        );
    }

    /**
     * The collision layer this body belongs to (determines if two objects can collide).
     *
     * @returns {number} Number, representing the object layer this body belongs to.
     * @defaultValue OBJ_LAYER_NON_MOVING
     */
    get objectLayer() {
        return this._objectLayer;
    }

    /**
     * Used only if `OMP_MASS_AND_INERTIA_PROVIDED` is selected for {@link overrideMassProperties}.
     * Backend will create inertia matrix from the given position.
     *
     * @returns {Vec3} Vec3 with position that is used for this body inertia calculation.
     * @defaultValue Vec3(0, 0, 0) (m)
     */
    get overrideInertiaPosition() {
        return this._overrideInertiaPosition;
    }

    /**
     * Used only if `OMP_MASS_AND_INERTIA_PROVIDED` is selected for {@link overrideMassProperties}.
     * Backend will create inertia matrix from the given rotation.
     *
     * @returns {Quat} Quat with rotation that is used for this body inertia calculation.
     * @defaultValue Quat(0, 0, 0, 1)
     */
    get overrideInertiaRotation() {
        return this._overrideInertiaRotation;
    }

    /**
     * Used only if `OMP_CALCULATE_INERTIA` or `OMP_MASS_AND_INERTIA_PROVIDED` is selected for
     * {@link overrideMassProperties}.
     *
     * @returns {number} Number, representing the mass of this body, when the mass is not
     * calculated automatically.
     * @defaultValue 1 (kg)
     */
    get overrideMass() {
        return this._overrideMass;
    }

    /**
     * Determines how a body mass and inertia is calculated. By default it uses
     * `OMP_CALCULATE_MASS_AND_INERTIA`, which tells Jolt to auto-calculate those based the collider
     * shape. You can use following constants:
     * ```
     * OMP_CALCULATE_INERTIA
     * ```
     * ```
     * OMP_CALCULATE_MASS_AND_INERTIA
     * ```
     * ```
     * OMP_MASS_AND_INERTIA_PROVIDED
     * ```
     * If you select `OMP_CALCULATE_INERTIA`, you must also specify {@link overrideMass}.
     * The inertia will be automatically calculated for you.
     *
     * If you select `OMP_MASS_AND_INERTIA_PROVIDED`, you must also specify {@link overrideMass},
     * {@link overrideInertiaPosition} and {@link overrideInertiaRotation}.
     *
     * Cannot be changed after the body is created.
     *
     * @returns {number} Number, representing the mass calculation method constant.
     * @defaultValue OMP_CALCULATE_MASS_AND_INERTIA (calculates automatically)
     */
    get overrideMassProperties() {
        return this._overrideMassProperties;
    }

    /**
     * Read-only. Current position of the body (not of the center of mass).
     *
     * @returns {Vec3} Vec3 with the current position of this body.
     * @defaultValue Vec3(0, 0, 0) (m per axis)
     */
    get position() {
        return this._position;
    }

    /**
     * Read-only. Current rotation of the body.
     *
     * @returns {Quat} Quat, representing the current rotation of this body.
     * @defaultValue Quat(0, 0, 0, 1) (identity rotation)
     */
    get rotation() {
        return this._rotation;
    }

    /**
     * Restitution of the body. Dimensionless number, usually between 0 and 1:
     * - `0`: completely inelastic collision response
     * - `1`: completely elastic collision response
     *
     * Note: bodies can have negative restitution but the combined restitution should never go
     * below zero.
     *
     * @returns {number} Number, representing restitution factor for this body.
     */
    get restitution() {
        return this._restitution;
    }

    /**
     * The collision sub group  this body belongs to (determines if two objects can collide).
     * Expensive, so disabled by default. Prefer to use broadphase and object layers instead for
     * filtering.
     *
     * @returns {number} If set, will return a number, representing the sub group this body belongs
     * to. Otherwise, will return `-1`;
     * @defaultValue -1 (disabled)
     */
    get subGroup() {
        return this._subGroup;
    }

    /**
     * Enables/Disables a motion state for this body.
     *
     * @param {boolean} bool - Boolean to enable/disable the motion state.
     */
    set useMotionState(bool) {
        if ($_DEBUG) {
            const ok = Debug.checkBool(bool, `Invalid bool value for useMotionState property: ${bool}`);
            if (!ok)
                return;
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_USE_MOTION_STATE, this._index,
            bool, BUFFER_WRITE_BOOL, false
        );
    }

    /**
     * A motion state for this body. Not used by static bodies.
     *
     * If the physcs fixed timestep is set lower than the client's browser refresh rate, then
     * browser will have multiple frame updates per single physics simulation step. If you enable
     * motion state for this entity, then the position and rotation will be interpolated, otherwise
     * the entity will visually move only after physics completes a step.
     *
     * For example, say browser refreshes every 0.1 seconds, and physics step once a second.
     * Without using motion state an entity position will update once every second, when physics
     * update takes place. With motion state enabled, it will update the position/rotation every
     * 0.1 seconds - once a true update (from physics) and 9 times interpolated. This will give a
     * smooth motion of the entity, without having to do expensive physics simulation step every
     * frame.
     *
     * @returns {boolean} Boolean, telling if motion state is enabled for this body.
     * @defaultValue true
     */
    get useMotionState() {
        return this._useMotionState;
    }

    /**
     * Adds a force (unit: N) at an offset to this body for the next physics time step. Will reset
     * after the physics completes a step.
     *
     * @param {Vec3} force - Force to add to body.
     * @param {Vec3} [offset] - Offset from the body center where the force is added.
     * @param {boolean} [isOffsetLocal] - Specifies if offset is in world or local space.
     */
    addForce(force, offset = Vec3.ZERO, isOffsetLocal = false) {
        if ($_DEBUG) {
            let ok = Debug.checkVec(force, `Invalid add force vector`);
            ok = ok && Debug.checkVec(offset, `Invalid add force offset`);
            if (!ok) {
                return;
            }
        }

        vec3.copy(offset);

        if (isOffsetLocal) {
            this._localToWorld(vec3);
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            force, BUFFER_WRITE_VEC32, false,
            vec3, BUFFER_WRITE_VEC32, true
        );
    }

    /**
     * Same as {@link addForce}, but accepts scalars, instead of vectors.
     *
     * @param {number} forceX - Force scalar value on X axis.
     * @param {number} forceY - Force scalar value on Y axis.
     * @param {number} forceZ - Force scalar value on Z axis.
     * @param {number} [offsetX] - Force scalar offset on X axis.
     * @param {number} [offsetY] - Force scalar offset on Y axis.
     * @param {number} [offsetZ] - Force scalar offset on Z axis.
     * @param {number} [isOffsetLocal] - Specifies if offset is in world or local space.
     */
    addForceScalars(forceX, forceY, forceZ, offsetX = 0, offsetY = 0, offsetZ = 0, isOffsetLocal = false) {
        if ($_DEBUG) {
            let ok = Debug.checkFloat(forceX, `Invalid add impulse X component: ${forceX}`);
            ok = ok && Debug.checkFloat(forceY, `Invalid add impulse Y component: ${forceY}`);
            ok = ok && Debug.checkFloat(forceZ, `Invalid add impulse Z component: ${forceZ}`);
            ok = ok && Debug.checkFloat(offsetX, `Invalid add impulse offset X component: ${offsetX}`);
            ok = ok && Debug.checkFloat(offsetY, `Invalid add impulse offset Y component: ${offsetY}`);
            ok = ok && Debug.checkFloat(offsetZ, `Invalid add impulse offset Z component: ${offsetZ}`);
            if (!ok) {
                return;
            }
        }

        vec3.set(offsetX, offsetY, offsetZ);

        if (isOffsetLocal) {
            this._localToWorld(vec3);
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            forceX, BUFFER_WRITE_FLOAT32, false,
            forceY, BUFFER_WRITE_FLOAT32, false,
            forceZ, BUFFER_WRITE_FLOAT32, false,
            vec3, BUFFER_WRITE_VEC32, true
        );
    }

    /**
     * Adds an impulse to the center of mass of the body (unit: kg m/s).
     *
     * @param {Vec3} impulse - Impulse to add to body.
     * @param {Vec3} [offset] - Offset from the body center where the impulse is added.
     * @param {boolean} [isOffsetLocal] - Specifies if offset is in world or local space.
     */
    addImpulse(impulse, offset = Vec3.ZERO, isOffsetLocal = false) {
        if ($_DEBUG) {
            let ok = Debug.checkVec(impulse, `Invalid add impulse vector:`);
            ok = ok && Debug.checkVec(offset, `Invalid add impulse offset:`);
            if (!ok) {
                return;
            }
        }

        vec3.copy(offset);

        if (isOffsetLocal) {
            this._localToWorld(vec3);
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_IMPULSE, this._index,
            impulse, BUFFER_WRITE_VEC32, false,
            vec3, BUFFER_WRITE_VEC32, true
        );
    }

    /**
     * Same as {@link addImpulse}, but accepts scalars, instead of vectors.
     *
     * @param {number} impulseX - Impulse scalar value on X axis.
     * @param {number} impulseY - Impulse scalar value on Y axis.
     * @param {number} impulseZ - Impulse scalar value on Z axis.
     * @param {number} [offsetX] - Impulse scalar offset on X axis.
     * @param {number} [offsetY] - Impulse scalar offset on Y axis.
     * @param {number} [offsetZ] - Impulse scalar offset on Z axis.
     * @param {number} [isOffsetLocal] - Specifies if offset is in world or local space.
     */
    addImpulseScalars(impulseX, impulseY, impulseZ, offsetX = 0, offsetY = 0, offsetZ = 0, isOffsetLocal = false) {
        if ($_DEBUG) {
            let ok = Debug.checkFloat(impulseX, `Invalid add impulse X component: ${impulseX}`);
            ok = ok && Debug.checkFloat(impulseY, `Invalid add impulse Y component: ${impulseY}`);
            ok = ok && Debug.checkFloat(impulseZ, `Invalid add impulse Z component: ${impulseZ}`);
            ok = ok && Debug.checkFloat(offsetX, `Invalid add impulse offset X component: ${offsetX}`);
            ok = ok && Debug.checkFloat(offsetY, `Invalid add impulse offset Y component: ${offsetY}`);
            ok = ok && Debug.checkFloat(offsetZ, `Invalid add impulse offset Z component: ${offsetZ}`);
            if (!ok) {
                return;
            }
        }

        vec3.set(offsetX, offsetY, offsetZ);

        if (isOffsetLocal) {
            this._localToWorld(vec3);
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            impulseX, BUFFER_WRITE_FLOAT32, false,
            impulseY, BUFFER_WRITE_FLOAT32, false,
            impulseZ, BUFFER_WRITE_FLOAT32, false,
            vec3, BUFFER_WRITE_VEC32, true
        );
    }

    /**
     * Applies an impulse to the body that simulates fluid buoyancy and drag.
     *
     * @param {Vec3} waterSurfacePosition - Position of the fluid surface in world space.
     * @param {Vec3} surfaceNormal - Normal of the fluid surface (should point up).
     * @param {number} buoyancy - The buoyancy factor for the body:
     * - `= 1`: neutral body
     * - `< 1`: sinks
     * - `> 1`: floats
     * @param {number} linearDrag - Linear drag factor that slows down the body when in the fluid
     * (approx. `0.5`).
     * @param {number} angularDrag - Angular drag factor that slows down rotation when the body is
     * in the fluid (approx. `0.01`).
     * @param {Vec3} fluidVelocity - The average velocity of the fluid (in m/s) in which the body
     * resides.
     */
    applyBuoyancyImpulse(waterSurfacePosition, surfaceNormal, buoyancy, linearDrag, angularDrag, fluidVelocity) {
        if ($_DEBUG) {
            let ok = true;
            ok = ok && Debug.checkVec(waterSurfacePosition, `Invalid water surface position vector`);
            ok = ok && Debug.checkVec(surfaceNormal, `Invalid surface normal`);
            ok = ok && Debug.checkFloat(buoyancy, `Invalid buoyancy scalar: ${buoyancy}`);
            ok = ok && Debug.checkFloat(linearDrag, `Invalid linear drag scalar: ${linearDrag}`);
            ok = ok && Debug.checkFloat(angularDrag, `Invalid angular drag scalar: ${angularDrag}`);
            ok = ok && Debug.checkVec(fluidVelocity, `Invalid fluid velocity vector`);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_APPLY_BUOYANCY_IMPULSE, this._index,
            waterSurfacePosition, BUFFER_WRITE_VEC32, false,
            surfaceNormal, BUFFER_WRITE_VEC32, false,
            buoyancy, BUFFER_WRITE_FLOAT32, false,
            linearDrag, BUFFER_WRITE_FLOAT32, false,
            angularDrag, BUFFER_WRITE_FLOAT32, false,
            fluidVelocity, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Adds an angular impulse to the center of mass.
     *
     * @param {Vec3} impulse - Angular impulse vector.
     */
    addAngularImpulse(impulse) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_IMPULSE, this._index,
            impulse, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Adds a torque (unit: N) for the next physics time step. Will reset after the physics
     * completes a step.
     *
     * @param {Vec3} torque - Torque vector.
     */
    addTorque(torque) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            torque, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Changes the collision group and sub group this body belongs to. Using collision groups is expensive,
     * so it is disabled by default. Prefer to use broadphase and object layers instead for filtering.
     *
     * @param {number} collisionGroup - Collision group number. Use `-1` to disable.
     * @param {number} subGroup - Sub group number. Use `-1` to disable.
     */
    setCollisionGroup(collisionGroup, subGroup) {
        if (this._collisionGroup === collisionGroup && this._subGroup === subGroup) {
            return;
        }

        if ($_DEBUG) {
            let ok = Debug.checkInt(collisionGroup, `Invalid collision group int: ${collisionGroup}`);
            ok = ok && Debug.checkInt(subGroup, `Invalid sub group int: ${subGroup}`);
            if (!ok) {
                return;
            }
        }

        this._collisionGroup = collisionGroup;
        this._subGroup = subGroup;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_COL_GROUP, this._index,
            collisionGroup, BUFFER_WRITE_INT32, false,
            subGroup, BUFFER_WRITE_INT32, false
        );
    }

    /**
     * Intantenous placement of a body to a new position/rotation (i.e. teleport). Will ignore any
     * bodies between old and new position.
     *
     * @param {Vec3} position - World space position where to place the body.
     * @param {Quat} [rotation] - World space rotation the body should assume at new position.
     */
    teleport(position, rotation = Quat.IDENTITY) {
        if ($_DEBUG) {
            let ok = Debug.checkVec(position, `Invalid position vector`, position);
            ok = ok && Debug.checkQuat(rotation, `Invalid rotation quat`, rotation);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_MOVE_BODY, this._index,
            position, BUFFER_WRITE_VEC32, false,
            rotation, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Same as {@link teleport}, but taking scalars, instead of vectors.
     *
     * @param {number} px - Position scalar value on X axis.
     * @param {number} py - Position scalar value on Y axis.
     * @param {number} pz - Position scalar value on Z axis.
     * @param {number} [rx] - Rotation scalar value on X axis.
     * @param {number} [ry] - Rotation scalar value on Y axis.
     * @param {number} [rz] - Rotation scalar value on Z axis.
     * @param {number} [rw] - Rotation scalar value on W axis.
     */
    teleportScalars(px, py, pz, rx = 0, ry = 0, rz = 0, rw = 1) {
        if ($_DEBUG) {
            let ok = Debug.checkFloat(px, `Invalid position X component`, px);
            ok = ok && Debug.checkFloat(py, `Invalid position Y component`, py);
            ok = ok && Debug.checkFloat(pz, `Invalid position Z component`, pz);
            ok = ok && Debug.checkFloat(rx, `Invalid rotation X component`, rx);
            ok = ok && Debug.checkFloat(ry, `Invalid rotation Y component`, ry);
            ok = ok && Debug.checkFloat(rz, `Invalid rotation Z component`, rz);
            ok = ok && Debug.checkFloat(rw, `Invalid rotation W component`, rw);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_MOVE_BODY, this._index,
            px, BUFFER_WRITE_FLOAT32, false,
            py, BUFFER_WRITE_FLOAT32, false,
            pz, BUFFER_WRITE_FLOAT32, false,
            rx, BUFFER_WRITE_FLOAT32, false,
            ry, BUFFER_WRITE_FLOAT32, false,
            rz, BUFFER_WRITE_FLOAT32, false,
            rw, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * Changes the position and rotation of a dynamic body. Unlike {@link teleport}, this method
     * doesn't change the position/rotation instantenously, but instead calculates and sets linear
     * and angular velocities for the body, so it can reach the target position and rotation in the
     * specified delta time. If delta time is set to zero, the engine will use the current fixed
     * timestep value.
     *
     * @param {Vec3} pos - Taret position the body should reach in given dt.
     * @param {Quat} rot - Target rotation the body should reach in given dt.
     * @param {number} [dt] - Time in which the body should reach target position and rotation
     * (seconds).
     */
    moveKinematic(pos, rot, dt = 0) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_MOVE_KINEMATIC, this._index,
            pos, BUFFER_WRITE_VEC32, false,
            rot, BUFFER_WRITE_VEC32, false,
            dt, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * Resets both linear and angular velocities of a body to zero.
     */
    resetVelocities() {
        this.system.addCommand(OPERATOR_MODIFIER, CMD_RESET_VELOCITIES, this._index);
    }

    writeIsometry() {
        const entity = this.entity;

        const position = entity.getPosition();
        const rotation = entity.getRotation();

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_MOVE_BODY, this._index,
            position, BUFFER_WRITE_VEC32, false,
            rotation, BUFFER_WRITE_VEC32, false
        );
    }

    writeComponentData(cb) {
        const ok = ShapeComponent.writeShapeData(cb, this);
        if ($_DEBUG && !ok) {
            Debug.warn('Error creating a shape data.');
            cb.reset();
            return;
        }

        cb.write(this._index, BUFFER_WRITE_UINT32, false);

        // We always use world position and rotation from the current entity the component
        // is attached to (instead of default zero vectors)
        const entity = this.entity;
        const pos = entity.getPosition();
        const rot = entity.getRotation();

        // TODO
        // get rid of flags

        // Loss of precision for pos/rot (64 -> 32)
        cb.write(pos, BUFFER_WRITE_VEC32, false);
        cb.write(rot, BUFFER_WRITE_VEC32, false);

        cb.write(this._motionType, BUFFER_WRITE_UINT8, false);
        cb.write(this._useMotionState, BUFFER_WRITE_BOOL, false);
        cb.write(this._objectLayer, BUFFER_WRITE_UINT32, false);
        cb.write(this._linearVelocity, BUFFER_WRITE_VEC32, false);
        cb.write(this._angularVelocity, BUFFER_WRITE_VEC32, false);
        cb.write(this._maxLinearVelocity, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxAngularVelocity, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._friction, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._restitution, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._linearDamping, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._angularDamping, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._gravityFactor, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._inertiaMultiplier, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._allowedDOFs, BUFFER_WRITE_UINT8, false);
        cb.write(this._allowDynamicOrKinematic, BUFFER_WRITE_BOOL, false);
        cb.write(this._isSensor, BUFFER_WRITE_BOOL, false);
        cb.write(this._motionQuality, BUFFER_WRITE_UINT8, false);
        cb.write(this._allowSleeping, BUFFER_WRITE_BOOL, false);

        const hasCollisionGroup = this._collisionGroup >= 0;
        cb.write(hasCollisionGroup, BUFFER_WRITE_BOOL, false);
        if (hasCollisionGroup) {
            cb.write(this._collisionGroup, BUFFER_WRITE_UINT32, false);
        }

        const hasSubGroup = this._subGroup >= 0;
        cb.write(hasSubGroup, BUFFER_WRITE_BOOL, false);
        if (hasSubGroup) {
            cb.write(this._subGroup, BUFFER_WRITE_UINT32, false);
        }

        const massProps = this._overrideMassProperties;
        cb.write(massProps, BUFFER_WRITE_UINT8, false);

        if (massProps !== OMP_CALCULATE_MASS_AND_INERTIA) {
            cb.write(this._overrideMass, BUFFER_WRITE_FLOAT32, false);

            if (this._overrideMassProperties === OMP_MASS_AND_INERTIA_PROVIDED) {
                // override inertia
                // Potential precision loss (64 -> 32)
                cb.write(this._overrideInertiaPosition, BUFFER_WRITE_VEC32, false);
                cb.write(this._overrideInertiaRotation, BUFFER_WRITE_VEC32, false);
            }
        }

        cb.write(this._autoUpdateIsometry, BUFFER_WRITE_BOOL, false);

        if ($_DEBUG) {
            cb.write(this._debugDraw, BUFFER_WRITE_BOOL, false);
        }
    }

    onEnable() {
        const system = this.system;
        const shape = this._shape;
        const isCompoundChild = this._isCompoundChild;

        this._index = system.getIndex(this.entity);

        if ((shape === SHAPE_MESH || shape === SHAPE_CONVEX_HULL || shape === SHAPE_HEIGHTFIELD) &&
            this._renderAsset && !this._meshes) {
            this._addMeshes();
        } else if (!isCompoundChild) {
            system.createBody(this);
        }

        if (!isCompoundChild) {
            const motionType = this._motionType;
            if (this._autoUpdateIsometry &&
                    (motionType === MOTION_TYPE_DYNAMIC || motionType === MOTION_TYPE_KINEMATIC)) {
                this._isometryEvent = this.system.on('write-isometry', this.writeIsometry, this);
            }
        }
    }

    onDisable() {
        super.onDisable();

        const system = this.system;
        const componentIndex = this._index;

        system.setIndexFree(componentIndex);

        // TODO
        // Add support for dynamic compounds

        if (this._isCompoundChild) return;

        system.addCommand(OPERATOR_CLEANER, CMD_DESTROY_BODY, componentIndex);

        this._isometryEvent?.off();
        this._isometryEvent = null;
    }

    _localToWorld(vec) {
        const m4 = this.entity.getWorldTransform();
        m4.transformPoint(vec, vec);
    }

    _addMeshes() {
        const id = this._renderAsset instanceof Asset ? this._renderAsset.id : this._renderAsset;
        const assets = this.system.app.assets;

        const onAssetFullyReady = (asset) => {
            this._meshes = asset.resource.meshes;
            this.system.createBody(this);
        };

        const loadAndHandleAsset = (asset) => {
            asset.ready((asset) => {
                if (asset.data.containerAsset) {
                    const containerAsset = assets.get(asset.data.containerAsset);
                    if (containerAsset.loaded) {
                        onAssetFullyReady(asset);
                    } else {
                        containerAsset.ready(() => {
                            onAssetFullyReady(asset);
                        });
                        assets.load(containerAsset);
                    }
                } else {
                    onAssetFullyReady(asset);
                }
            });

            assets.load(asset);
        };

        const asset = assets.get(id);
        if (asset) {
            loadAndHandleAsset(asset);
        } else {
            assets.once('add:' + id, loadAndHandleAsset);
        }
    }
}

export { BodyComponent };

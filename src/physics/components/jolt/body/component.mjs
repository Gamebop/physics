import { Quat, Vec3 } from "playcanvas";
import { Debug } from "../../../debug.mjs";
import { ALLOWED_DOFS_ALL, BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_UINT32, BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32, CMD_DESTROY_BODY, CMD_MOVE_BODY, CMD_MOVE_KINEMATIC, CMD_RESET_VELOCITIES, MOTION_QUALITY_DISCRETE, MOTION_TYPE_DYNAMIC, MOTION_TYPE_KINEMATIC, MOTION_TYPE_STATIC, OMP_CALCULATE_MASS_AND_INERTIA, OMP_MASS_AND_INERTIA_PROVIDED, OPERATOR_CLEANER, OPERATOR_MODIFIER, SHAPE_CONVEX_HULL, SHAPE_HEIGHTFIELD, SHAPE_MESH } from "../constants.mjs";
import { ShapeComponent } from "../shape/component.mjs";

// TODO
// make static
const vec3 = new Vec3();

/**
 * Body Component description.
 * 
 * @category Body Component
 */
class BodyComponent extends ShapeComponent {

    // ---- BODY PROPS ----

    _angularVelocity = new Vec3();

    /** @type {number} @hidden */
    _allowedDOFs = ALLOWED_DOFS_ALL;

    _allowDynamicOrKinematic = false;

    _allowSleeping = true;

    _angularDamping = 0;

    /** @type {number | null} @hidden */
    _collisionGroup = null;

    _friction = 0.2;
    
    _gravityFactor = 1;
    
    _inertiaMultiplier = 1;

    _isSensor = false;

    _linearDamping = 0;

    _linearVelocity = new Vec3();
    
    _maxAngularVelocity = 47.12388980384689;

    _maxLinearVelocity = 500;

    /** @type {number} @hidden */
    _motionQuality = MOTION_QUALITY_DISCRETE;

    /** @type {number} @hidden */
    _motionType = MOTION_TYPE_STATIC;

    _objectLayer = 0;

    _overrideInertiaPosition = new Vec3();

    _overrideInertiaRotation = new Quat();

    _overrideMass = 1;
    
    /** @type {number} @hidden */
    _overrideMassProperties = OMP_CALCULATE_MASS_AND_INERTIA;

    _position = new Vec3();

    _rotation = new Quat();
    
    _restitution = 0;

    /** @type {number | null} @hidden */
    _subGroup = null;

    _useMotionState = true;

    constructor(system, entity) {
        super(system, entity);
    }

    /**
     * When this body is created as `MOTION_TYPE_STATIC`, this setting tells
     * the system to create a MotionProperties object so that the object can be
     * switched to kinematic or dynamic. Use `false` (default), if you don't intend
     * to switch the type of this body from static.
     */
    get allowDynamicOrKinematic() {
        return this._allowDynamicOrKinematic;
    }    

    /**
     * Which degrees of freedom this body has (can be used to limit simulation to 2D).
     * You can use following enum aliases:
     * ```
     * ALLOWED_DOFS_TRANSLATION_X
     * ```
     * ```
     * ALLOWED_DOFS_TRANSLATION_Y
     * ```
     * ```
     * ALLOWED_DOFS_TRANSLATION_Z
     * ```
     * ```
     * ALLOWED_DOFS_ROTATION_X
     * ```
     * ```
     * ALLOWED_DOFS_ROTATION_Y
     * ```
     * ```
     * ALLOWED_DOFS_ROTATION_Z
     * ```
     * ```
     * ALLOWED_DOFS_PLANE_2D
     * ```
     * ```
     * ALLOWED_DOFS_ALL
     * ```
     * For example, using `ALLOWED_DOFS_TRANSLATION_X` allows a body to move in world space X axis. 
     */
    get allowedDOFs() {
        return this._allowedDOFs;
    }

    /**
     * Specifies if this body go to sleep or not.
     */
    get allowSleeping() {
        return this._allowSleeping;
    }    

    /**
     * Specifies how quickly a body loses angular velocity. The formula used:
     * ```
     * dw/dt = -c * w
     * ```
     * `c` must be between 0 and 1 but is usually close to 0.
     */
    get angularDamping() {
        return this._angularDamping;
    }

    /**
     * World space angular velocity (rad/s)
     * 
     * @type {Vec3}
     */
    set angularVelocity(vec) {
        if (DEBUG) {
            const ok = Debug.checkVec(vec, `Invalid angular velocity vector`);
            if (!ok) return;
        }

        if (!vec.equals(this._angularVelocity)) {
            this._angularVelocity.copy(vec);
            this.system.addCommand(
                OPERATOR_MODIFIER, CMD_SET_ANG_VEL, this._index,
                vec, BUFFER_WRITE_VEC32, false
            );
        }
    }

    get angularVelocity() {
        return this._angularVelocity;
    }

    /**
     * The collision group this body belongs to (determines if two objects can collide).
     * Expensive, so disabled by default. Prefer to use broadphase and object layers 
     * instead for filtering.
     */
    get collisionGroup() {
        return this._collisionGroup;
    }

    /**
     * Friction of the body (dimensionless number, usually between 0 and 1, 0 = no friction,
     * 1 = friction force equals force that presses the two bodies together). Note that bodies
     * can have negative friction but the combined friction should never go below zero.
     */
    get friction() {
        return this._friction;
    }

    /**
     * Value to multiply gravity with for this body.
     */
    get gravityFactor() {
        return this._gravityFactor;
    }

    /**
     * When calculating the inertia (not when it is provided) the calculated inertia will
     * be multiplied by this value.
     */
    get inertiaMultiplier() {
        return this._inertiaMultiplier;
    }

    /**
     * If this body is a sensor. A sensor will receive collision callbacks, but will not
     * cause any collision responses and can be used as a trigger volume.
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
     */
    get linearDamping() {
        return this._linearDamping;
    }

    /**
     * World space linear velocity of the center of mass (m/s)
     */
    set linearVelocity(vec) {
        if (DEBUG) {
            const ok = Debug.checkVec(vec, `Invalid linear velocity vector`);
            if (!ok) return;
        }

        if (!vec.equals(this._linearVelocity)) {
            this._linearVelocity.copy(vec);
            this.system.addCommand(
                OPERATOR_MODIFIER, CMD_SET_LIN_VEL, this._index,
                vec, BUFFER_WRITE_VEC32, false
            );
        }
    }

    get linearVelocity() {
        return this._linearVelocity;
    }

    /**
     * Maximum angular velocity that this body can reach (rad/s)
     */
    get maxAngularVelocity() {
        return this._maxAngularVelocity;
    }

    /**
     * Maximum linear velocity that this body can reach (m/s)
     */
    get maxLinearVelocity() {
        return this._maxLinearVelocity;
    }

    /**
     * Motion quality, or how well it detects collisions when it has a high velocity.
     * Following enum aliases available:
     * ```
     * MOTION_QUALITY_DISCRETE
     * ```
     * ```
     * MOTION_QUALITY_LINEAR_CAST
     * ```
     * Use linear cast for fast moving objects, in other cases prefer discrete one since its cheaper (default).
     */
    get motionQuality() {
        return this._motionQuality;
    }   

    /**
     * Motion type, determines if the object is static, dynamic or kinematic.
     * You can use the following enum aliases:
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
     * @type {number}
     */
    set motionType(type) {
        DEBUG && Debug.checkUint(type, `Invalid motion type: ${ type }`);
        this._motionType = type;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_MOTION_TYPE, this._index,
            type, BUFFER_WRITE_UINT8, false
        );
    }

    get motionType() {
        return this._motionType;
    }

    /**
     * The collision layer this body belongs to (determines if two objects can collide).
     * Allows cheap filtering.
     */
    get objectLayer() {
        return this._objectLayer;
    }

    /**
     * Used only if `OMP_MASS_AND_INERTIA_PROVIDED` is selected for `overrideMassProperties`.
     * Backend will create inertia matrix from the given position.
     */
    get overrideInertiaPosition() {
        return this._overrideInertiaPosition;
    }

    /**
     * Used only if `OMP_MASS_AND_INERTIA_PROVIDED` is selected for {@link overrideMassProperties}.
     * Backend will create inertia matrix from the given rotation.
     */
    get overrideInertiaRotation() {
        return this._overrideInertiaRotation;
    }

    /**
     * Used only if `OMP_CALCULATE_INERTIA` or `OMP_MASS_AND_INERTIA_PROVIDED` is selected
     * for {@link overrideMassProperties}
     */
    get overrideMass() {
        return this._overrideMass;
    }

    /**
     * Determines how a body mass and inertia is calculated. By default it uses 
     * `OMP_CALCULATE_MASS_AND_INERTIA`, which tells Jolt to auto-calculate those based the collider
     * shape. You can use following enum aliases:
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
     */
    get overrideMassProperties() {
        return this._overrideMassProperties;
    }

    /**
     * Read-only. Current position of the body (not of the center of mass).
     */
    get position() {
        return this._position;
    }

    /**
     * Read-only. Current rotation of the body.
     */
    get rotation() {
        return this._rotation;
    }

    /**
     * Restitution of body (dimensionless number, usually between 0 and 1, 0 = completely
     * inelastic collision response, 1 = completely elastic collision response). Note that
     * bodies can have negative restitution but the combined restitution should never go below zero.
     */
    get restitution() {
        return this._restitution;
    }

    /**
     * The collision sub group (within {@link collisionGroup}) this body belongs to (determines 
     * if two objects can collide). Expensive, so disabled by default. Prefer to use broadphase
     * and object layers instead for filtering.
     */
    get subGroup() {
        return this._subGroup;
    }

    /**
     * Enables/disables the use of motion state for this entity. Not used by static bodies.
     * 
     * If the physcs fixed timestep is set lower than the client's browser refresh rate, then browser will have 
     * multiple frame updates per single physics simulation step. If you enable motion state for this entity,
     * then the position and rotation will be interpolated, otherwise the entity will visually move only after 
     * physics completes a step.
     * 
     * For example, say browser refreshes every 0.1 seconds, and physics step once a second. Without using
     * motion state an entity position will update once every second, when physics update takes place. With motion state
     * enabled, it will update the position/rotation every 0.1 seconds - once a true update (from physics) and 9 times
     * interpolated. This will give a smooth motion of the entity, without having to do expensive physics simulation
     * step.
     */
    set useMotionState(bool) {
        if (DEBUG) {
            const ok = Debug.checkBool(bool, `Invalid bool value for useMotionState property: ${ bool }`);
            if (!ok)
                return;
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_USE_MOTION_STATE, this._index,
            bool, BUFFER_WRITE_BOOL, false
        );
    }

    get useMotionState() {
        return this._useMotionState;
    }

    /**
     * Adds a force (unit: N) at an offset to this body for the next physics time step. Will reset after 
     * the physics completes a step.
     * 
     * @param {import('playcanvas').Vec3} force - Force to add to body.
     * @param {import('playcanvas').Vec3} [offset] - Offset from the body center where the force is added.
     * @param {boolean} [isOffsetLocal] - Specifies if offset is in world or local space.
     */
    addForce(force, offset = Vec3.ZERO, isOffsetLocal = false) {
        if (DEBUG) {
            let ok = Debug.checkVec(force, `Invalid add force vector`);
            ok = ok && Debug.checkVec(offset, `Invalid add force offset`);
            if (!ok) {
                return;
            }
        }

        vec3.copy(offset);

        if (!vec3.equals(Vec3.ZERO) && isOffsetLocal) {   
            this._localToWorld(vec3);
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            force, BUFFER_WRITE_VEC32, false,
            vec3, BUFFER_WRITE_VEC32, false
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
     * @returns 
     */
    addForceScalars(forceX, forceY, forceZ, offsetX = 0, offsetY = 0, offsetZ = 0, isOffsetLocal = false) {
        if (DEBUG) {
            let ok = Debug.checkFloat(forceX, `Invalid add impulse X component: ${ forceX }`);
            ok = ok && Debug.checkFloat(forceY, `Invalid add impulse Y component: ${ forceY }`);
            ok = ok && Debug.checkFloat(forceZ, `Invalid add impulse Z component: ${ forceZ }`);
            ok = ok && Debug.checkFloat(offsetX, `Invalid add impulse offset X component: ${ offsetX }`);
            ok = ok && Debug.checkFloat(offsetY, `Invalid add impulse offset Y component: ${ offsetY }`);
            ok = ok && Debug.checkFloat(offsetZ, `Invalid add impulse offset Z component: ${ offsetZ }`);
            if (!ok) {
                return;
            }
        }

        vec3.set(offsetX, offsetY, offsetZ);

        if (offsetX !== 0 || offsetY !== 0 || offsetZ !== 0 && isOffsetLocal) {
            this._localToWorld(vec3);
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            forceX, BUFFER_WRITE_FLOAT32, false,
            forceY, BUFFER_WRITE_FLOAT32, false,
            forceZ, BUFFER_WRITE_FLOAT32, false,
            vec3, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Adds an impulse to the center of mass of the body (unit: kg m/s).
     * 
     * @param {import('playcanvas').Vec3} impulse - Impulse to add to body.
     * @param {import('playcanvas').Vec3} [offset] - Offset from the body center where the impulse is added.
     * @param {boolean} [isOffsetLocal] - Specifies if offset is in world or local space.
     */
    addImpulse(impulse, offset = Vec3.ZERO, isOffsetLocal = false) {
        if (DEBUG) {
            let ok = Debug.checkVec(impulse, `Invalid add impulse vector:`);
            ok = ok && Debug.checkVec(offset, `Invalid add impulse offset:`);
            if (!ok) {
                return;
            }
        }

        vec3.copy(offset);

        if (!vec3.equals(Vec3.ZERO) && isOffsetLocal) {
            this._localToWorld(vec3);
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_IMPULSE, this._index,
            impulse, BUFFER_WRITE_VEC32, false,
            vec3, BUFFER_WRITE_VEC32, false
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
        if (DEBUG) {
            let ok = Debug.checkFloat(impulseX, `Invalid add impulse X component: ${ impulseX }`);
            ok = ok && Debug.checkFloat(impulseY, `Invalid add impulse Y component: ${ impulseY }`);
            ok = ok && Debug.checkFloat(impulseZ, `Invalid add impulse Z component: ${ impulseZ }`);
            ok = ok && Debug.checkFloat(offsetX, `Invalid add impulse offset X component: ${ offsetX }`);
            ok = ok && Debug.checkFloat(offsetY, `Invalid add impulse offset Y component: ${ offsetY }`);
            ok = ok && Debug.checkFloat(offsetZ, `Invalid add impulse offset Z component: ${ offsetZ }`);
            if (!ok) {
                return;
            }
        }

        vec3.set(offsetX, offsetY, offsetZ);

        if (offsetX !== 0 || offsetY !== 0 || offsetZ !== 0 && isOffsetLocal) {
            this._localToWorld(vec3);
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            impulseX, BUFFER_WRITE_FLOAT32, false,
            impulseY, BUFFER_WRITE_FLOAT32, false,
            impulseZ, BUFFER_WRITE_FLOAT32, false,
            vec3, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Applies an impulse to the body that simulates fluid buoyancy and drag.
     * 
     * @param {import('playcanvas').Vec3} waterSurfacePosition - Position of the fluid surface in world space.
     * @param {import('playcanvas').Vec3} surfaceNormal - Normal of the fluid surface (should point up).
     * @param {number} buoyancy - The buoyancy factor for the body. 1 = neutral body, < 1 sinks, > 1 floats.
     * @param {number} linearDrag - Linear drag factor that slows down the body when in the fluid (approx. 0.5).
     * @param {number} angularDrag - Angular drag factor that slows down rotation when the body is in the fluid (approx. 0.01).
     * @param {import('playcanvas').Vec3} fluidVelocity - The average velocity of the fluid (in m/s) in which the body resides.
     */
    applyBuoyancyImpulse(waterSurfacePosition, surfaceNormal, buoyancy, linearDrag, angularDrag, fluidVelocity) {
        if (DEBUG) {
            let ok = true;
            ok = ok && Debug.checkVec(waterSurfacePosition, `Invalid water surface position vector`);
            ok = ok && Debug.checkVec(surfaceNormal, `Invalid surface normal`);
            ok = ok && Debug.checkFloat(buoyancy, `Invalid buoyancy scalar: ${ buoyancy }`);
            ok = ok && Debug.checkFloat(linearDrag, `Invalid linear drag scalar: ${ linearDrag }`);
            ok = ok && Debug.checkFloat(angularDrag, `Invalid angular drag scalar: ${ angularDrag }`);
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
     * @param {import('playcanvas').Vec3} impulse - Angular impulse vector.
     */
    addAngularImpulse(impulse) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_IMPULSE, this._index,
            impulse, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Adds a torque (unit: N) for the next physics time step. Will reset after 
     * the physics completes a step.
     * 
     * @param {import('playcanvas').Vec3} torque - Torque vector.
     */
    addTorque(torque) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            torque, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Intantenous placement of a body to a new position/rotation (i.e. teleport). Will ignore any bodies
     * between old and new position.
     * 
     * @param {import('playcanvas').Vec3} position - World space position where to place the body. 
     * @param {import('playcanvas').Quat} [rotation] - World space rotation the body should assume at new position.
     */
    teleport(position, rotation = Quat.IDENTITY) {
        if (DEBUG) {
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
        if (DEBUG) {
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
     * Changes the position and rotation of a dynamic body. Unlike {@link teleport}, this
     * method doesn't change the position/rotation directly, but instead calculates and
     * sets linear and angular velocities for the body, so it can reach the target position
     * and rotation in specified delta time. If delta time is set to zero (default), the engine will
     * use the current fixed timestep value.
     * 
     * @param {import('playcanvas').Vec3} pos - Taret position the body should reach in given dt.
     * @param {import('playcanvas').Quat} rot - Target rotation the body should reach in given dt.
     * @param {number} [dt] - Time in which the body should reach target position and rotation. In seconds.
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
        if (this._motionType === MOTION_TYPE_DYNAMIC) {
            return;
        }

        const entity = this.entity;

        if (entity._dirtyWorld) {
            const position = entity.getPosition();
            const rotation = entity.getRotation();

            this.system.addCommand(
                OPERATOR_MODIFIER, CMD_MOVE_BODY, this._index,
                position, BUFFER_WRITE_VEC32, false,
                rotation, BUFFER_WRITE_VEC32, false
            );
        }
    }    

    writeComponentData(cb) {
        const ok = ShapeComponent.writeShapeData(cb, this);
        if (DEBUG && !ok) {
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
        cb.write(this._collisionGroup, BUFFER_WRITE_UINT32);
        cb.write(this._subGroup, BUFFER_WRITE_UINT32);

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

        DEBUG && cb.write(this._debugDraw, BUFFER_WRITE_BOOL, false);
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
            if ((motionType === MOTION_TYPE_DYNAMIC && this._trackDynamic) || motionType === MOTION_TYPE_KINEMATIC) {
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
        const id = this._renderAsset;
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


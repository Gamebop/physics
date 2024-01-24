import { Debug } from "../../../debug.mjs";
import { ShapeComponent } from "../component.mjs";
import {
    BUFFER_WRITE_BOOL,
    BUFFER_WRITE_FLOAT32,
    BUFFER_WRITE_UINT16,
    BUFFER_WRITE_UINT32,
    BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32,
    CMD_ADD_FORCE, CMD_ADD_IMPULSE,
    CMD_APPLY_BUOYANCY_IMPULSE,
    CMD_DESTROY_BODY,
    CMD_MOVE_BODY, CMD_RESET_VELOCITIES, CMD_SET_ANG_VEL,
    CMD_SET_LIN_VEL, CMD_SET_MOTION_TYPE,
    CMD_SET_USER_DATA,
    CMD_USE_MOTION_STATE,
    OPERATOR_CLEANER, OPERATOR_MODIFIER,
    SHAPE_CONVEX_HULL,
    SHAPE_HEIGHTFIELD,
    SHAPE_MESH
} from "../constants.mjs";

const vec3 = new pc.Vec3();

class BodyComponent extends ShapeComponent {

    // ---- BODY PROPS ----

    // Position of the body (not of the center of mass)
    _position = new pc.Vec3();

    // Rotation of the body.
    _rotation = new pc.Quat();

    // World space linear velocity of the center of mass (m/s)
    _linearVelocity = new pc.Vec3();

    // World space angular velocity (rad/s)
    _angularVelocity = new pc.Vec3();

    // Motion type, determines if the object is static, dynamic or kinematic.
    _motionType = pc.JOLT_MOTION_TYPE_STATIC;

    // Enables/disables the use of motion state for this entity. Not used by static bodies.
    _useMotionState = true;

    // The collision layer this body belongs to (determines if two objects can collide).
    // Allows cheap filtering.
    _objectLayer = 0;

    // The collision group this body belongs to (determines if two objects can collide).
    // Expensive, so disabled by default.
    _collisionGroup = null;

    // Sub-group (within the collision group). Expensive, so disabled by default.
    _subGroup = null;

    // Which degrees of freedom this body has (can be used to limit simulation to 2D)
    _allowedDOFs = pc.JOLT_ALLOWED_DOFS_ALL;

    // When this body is created as static, this setting tells the system to create a
    // MotionProperties object so that the object can be switched to kinematic or dynamic.
    _allowDynamicOrKinematic = false;

    // If this body is a sensor. A sensor will receive collision callbacks, but will not
    // cause any collision responses and can be used as a trigger volume.
    _isSensor = false;

    // Motion quality, or how well it detects collisions when it has a high velocity.
    _motionQuality = pc.JOLT_MOTION_QUALITY_DISCRETE;

    // If this body can go to sleep or not.
    _allowSleeping = true;

    // Friction of the body (dimensionless number, usually between 0 and 1, 0 = no friction,
    // 1 = friction force equals force that presses the two bodies together). Note that bodies
    // can have negative friction but the combined friction should never go below zero.
    _friction = 0.2;

    // Restitution of body (dimensionless number, usually between 0 and 1, 0 = completely
    // inelastic collision response, 1 = completely elastic collision response). Note that
    // bodies can have negative restitution but the combined restitution should never go below zero.
    _restitution = 0;

    // Linear damping: dv/dt = -c * v. c must be between 0 and 1 but is usually close to 0.
    _linearDamping = 0;

    // Angular damping: dw/dt = -c * w. c must be between 0 and 1 but is usually close to 0.
    _angularDamping = 0;

    // Maximum linear velocity that this body can reach (m/s)
    _maxLinearVelocity = 500;

    // Maximum angular velocity that this body can reach (rad/s)
    _maxAngularVelocity = 0.25 * Math.PI * 60;

    // Value to multiply gravity with for this body.
    _gravityFactor = 1;

    // When calculating the inertia (not when it is provided) the calculated inertia will be multiplied by this value.
    _inertiaMultiplier = 1;

    // Determines how mMassPropertiesOverride will be used. By default tells Jolt to
    // auto-calculate by the shape.
    _overrideMassProperties = pc.JOLT_OMP_CALCULATE_MASS_AND_INERTIA;

    // Used only if Jolt.CalculateInertia or Jolt.MassAndInertiaProvided is selected for
    // mass calculation method
    _overrideMass = 1;

    // Used if Jolt.MassAndInertiaProvided is selected for mass calculation method.
    // Backend will create inertia matrix from the given position/rotation.
    _overrideInertiaPosition = new pc.Vec3();
    _overrideInertiaRotation = new pc.Quat();

    constructor(system, entity) {
        super(system, entity);
    }

    set linearVelocity(vec) {
        if (Debug.dev) {
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

    set angularVelocity(vec) {
        if (Debug.dev) {
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

    set motionType(type) {
        Debug.dev && Debug.checkUint(type, `Invalid motion type: ${ type }`);
        this._motionType = type;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_MOTION_TYPE, this._index,
            type, BUFFER_WRITE_UINT8, false
        );
    }

    get motionType() {
        return this._motionType;
    }

    get collisionGroup() {
        return this._group;
    }

    get subGroup() {
        return this._subGroup;
    }

    get index() {
        return this._index;
    }

    get userData() {
        return this._userData;
    }

    set userData(num) {
        if (Debug.dev) {
            let ok = Debug.checkFloat(num, `Invalid user data value. Should be a number: ${ num }`);
            if (!ok)
                return;
        }

        this._userData = num;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_USER_DATA, this._index,
            num, BUFFER_WRITE_FLOAT32, false
        );      
    }

    get useMotionState() {
        return this._useMotionState;
    }

    set useMotionState(bool) {
        if (Debug.dev) {
            const ok = Debug.checkBool(bool, `Invalid bool value for useMotionState property: ${ bool }`);
            if (!ok)
                return;
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_USE_MOTION_STATE, this._index,
            bool, BUFFER_WRITE_BOOL, false
        );
    }

    addForce(force, offset, isOffsetLocal = false) {
        if (Debug.dev) {
            let ok = true;
            ok = ok && Debug.checkVec(force, `Invalid add force vector`);
            ok = ok && Debug.checkVec(offset, `Invalid add force offset`);
            if (!ok) {
                return;
            }
        }

        let _offset = null;
        if (offset) {
            _offset = vec3.copy(offset);

            if (isOffsetLocal) {
                this._localToWorld(_offset);
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            force, BUFFER_WRITE_VEC32, false,
            _offset, BUFFER_WRITE_VEC32, true
        );
    }

    addForceScalars(forceX, forceY, forceZ, offsetX = 0, offsetY = 0, offsetZ = 0, isOffsetLocal = false) {
        if (Debug.dev) {
            let ok = true;
            ok = ok && Debug.checkFloat(forceX, `Invalid add impulse X component: ${ forceX }`);
            ok = ok && Debug.checkFloat(forceY, `Invalid add impulse Y component: ${ forceY }`);
            ok = ok && Debug.checkFloat(forceZ, `Invalid add impulse Z component: ${ forceZ }`);
            ok = ok && Debug.checkFloat(offsetX, `Invalid add impulse offset X component: ${ offsetX }`);
            ok = ok && Debug.checkFloat(offsetY, `Invalid add impulse offset Y component: ${ offsetY }`);
            ok = ok && Debug.checkFloat(offsetZ, `Invalid add impulse offset Z component: ${ offsetZ }`);
            if (!ok) {
                return;
            }
        }

        let offset = null;
        if (offsetX !== 0 || offsetY !== 0 || offsetZ !== 0) {
            offset = vec3.set(offsetX, offsetY, offsetZ);

            if (isOffsetLocal) {
                this._localToWorld(offset);
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            forceX, BUFFER_WRITE_FLOAT32, false,
            forceY, BUFFER_WRITE_FLOAT32, false,
            forceZ, BUFFER_WRITE_FLOAT32, false,
            offset, BUFFER_WRITE_VEC32, true
        );
    }

    addImpulse(impulse, offset = pc.Vec3.ZERO, isOffsetLocal = false) {
        if (Debug.dev) {
            let ok = true;
            ok = ok && Debug.checkVec(impulse, `Invalid add impulse vector:`);
            ok = ok && Debug.checkVec(offset, `Invalid add impulse offset:`);
            if (!ok) {
                return;
            }
        }

        let _offset = null;
        if (offset) {
            _offset = vec3.copy(offset);

            if (isOffsetLocal) {
                this._localToWorld(_offset);
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_IMPULSE, this._index,
            impulse, BUFFER_WRITE_VEC32, false,
            _offset, BUFFER_WRITE_VEC32, true
        );
    }

    addImpulseScalars(impulseX, impulseY, impulseZ, offsetX = 0, offsetY = 0, offsetZ = 0, isOffsetLocal = false) {
        if (Debug.dev) {
            let ok = true;
            ok = ok && Debug.checkFloat(impulseX, `Invalid add impulse X component: ${ impulseX }`);
            ok = ok && Debug.checkFloat(impulseY, `Invalid add impulse Y component: ${ impulseY }`);
            ok = ok && Debug.checkFloat(impulseZ, `Invalid add impulse Z component: ${ impulseZ }`);
            ok = ok && Debug.checkFloat(offsetX, `Invalid add impulse offset X component: ${ offsetX }`);
            ok = ok && Debug.checkFloat(offsetY, `Invalid add impulse offset Y component: ${ offsetY }`);
            ok = ok && Debug.checkFloat(offsetZ, `Invalid add impulse offset Z component: ${ offsetZ }`);
            if (!ok) {
                return;
            }
        }

        let offset = null;
        if (offsetX !== 0 || offsetY !== 0 || offsetZ !== 0) {
            offset = vec3.set(offsetX, offsetY, offsetZ);

            if (isOffsetLocal) {
                this._localToWorld(offset);
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            impulseX, BUFFER_WRITE_FLOAT32, false,
            impulseY, BUFFER_WRITE_FLOAT32, false,
            impulseZ, BUFFER_WRITE_FLOAT32, false,
            offset, BUFFER_WRITE_VEC32, true
        );
    }

    applyBuoyancyImpulse(waterSurfacePosition, surfaceNormal, buoyancy, linearDrag, angularDrag, fluidVelocity) {
        if (Debug.dev) {
            let ok = true;
            ok = ok && Debug.checkVec(waterSurfacePosition, `Invalid water surface position vector`);
            ok = ok && Debug.checkVec(surfaceNormal, `Invalid surface normal`);
            ok = ok && Debug.checkFloat(buoyancy, `Invalid buoyancy scalar: ${ buoyancy }`);
            ok = ok && Debug.checkFloat(linearDrag, `Invalid linear drag scalar: ${ linearDrag }`);
            ok = ok && Debug.checkFloat(angularDrag, `Invalid angular drag scalar: ${ angularDrag }`);
            ok = ok && Debug.checkVec(fluidVelocity, `Invalid fluid velocity vector`);
            if (!ok) return;
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

    addAngularImpulse(impulse) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_IMPULSE, this._index,
            impulse, BUFFER_WRITE_VEC32, false
        );
    }

    addTorque(torque) {
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_ADD_FORCE, this._index,
            torque, BUFFER_WRITE_VEC32, false
        );
    }

    writeIsometry() {
        const entity = this.entity;
        if (entity._dirtyWorld) {
            const position = entity.getPosition();
            const rotation = entity.getRotation();

            this.system.addCommand(
                OPERATOR_MODIFIER, CMD_MOVE_BODY, this._index,
                position, BUFFER_WRITE_VEC32, false,
                rotation, BUFFER_WRITE_VEC32, false
            );

            if (this._motionType === pc.JOLT_MOTION_TYPE_DYNAMIC) {
                this.resetVelocities();
            }
        }
    }

    writeComponentData(cb) {
        const ok = ShapeComponent.writeShapeData(cb, this);
        if (Debug.dev && !ok) {
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

        Debug.dev && cb.write(this._debugDraw, BUFFER_WRITE_BOOL, false);

        const massProps = this._overrideMassProperties;
        cb.write(massProps, BUFFER_WRITE_UINT8, false);

        if (massProps !== pc.JOLT_OMP_CALCULATE_MASS_AND_INERTIA) {
            cb.write(this._overrideMass, BUFFER_WRITE_FLOAT32, false);

            if (this._overrideMassProperties === pc.JOLT_OMP_MASS_AND_INERTIA_PROVIDED) {
                // override inertia
                // Potential precision loss (64 -> 32)
                cb.write(this._overrideInertiaPosition, BUFFER_WRITE_VEC32, false);
                cb.write(this._overrideInertiaRotation, BUFFER_WRITE_VEC32, false);
            }
        }
    }

    resetVelocities() {
        this.system.addCommand(OPERATOR_MODIFIER, CMD_RESET_VELOCITIES, this._index);
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
            if ((motionType === pc.JOLT_MOTION_TYPE_DYNAMIC && this._trackDynamic) || motionType === pc.JOLT_MOTION_TYPE_KINEMATIC) {
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
        // Jolt currently exposes only static compounds to Wasm. Which means,
        // that a compound parent cannot change children. So, currently
        // a child cannot be added/removed, we can only destroy/create
        // parent.

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


import { Debug } from "../../../debug.mjs";
import { ShapeComponent } from "../component.mjs";

/**
 * Char Component describes the properties of a Jolt Character Virtual.
 * 
 * @category Char Component
 */
class CharComponent extends ShapeComponent {

    /** @type {number} @hidden */
    _shape = SHAPE_CAPSULE;

    _up = pc.Vec3.UP;

    _useMotionState = true;

    _linearVelocity = new pc.Vec3();

    _supportingVolume = new pc.Plane(pc.Vec3.UP, -1);

    _maxSlopeAngle = 45 * pc.math.DEG_TO_RAD;

    _mass = 70;

    _maxStrength = 100;

    _shapeOffset = pc.Vec3.ZERO;

    // TODO
    // add local flags export
    /** @type {number} @hidden */
    _backFaceMode = pc.JOLT_BFM_COLLIDE_BACK_FACES;

    _predictiveContactDistance = 0.1;

    _maxCollisionIterations = 5;

    _maxConstraintIterations = 15;

    _minTimeRemaining = 1.0e-4;

    _collisionTolerance = 1.0e-3;

    _characterPadding = 0.02;

    _maxNumHits = 256;

    _hitReductionCosMaxAngle = 0.999;

    _penetrationRecoverySpeed = 1;

    _isSupported = false;

    _isSlopeTooSteep = false;

    /** @type {import('playcanvas').Entity | null} @hidden */
    _groundEntity = null;

    _groundNormal = new pc.Vec3();

    _groundVelocity = new pc.Vec3();

    // TODO
    // use local export
    _state = pc.JOLT_GROUND_STATE_NOT_SUPPORTED;

    /** @type {number | null} @hidden */
    _userData = null;

    /** @type {import('playcanvas').Entity | null} @hidden */
    _pairedEntity = null;

    constructor(system, entity) {
        super(system, entity);
    }

    /**
     * When colliding with back faces, the character will not be able to move through back facing
     * triangles. Use this if you have triangles that need to collide on both sides.
     * 
     * Possible values:
     * ```
     * BFM_IGNORE_BACK_FACES
     * ```
     * ```
     * BFM_COLLIDE_BACK_FACES
     * ```
     * 
     * @defaultValue BFM_COLLIDE_BACK_FACES
     */
    get backFaceMode() {
        return this._backFaceMode;
    }

    /**
     * How far we try to stay away from the geometry, this ensures that the sweep will hit as
     * little as possible lowering the collision cost and reducing the risk of getting stuck.
     * 
     * @defaultValue 0.02 // meters
     */
    get characterPadding() {
        return this._characterPadding;
    }

    /**
     * How far we're allowed to penetrate geometry.
     * 
     * @defaultValue 0.001 // meters
     */
    get collisionTolerance() {
        return this._collisionTolerance;
    }

    /**
     * Read-only. If the character is supported, this will tell the ground Entity.
     * 
     * @defaultValue null
     */
    get groundEntity() {
        return this._groundEntity;
    }

    /**
     * Read-only. If the character is supported, this will tell the ground normal. Otherwise will
     * be a zero vector.
     * 
     * @defaultValue Vec3(0, 0, 0)
     */
    get groundNormal() {
        return this._groundNormal;
    }

    /**
     * Velocity of the ground. If the character is not supported, then it will be a zero vector.
     * 
     * @defaultValue Vec3(0, 0, 0)
     */
    get _groundVelocity() {
        return this._groundVelocity;
    }

    /**
     * Uses cos(angle) where angle is the maximum angle between two hits contact normals that are
     * allowed to be merged during hit reduction. Set to -1 to turn off.
     * 
     * @defaultValue 2.5 * Math.PI / 180 // radians
     */
    get hitReductionCosMaxAngle() {
        return this._hitReductionCosMaxAngle;
    }

    /**
     * Read-only. Will be `true` if the ground is too steep to walk on.
     * 
     * @defaultValue false
     */
    get isSlopeTooSteep() {
        return this._isSlopeTooSteep;
    }

    /**
     * Read-only. Will be `true` if character is supported by normal or steep ground.
     * 
     * @defaultValue false
     */
    get isSupported() {
        return this._isSupported;
    }    

    /**
     * Linear velocity of the character. Must be set by user. Backend will use it to calculate the
     * next position at the next simulation update.
     * 
     * @defaultValue Vec3(0, 0, 0) // m/s
     */
    set linearVelocity(vel) {
        if (DEBUG) {
            const ok = Debug.checkVec(vel, `Invalid character linear velocity`, vel);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_LIN_VEL, this._index,
            vel, BUFFER_WRITE_VEC32, false
        );
    }

    get linearVelocity() {
        return this._linearVelocity;
    }

    /**
     * Character mass. Used to push down objects with gravity when character is standing on top.
     * 
     * @defaultValue 70 // kg
     */
    get mass() {
        return this._mass;
    }

    /**
     * Max amount of collision loops.
     * 
     * @defaultValue 5 // integer
     */
    get maxCollisionIterations() {
        return this._maxCollisionIterations;
    }

    /**
     * How often to try stepping during the constraint solving.
     * 
     * @defaultValue 15 // integer
     */
    get maxConstraintIterations() {
        return this._maxConstraintIterations;
    }

    /**
     * The maximum angle of a slope that the character can still walk on.
     * 
     * @defaultValue 45 * Math.PI / 180 // radians
     */
    get maxSlopeAngle() {
        return this._maxSlopeAngle;
    }

    /**
     * Max number of hits to collect in order to avoid excess of contact points collection.
     * 
     * @defaultValue 256 // integer
     */
    get maxNumHits() {
        return this._maxNumHits;
    }

    /**
     * Maximum force with which the character can push other bodies.
     * 
     * @defaultValue 100 // Newtons
     */
    get maxStrength() {
        return this._maxStrength;
    }

    /**
     * Early out condition: If this much time is left to simulate we are done.
     * 
     * @defaultValue 0.0001 // seconds
     */
    get minTimeRemaining() {
        return this._minTimeRemaining;
    }

    /**
     * This value governs how fast a penetration will be resolved. Accepts a float in [0, 1] range,
     * where:
     *   0 - nothing is resolved
     *   1 - everything is resolved in one update
     * 
     * @defaultValue 1 // float
     */
    get penetrationRecoverySpeed() {
        return this._penetrationRecoverySpeed;
    }

    /**
     * An extra linear offset applied to the shape in local space. Note, that if a shape already
     * has an offset via {@link ShapeComponent.shapePosition} and/or
     * {@link ShapeComponent.shapeRotation}, then this offset will be added ontop of those.
     * 
     * @defaultValue Vec3(0, 0, 0) // meters
     */
    get shapeOffset() {
        return this._shapeOffset;
    }

    /**
     * Character Virtual exists outside of the physics simulation, so other bodies cannot "see" it.
     * To solve this, we "pair" an Entity that has a kinematic or dynamic body component with it.
     * This adds a world presence to the character, and allow raycasts and collisions detection
     * against it.
     * 
     * @defaultValue null
     */
    set pairedEntity(entity) {
        if (DEBUG) {
            const ok = Debug.assert(!!entity.body, 
                `Invalid entity to pair. Needs to have a "body" component.`, entity);
            if (!ok) {
                return;
            }
        }

        this._pairedEntity = entity;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_PAIR_BODY, this._index,
            entity.body.index, BUFFER_WRITE_UINT32, false
        );
    }

    get pairedEntity() {
        return this._pairedEntity;
    }

    /**
     * How far to scan outside of the shape for predictive contacts. A value of 0 will most likely
     * cause the character to get stuck as it cannot properly calculate a sliding direction
     * anymore. A value that's too high will cause ghost collisions.
     * 
     * @defaultValue 0.1 // meters
     */
    get predictiveContactDistance() {
        return this._predictiveContactDistance;
    }

    /**
     * Character's initial shape type. It is possible to change the shape of the char later using 
     * {@link setShape}
     * 
     * @defaultValue SHAPE_CAPSULE // enum integer
     */
    get shape() {
        return this._shape;
    }

    /**
     * Read-only. Tells the current ground state of the character.
     * 
     * Possible values:
     * ```
     * GROUND_STATE_NOT_SUPPORTED
     * ```
     * ```
     * GROUND_STATE_ON_STEEP_GROUND
     * ```
     * ```
     * GROUND_STATE_NOT_SUPPORTED
     * ```
     * ```
     * GROUND_STATE_IN_AIR
     * ```
     * 
     * @defaultValue GROUND_STATE_NOT_SUPPORTED // enum integer
     */
    get state() {
        return this._state;
    }

    /**
     * Plane, defined in local space relative to the character. Every contact behind this plane can
     * support the character, every contact in front of this plane is treated as only colliding
     * with the player.
     * 
     * @defaultValue Plane(Vec3.UP, -1)
     */
    get supportingVolume() {
        return this._supportingVolume;
    }

    /**
     * Vector indicating the up direction of the character (normalized).
     * 
     * @defaultValue Vec3(0, 1, 0)
     */
    get up() {
        return this._up;
    }

    /**
     * Enables/disables the use of motion state for the character. Motion state interpolates the
     * position/rotation (isometry) of the character between the physics updates. This will make
     * the motion look smooth, when browser's framemrate is faster than the physics update rate. If
     * set to `false`, then the character isometry will update together with the physics update.
     * 
     * @defaultValue true
     */
    get useMotionState() {
        return this._useMotionState;
    }

    /**
     * Allows to associate a user defined number with a character shape. This is useful, when you
     * want to control the character logic in the collision callback, when running physics in a Web
     * Worker.
     */
    set userData(num) {
        if (DEBUG) {
            const ok = Debug.checkFloat(num,
                `Invalid user data value. Should be a number: ${ num }`);
            if (!ok) {
                return;
            }
        }

        this._userData = num;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_SET_USER_DATA, this._index,
            num, BUFFER_WRITE_FLOAT32, false
        );
    }

    get userData() {
        return this._userData;
    }

    /**
     * Changes the shape of the character. You should first create a shape using
     * {@link JoltManager.createShape}. Note, that this method does not guarantee that the shape
     * will be changed. For example, when trying to change to a larger shape that doesn't have
     * enough physical space around it.
     *  
     * You can provide a callback function, which will be called when a shape is changed
     * successfully.
     * 
     * @param {null | number} shapeIndex - Integer index of the shape to change the current shape
     * to. Use `null` to reset the shape back to the one the character was created with.
     * @param {null | number} callback - A callback function to call when the shape is changed
     * successfully.
     */
    setShape(shapeIndex = null, callback = null) {
        const system = this.system;

        system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_SHAPE, this._index,
            !!callback, BUFFER_WRITE_BOOL, false,
            shapeIndex, BUFFER_WRITE_UINT32, true
        );

        if (callback) {
            this._writeCallback(callback);
        }
    }

    writeComponentData(cb) {
        const ok = ShapeComponent.writeShapeData(cb, this, true /* force write rotation */);
        if (DEBUG && !ok) {
            Debug.warn('Error creating a shape data.');
            return false;
        }

        cb.write(this._index, BUFFER_WRITE_UINT32, false);
        cb.write(this._useMotionState, BUFFER_WRITE_BOOL, false);
        cb.write(this._up, BUFFER_WRITE_VEC32, false);
        cb.write(this._supportingVolume, BUFFER_WRITE_PLANE, false);
        cb.write(this._maxSlopeAngle, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._mass, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxStrength, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._shapeOffset, BUFFER_WRITE_VEC32, false);
        cb.write(this._backFaceMode, BUFFER_WRITE_UINT8, false);
        cb.write(this._predictiveContactDistance, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxCollisionIterations, BUFFER_WRITE_UINT32, false);
        cb.write(this._maxConstraintIterations, BUFFER_WRITE_UINT32, false);
        cb.write(this._minTimeRemaining, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._collisionTolerance, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._characterPadding, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._maxNumHits, BUFFER_WRITE_UINT32, false);
        cb.write(this._hitReductionCosMaxAngle, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._penetrationRecoverySpeed, BUFFER_WRITE_FLOAT32, false);

        const entity = this.entity;
        const pos = entity.getPosition();
        const rot = entity.getRotation();

        // Loss of precision for pos/rot (64 -> 32)
        cb.write(pos, BUFFER_WRITE_VEC32, false);
        cb.write(rot, BUFFER_WRITE_VEC32, false);

        DEBUG && cb.write(this._debugDraw, BUFFER_WRITE_BOOL, false);
    }

    updateTransforms(cb, map) {
        const entity = this.entity;

        const px = cb.read(BUFFER_READ_FLOAT32);
        const py = cb.read(BUFFER_READ_FLOAT32);
        const pz = cb.read(BUFFER_READ_FLOAT32);
        entity.setPosition(px, py, pz);

        entity.setRotation(
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32)
        );

        this._linearVelocity.set(
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32),
            cb.read(BUFFER_READ_FLOAT32)
        );

        const pe = this._pairedEntity;
        if (pe) {
            pe.setPosition(px, py + this._shapeOffset.y + this._shapePosition.y, pz);
            pe.setRotation(0, 0, 0, 1); // char never rotates
        }

        const isSupported = cb.read(BUFFER_READ_BOOL);
        this._isSupported = isSupported;
        this._state = cb.read(BUFFER_READ_UINT8);

        if (isSupported && cb.read(BUFFER_READ_BOOL)) {
            const groundIndex = cb.read(BUFFER_READ_UINT32);
            this._groundEntity = map.get(groundIndex) || null;
            this._isSlopeTooSteep = cb.read(BUFFER_READ_BOOL);
            this._groundVelocity.set(
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32)
            );
            this._groundNormal.set(
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32),
                cb.read(BUFFER_READ_FLOAT32)
            );
        } else {
            this._groundEntity = null;
            this._groundNormal.set(0, 0, 0);
            this._groundVelocity.set(0, 0, 0);
        }
    }

    onEnable() {
        const system = this.system;

        this._index = system.getIndex(this.entity);

        system.createCharacter(this);
    }

    onDisable() {
        super.onDisable();

        const system = this.system;
        const componentIndex = this._index;

        system.setIndexFree(componentIndex);

        system.addCommand(OPERATOR_CLEANER, CMD_DESTROY_BODY, componentIndex);
    }    

    _writeCallback(callback) {
        if (callback) {
            const system = this.system;
            const callbackIndex = system.getCallbackIndex(callback);
            system.addCommandArgs(callbackIndex, BUFFER_WRITE_UINT32, false);
        }
    }
}

export { CharComponent };


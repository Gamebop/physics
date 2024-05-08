import { Plane, Vec3, math } from 'playcanvas';
import { Debug } from '../../debug.mjs';
import { ShapeComponent } from '../shape/component.mjs';
import {
    BFM_COLLIDE_BACK_FACES, BUFFER_READ_BOOL, BUFFER_READ_FLOAT32, BUFFER_READ_UINT32,
    BUFFER_READ_UINT8, BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_PLANE,
    BUFFER_WRITE_UINT32, BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32, CMD_CHAR_SET_LIN_VEL,
    CMD_CHAR_SET_SHAPE, CMD_DESTROY_BODY, CMD_PAIR_BODY, CMD_SET_USER_DATA,
    GROUND_STATE_NOT_SUPPORTED, OPERATOR_CLEANER, OPERATOR_MODIFIER,
    SHAPE_CAPSULE
} from '../../constants.mjs';

/**
 * Char Component. Describes the properties of a Jolt Virtual Character.
 *
 * @category Char Component
 */
class CharComponent extends ShapeComponent {
    _shape = SHAPE_CAPSULE;

    _up = Vec3.UP;

    _useMotionState = true;

    _linearVelocity = new Vec3();

    _supportingVolume = new Plane(Vec3.UP, -1);

    _maxSlopeAngle = 45 * math.DEG_TO_RAD;

    _mass = 70;

    _maxStrength = 100;

    _shapeOffset = Vec3.ZERO;

    _backFaceMode = BFM_COLLIDE_BACK_FACES;

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

    _groundEntity = null;

    _groundNormal = new Vec3();

    _groundVelocity = new Vec3();

    _state = GROUND_STATE_NOT_SUPPORTED;

    _userData = null;

    _pairedEntity = null;

    /**
     * When colliding with back faces, the character will not be able to move through back facing
     * triangles. Use this if you have triangles that need to collide on both sides. Following enum
     * aliases available:
     * ```
     * BFM_IGNORE_BACK_FACES
     * ```
     * ```
     * BFM_COLLIDE_BACK_FACES
     * ```
     *
     * @returns {number} Enum alias, representing the back face collision mode.
     * @defaultValue BFM_COLLIDE_BACK_FACES
     */
    get backFaceMode() {
        return this._backFaceMode;
    }

    /**
     * How far we try to stay away from the geometry. This ensures that the sweep will hit as
     * little as possible lowering the collision cost and reducing the risk of getting stuck.
     *
     * @returns {number} Padding distance.
     * @defaultValue 0.02 (meters)
     */
    get characterPadding() {
        return this._characterPadding;
    }

    /**
     * How far we're willing to penetrate geometry.
     *
     * @returns {number} Penetration distance.
     * @defaultValue 0.001 (meters)
     */
    get collisionTolerance() {
        return this._collisionTolerance;
    }

    /**
     * Read-only. If the character is supported, this will tell the ground entity.
     *
     * @returns {import('playcanvas').Entity | null} Entity, representing the ground.
     * @defaultValue null
     */
    get groundEntity() {
        return this._groundEntity;
    }

    /**
     * Read-only. If the character is supported, this will tell the ground normal. Otherwise, will
     * be a zero vector.
     *
     * @returns {Vec3} Vector with ground normal.
     * @defaultValue Vec3(0, 0, 0)
     */
    get groundNormal() {
        return this._groundNormal;
    }

    /**
     * Read-only. Tells the ground velocity the character is standing on. If the character is not
     * supported, will be a zero vector.
     *
     * @returns {Vec3} Ground linear velocity
     * @defaultValue Vec3(0, 0, 0)
     */
    get groundVelocity() {
        return this._groundVelocity;
    }

    /**
     * Ground state. Following enum aliases available:
     * ```
     * GROUND_STATE_ON_GROUND
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
     * @returns {number} Number, representing the ground state.
     * @defaultValue GROUND_STATE_NOT_SUPPORTED
     */
    get state() {
        return this._state;
    }

    /**
     * The maximum angle between two hits contact normals that are allowed to be merged during hit
     * reduction. Set to -1 to turn off.
     *
     * @returns {number} Cosine of an angle.
     * @defaultValue ~cos(2.5) (radians)
     */
    get hitReductionCosMaxAngle() {
        return this._hitReductionCosMaxAngle;
    }

    /**
     * Read-only. True, if the ground the character is standing on is too steep to walk on.
     *
     * @returns {boolean} Boolean, telling if the ground is to steep.
     * @defaultValue false
     */
    get isSlopeTooSteep() {
        return this._isSlopeTooSteep;
    }

    /**
     * Read-only. True, if the character is supported by normal or steep ground.
     *
     * @returns {boolean} Boolean, telling if the character is supported.
     * @defaultValue false
     */
    get isSupported() {
        return this._isSupported;
    }

    /**
     * Sets the linear velocity of the character.
     *
     * @param {Vec3} vel - Linear velocity vector to set the character to.
     */
    set linearVelocity(vel) {
        if ($_DEBUG) {
            Debug.checkVec(vel, `Invalid character linear velocity`, vel);
        }
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_LIN_VEL, this._index,
            vel, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Character linear velocity. Must be set by user. Backend will use it to calculate next
     * position of the character.
     *
     * @returns {Vec3} Vec3 with linear velocity.
     * @defaultValue Vec3(0, 0, 0)
     */
    get linearVelocity() {
        return this._linearVelocity;
    }

    /**
     * Character mass. Used to push down objects with gravity when the character is standing on
     * top.
     *
     * @returns {number} The mass of the character.
     * @defaultValue 70 (kg)
     */
    get mass() {
        return this._mass;
    }

    /**
     * Max amount of collision loops. The more loops, the higher the collision precision, the more
     * expensive is the calculation.
     *
     * @returns {number} Amount of collision loops.
     * @defaultValue 5
     */
    get maxCollisionIterations() {
        return this._maxCollisionIterations;
    }

    /**
     * How often constraint solver tries to step. The higher the number, the higher the precision,
     * the more expensive it is to calculate.
     *
     * @returns {number} Amount of constraint solving steps.
     * @defaultValue 15
     */
    get maxConstraintIterations() {
        return this._maxConstraintIterations;
    }

    /**
     * Max num hits to collect in order to avoid excess of contact points collection.
     *
     * @returns {number} Number of hits.
     * @defaultValue 256
     */
    get maxNumHits() {
        return this._maxNumHits;
    }

    /**
     * Maximum angle of slope that character can still walk on.
     *
     * @returns {number} Slope angle.
     * @defaultValue 45 * math.DEG_TO_RAD (radians)
     */
    get maxSlopeAngle() {
        return this._maxSlopeAngle;
    }

    /**
     * Maximum force with which the character can push other bodies (N).
     *
     * @returns {number} Max strength of the character.
     * @defaultValue 100 (newtons)
     */
    get maxStrength() {
        return this._maxStrength;
    }

    /**
     * Early out condition: If this much time is left to simulate we are done.
     *
     * @returns {number} Remaining time to simulate.
     * @defaultValue 0.0001 (seconds)
     */
    get minTimeRemaining() {
        return this._minTimeRemaining;
    }

    /**
     * Pairs an Entity with a body component to a character.
     *
     * @param {import('playcanvas').Entity} entity - An entity to pair with the character.
     */
    set pairedEntity(entity) {
        if ($_DEBUG) {
            const ok = Debug.assert(!!entity.body, `Invalid entity to pair. Needs to have a "body" component.`, entity);
            if (!ok)
                return;
        }

        this._pairedEntity = entity;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_PAIR_BODY, this._index,
            entity.body.index, BUFFER_WRITE_UINT32, false
        );
    }

    /**
     * An entity with a kinematic or dynamic body, that will be paired with this character. A
     * virtual character doesn't exist in the physics world. Pairing an entity gives it a physical
     * world presence (allow raycasts and collisions detection vs character).
     *
     * @returns {import('playcanvas').Entity | null} A paired entity.
     * @defaultValue null
     */
    get pairedEntity() {
        return this._pairedEntity;
    }

    /**
     * This value governs how fast a penetration will be resolved:
     * - 0: nothing is resolved
     * - 1: everything is resolved in one update
     *
     * @returns {number} Number of updates.
     * @defaultValue 1
     */
    get penetrationRecoverySpeed() {
        return this._penetrationRecoverySpeed;
    }

    /**
     * How far to scan outside of the shape for predictive contacts. A value of 0 will most likely
     * cause the character to get stuck as it cannot properly calculate a sliding direction
     * anymore. A value that's too high will cause ghost collisions.
     *
     * @returns {number} Predictive contact distance.
     * @defaultValue 0.1 (meters)
     */
    get predictiveContactDistance() {
        return this._predictiveContactDistance;
    }

    /**
     * Returns the default collision shape type of the character (the one it was created with).
     *
     * @returns {number} A shape type enum number.
     * @defaultValue SHAPE_CAPSULE
     */
    get shape() {
        return this._shape;
    }

    /**
     * An extra offset applied to the shape in local space. If the shape already has a
     * {@link ShapeComponent.shapePosition | shapePosition} offset, then both offsets are used.
     *
     * @returns {Vec3} Linear position offset of the shape.
     * @defaultValue Vec3(0, 0, 0)
     */
    get shapeOffset() {
        return this._shapeOffset;
    }

    /**
     * A plane, defined in local space relative to the character. Every contact behind this plane
     * can support the character, every contact in front of this plane is treated as only colliding
     * with the player.
     *
     * @returns {Plane} Plane that is used to define what surfaces support and what collide with
     * character.
     * @defaultValue Plane(Vec3.UP, -1)
     */
    get supportingVolume() {
        return this._supportingVolume;
    }

    /**
     * Vector indicating the up direction of the character.
     *
     * @returns {Vec3} Vec3 with up direction.
     * @defaultValue Vec3(0, 1, 0)
     */
    get up() {
        return this._up;
    }

    /**
     * Sets a number on the character shape.
     *
     * Sometimes, it is useful to change a behavior of the character inside the collision callback.
     * The callbacks lose the current scope they are executed in, so you can pass custom numbers as
     * user data and read them from inside the callback.
     *
     * @param {number} num - Number, to set as user data on the character shape.
     */
    set userData(num) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(num, `Invalid user data value. Should be a number: ${num}`);
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

    /**
     * User data to be associated with a shape.
     *
     * @returns {number | null} Number if user data is set. Otherwise `null`;
     * @defaultValue null
     */
    get userData() {
        return this._userData;
    }

    /**
     * Enables/disables the use of motion state for the character. Refer to
     * {@link BodyComponent.useMotionState} for details.
     *
     * @returns {boolean} Boolean, telling whether character controller will use a motion state.
     * @defaultValue true
     */
    get useMotionState() {
        return this._useMotionState;
    }

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
        if ($_DEBUG && !ok) {
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

        if ($_DEBUG) {
            cb.write(this._debugDraw, BUFFER_WRITE_BOOL, false);
        }
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

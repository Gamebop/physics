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

class CharComponent extends ShapeComponent {
    // ---- SHAPE PROPS ----

    // Shape type
    _shape = SHAPE_CAPSULE;

    // ---- CHARACTER PROPS ----

    // Vector indicating the up direction of the character.
    _up = Vec3.UP;

    // Enables/disables the use of motion state for the character.
    _useMotionState = true;

    // Character linear velocity. Must be set by user. Backend will use it to calculate next
    // position.
    _linearVelocity = new Vec3();

    // Plane, defined in local space relative to the character. Every contact 
    // behind this plane can support the character, every contact in front of 
    // this plane is treated as only colliding with the player. Default: Accept
    // any contact.
    _supportingVolume = new Plane(Vec3.UP, -1);

    // Maximum angle of slope that character can still walk on (radians).
    _maxSlopeAngle = 45 * math.DEG_TO_RAD;

    // Character mass (kg). Used to push down objects with gravity when the 
    // character is standing on top.
    _mass = 70;

    // Maximum force with which the character can push other bodies (N).
    _maxStrength = 100;

    // An extra offset applied to the shape in local space.
    _shapeOffset = Vec3.ZERO;

    // When colliding with back faces, the character will not be able to move through
    // back facing triangles. Use this if you have triangles that need to collide
    // on both sides.
    _backFaceMode = BFM_COLLIDE_BACK_FACES;

    // How far to scan outside of the shape for predictive contacts. A value of 0 will
    // most likely cause the character to get stuck as it cannot properly calculate a sliding
    // direction anymore. A value that's too high will cause ghost collisions.
    _predictiveContactDistance = 0.1;

    // Max amount of collision loops
    _maxCollisionIterations = 5;

    // How often to try stepping in the constraint solving.
    _maxConstraintIterations = 15;

    // Early out condition: If this much time is left to simulate we are done.
    _minTimeRemaining = 1.0e-4;

    // How far we're willing to penetrate geometry
    _collisionTolerance = 1.0e-3;

    // How far we try to stay away from the geometry, this ensures that the sweep will
    // hit as little as possible lowering the collision cost and reducing the risk of
    // getting stuck.
    _characterPadding = 0.02;

    // Max num hits to collect in order to avoid excess of contact points collection.
    _maxNumHits = 256;

    // Cos(angle) where angle is the maximum angle between two hits contact normals that 
    // are allowed to be merged during hit reduction. Default is around 2.5 degrees. Set 
    // to -1 to turn off.
    _hitReductionCosMaxAngle = 0.999;

    // This value governs how fast a penetration will be resolved, 0 = nothing is resolved,
    // 1 = everything in one update.
    _penetrationRecoverySpeed = 1;

    // Read-only. True if the character is supported by normal or steep ground.
    _isSupported = false;

    // Read-only. True if the ground is too steep to walk on.
    _isSlopeTooSteep = false;

    // Read-only. If the character is supported, this will tell the ground entity.
    _groundEntity = null;

    // Read-only. If the character is supported, this will tell the ground normal. Otherwise
    // will be a zero vector.
    _groundNormal = new Vec3();

    // If the character is not supported, will be a zero vector.
    _groundVelocity = new Vec3();

    // Ground state.
    _state = GROUND_STATE_NOT_SUPPORTED;

    // User data to be associated with a shape.
    _userData = null;

    // An entity with a kinemaitc or dynamic body, that will be paired with this character to enable
    // a world presence (allow raycasts and collisions detection vs character)
    _pairedEntity = null;

    constructor(system, entity) {
        super(system, entity);      
    }

    get linearVelocity() {
        return this._linearVelocity;
    }

    set linearVelocity(vel) {
        $_DEBUG && Debug.checkVec(vel, `Invalid character linear velocity`, vel);
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_LIN_VEL, this._index,
            vel, BUFFER_WRITE_VEC32, false
        );
    }

    get userData() {
        return this._userData;
    }

    set userData(num) {
        if ($_DEBUG) {
            let ok = Debug.checkFloat(num, `Invalid user data value. Should be a number: ${ num }`);
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

    get pairedEntity() {
        return this._pairedEntity;
    }

    set pairedEntity(entity) {
        if ($_DEBUG) {
            let ok = Debug.assert(!!entity.body, `Invalid entity to pair. Needs to have a "body" component.`, entity);
            if (!ok)
                return;
        }

        this._pairedEntity = entity;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_PAIR_BODY, this._index,
            entity.body.index, BUFFER_WRITE_UINT32, false
        );
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

        $_DEBUG && cb.write(this._debugDraw, BUFFER_WRITE_BOOL, false);
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


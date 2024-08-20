import { Plane, Quat, Vec3, math } from 'playcanvas';
import { Debug } from '../../debug.mjs';
import { ShapeComponent } from '../shape/component.mjs';
import {
    BFM_COLLIDE_BACK_FACES, BUFFER_READ_BOOL, BUFFER_READ_FLOAT32, BUFFER_READ_UINT32,
    BUFFER_READ_UINT8, BUFFER_WRITE_BOOL, BUFFER_WRITE_FLOAT32, BUFFER_WRITE_PLANE,
    BUFFER_WRITE_UINT32, BUFFER_WRITE_UINT8, BUFFER_WRITE_VEC32, CMD_CHAR_SET_LIN_VEL,
    CMD_CHAR_SET_MASS, CMD_CHAR_SET_MAX_STR, CMD_CHAR_SET_POS_ROT, CMD_CHAR_SET_SHAPE,
    CMD_DESTROY_BODY, CMD_CHAR_PAIR_BODY, CMD_USE_MOTION_STATE, GROUND_STATE_NOT_SUPPORTED,
    OPERATOR_CLEANER, OPERATOR_MODIFIER, SHAPE_CAPSULE, CMD_CHAR_SET_REC_SPD,
    CMD_CHAR_SET_NUM_HITS, CMD_CHAR_SET_HIT_RED_ANGLE, CMD_CHAR_SET_SHAPE_OFFSET,
    CMD_CHAR_SET_USER_DATA, CMD_CHAR_SET_UP, BUFFER_WRITE_UINT16, BP_LAYER_MOVING,
    OBJ_LAYER_MOVING, CMD_CHAR_SET_BP_FILTER_LAYER, CMD_CHAR_SET_OBJ_FILTER_LAYER,
    CMD_CHAR_SET_COS_ANGLE, CMD_CHAR_SET_MIN_DIST, CMD_CHAR_SET_TEST_DIST,
    CMD_CHAR_SET_EXTRA_DOWN, CMD_CHAR_SET_STEP_UP, CMD_CHAR_SET_STICK_DOWN
} from '../../constants.mjs';

/**
 * @import {CharSetShapeCallback} from "../../interfaces/query-results.mjs"
 */

/**
 * Char Component. Describes the properties of a Jolt Virtual Character.
 *
 * @group Components
 * @category Char Component
 */
class CharComponent extends ShapeComponent {
    _backFaceMode = BFM_COLLIDE_BACK_FACES;

    _bpFilterLayer = BP_LAYER_MOVING;

    _characterPadding = 0.02;

    _collisionTolerance = 1.0e-3;

    _hitReductionCosMaxAngle = 0.999;

    _groundEntity = null;

    _groundNormal = new Vec3();

    _groundVelocity = new Vec3();

    _isSlopeTooSteep = false;

    _isSupported = false;

    _linearVelocity = new Vec3();

    _mass = 70;

    _maxCollisionIterations = 5;

    _maxConstraintIterations = 15;

    _maxNumHits = 256;

    _maxSlopeAngle = 45 * math.DEG_TO_RAD;

    _maxStrength = 100;

    _minTimeRemaining = 1.0e-4;

    _objFilterLayer = OBJ_LAYER_MOVING;

    _pairedEntity = null;

    _penetrationRecoverySpeed = 1;

    _predictiveContactDistance = 0.1;

    _shape = SHAPE_CAPSULE;

    _shapeOffset = Vec3.ZERO;

    _state = GROUND_STATE_NOT_SUPPORTED;

    _stickToFloorStepDown = new Vec3(0, -0.5, 0);

    _supportingVolume = new Plane(Vec3.UP, -1);

    _up = Vec3.UP;

    _useMotionState = true;

    _userData = null;

    _walkStairsCosAngleForwardContact = 0.25881904510252074;

    _walkStairsMinStepForward = 0.02;

    _walkStairsStepDownExtra = Vec3.ZERO;

    _walkStairsStepForwardTest = 0.15;

    _walkStairsStepUp = new Vec3(0, 0.4, 0);

    /**
     * When colliding with back faces, the character will not be able to move through back facing
     * triangles. Use this if you have triangles that need to collide on both sides. Following
     * constants available:
     * ```
     * BFM_IGNORE_BACK_FACES
     * ```
     * ```
     * BFM_COLLIDE_BACK_FACES
     * ```
     *
     * @returns {number} Constant number, representing the back face collision mode.
     * @defaultValue BFM_COLLIDE_BACK_FACES
     */
    get backFaceMode() {
        return this._backFaceMode;
    }

    /**
     * @param {number} layerNum - Broadphase Filter Layer number.
     */
    set bpFilterLayer(layerNum) {
        if (this._bpFilterLayer === layerNum) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkUint(layerNum);
            if (!ok) {
                return;
            }
        }

        this._bpFilterLayer = layerNum;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_BP_FILTER_LAYER, this._index,
            layerNum, BUFFER_WRITE_UINT16, false
        );
    }

    /**
     * Broadphase Filter Layer. Specifies what objects character can collide with.
     *
     * @type {number}
     * @defaultValue BP_LAYER_MOVING (1)
     */
    get bpFilterLayer() {
        return this._bpFilterLayer;
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
     * @param {number} angle - Max angle.
     */
    set hitReductionCosMaxAngle(angle) {
        if (this._hitReductionCosMaxAngle === angle) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkFloat(angle);
            if (!ok) {
                return;
            }
        }

        this._hitReductionCosMaxAngle = angle;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_HIT_RED_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
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
        if (this._linearVelocity.equals(vel)) {
            return;
        }

        if ($_DEBUG) {
            Debug.checkVec(vel);
        }

        // backend response will write to this._linearVelocity

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
     * @param {number} mass - Mass (kg).
     */
    set mass(mass) {
        if (this._mass === mass) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkFloat(mass);
            if (!ok) {
                return;
            }
        }

        this._mass = mass;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_MASS, this._index,
            mass, BUFFER_WRITE_FLOAT32, false
        );
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
     * @param {number} hits - Hits number.
     */
    set maxNumHits(hits) {
        if (this._maxNumHits === hits) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkFloat(hits);
            if (!ok) {
                return;
            }
        }

        this._maxNumHits = hits;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_NUM_HITS, this._index,
            hits, BUFFER_WRITE_FLOAT32, false
        );
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
     * @param {number} strength - Maximum force with which the character can push other bodies (N).
     */
    set maxStrength(strength) {
        if (this._maxStrength === strength) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkFloat(strength);
            if (!ok) {
                return;
            }
        }

        this._maxStrength = strength;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_MAX_STR, this._index,
            strength, BUFFER_WRITE_FLOAT32, false
        );
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
     * @param {number} layerNum - Object Filter Layer number.
     */
    set objFilterLayer(layerNum) {
        if (this._objFilterLayer === layerNum) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkUint(layerNum);
            if (!ok) {
                return;
            }
        }

        this._objFilterLayer = layerNum;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_OBJ_FILTER_LAYER, this._index,
            layerNum, BUFFER_WRITE_UINT16, false
        );
    }

    /**
     * Object Filter Layer. Defines which objects character can collide with.
     *
     * @type {number}
     * @defaultValue OBJ_LAYER_MOVING (1)
     */
    get objFilterLayer() {
        return this._objFilterLayer;
    }

    /**
     * Pairs an Entity with a body component to a character.
     *
     * @param {import('playcanvas').Entity} entity - An entity to pair with the character.
     */
    set pairedEntity(entity) {
        if ($_DEBUG) {
            const ok = Debug.assert(!!entity.body);
            if (!ok)
                return;
        }

        this._pairedEntity = entity;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_PAIR_BODY, this._index,
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
     * @param {number} factor - Recovery speed factor.
     */
    set penetrationRecoverySpeed(factor) {
        if (this._penetrationRecoverySpeed === factor) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkFloat(factor);
            if (!ok) {
                return;
            }
        }

        this._penetrationRecoverySpeed = factor;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_REC_SPD, this._index,
            factor, BUFFER_WRITE_FLOAT32, false
        );
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
     * @returns {number} A shape type constant number.
     * @defaultValue SHAPE_CAPSULE
     */
    get shape() {
        return this._shape;
    }

    /**
     * @param {Vec3} offset - Shape offset.
     */
    set shapeOffset(offset) {
        if (this._shapeOffset.equals(offset)) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkVec(offset);
            if (!ok) {
                return;
            }
        }

        if (this._shapeOffset === Vec3.ZERO) {
            this._shapeOffset = offset.clone();
        } else {
            this._shapeOffset.copy(offset);
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_SHAPE_OFFSET, this._index,
            offset, BUFFER_WRITE_VEC32, false
        );
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
     * Ground state. Following constants available:
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
     * @param {Vec3} vec - Direction and distance for stepping down.
     */
    set stickToFloorStepDown(vec) {
        if (this._stickToFloorStepDown.equals(vec)) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkVec(vec);
            if (!ok) {
                return;
            }
        }

        this._stickToFloorStepDown.copy(vec);
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_STICK_DOWN, this._index,
            vec, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * Max amount to project the character downwards.
     *
     * @type {Vec3}
     * @defaultValue Vec3(0, -0.5, 0) (m)
     */
    get stickToFloorStepDown() {
        return this._stickToFloorStepDown;
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
     * @param {Vec3} vec - Up vector.
     */
    set up(vec) {
        if (this._up.equals(vec)) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkVec(vec);
            if (!ok) {
                return;
            }
        }

        if (this._up === Vec3.UP) {
            this._up = vec.clone();
        } else {
            this._up.copy(vec);
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_UP, this._index,
            vec, BUFFER_WRITE_VEC32, false
        );
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
     * Enables/Disables a motion state for this character.
     *
     * @param {boolean} bool - Boolean to enable/disable the motion state.
     */
    set useMotionState(bool) {
        if (this._useMotionState === bool) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkBool(bool);
            if (!ok)
                return;
        }

        this._useMotionState = bool;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_USE_MOTION_STATE, this._index,
            bool, BUFFER_WRITE_BOOL, false
        );
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

    /**
     * Sets a number on the character shape.
     *
     * Sometimes, it is useful to change a behavior of the character inside the collision callback.
     * The callbacks lose the current scope they are executed in, so you can pass custom numbers as
     * user data and read them from inside the callback.
     *
     * @param {number} num - Number, to set as user data on the character.
     */
    set userData(num) {
        if ($_DEBUG) {
            const ok = Debug.checkFloat(num);
            if (!ok) {
                return;
            }
        }

        this._userData = num;

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_USER_DATA, this._index,
            num, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * User data to be associated with this character.
     *
     * @returns {number | null} Number if user data is set. Otherwise `null`;
     * @defaultValue null
     */
    get userData() {
        return this._userData;
    }

    /**
     * @param {number} angle - Radians.
     */
    set walkStairsCosAngleForwardContact(angle) {
        if (this._walkStairsCosAngleForwardContact === angle) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkFloat(angle);
            if (!ok) {
                return;
            }
        }

        this._walkStairsCosAngleForwardContact = angle;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_COS_ANGLE, this._index,
            angle, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * Maximum angle in radians between the ground normal in the horizontal plane and the character
     * forward vector where we're willing to adjust the step forward test towards the contact
     * normal.
     *
     * @type {number}
     * @defaultValue cos(75)
     */
    get walkStairsCosAngleForwardContact() {
        return this._walkStairsCosAngleForwardContact;
    }

    /**
     * @param {number} dist - Minimum distance.
     */
    set walkStairsMinStepForward(dist) {
        if (this._walkStairsMinStepForward === dist) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkFloat(dist);
            if (!ok) {
                return;
            }
        }

        this._walkStairsMinStepForward = dist;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_MIN_DIST, this._index,
            dist, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * The distance to step forward after the step up.
     *
     * @type {number}
     * @defaultValue 0.02 (m)
     */
    get walkStairsMinStepForward() {
        return this._walkStairsMinStepForward;
    }

    /**
     * @param {Vec3} vec - Extra translation.
     */
    set walkStairsStepDownExtra(vec) {
        if (this._walkStairsStepDownExtra.equals(vec)) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkVec(vec);
            if (!ok) {
                return;
            }
        }

        if (this._walkStairsStepDownExtra === Vec3.ZERO) {
            this._walkStairsStepDownExtra = vec.clone();
        } else {
            this._walkStairsStepDownExtra.copy(vec);
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_EXTRA_DOWN, this._index,
            vec, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * An additional translation that is added when stepping down at the end. Allows you to step
     * further down than up. Set to zero vector if you don't want this. Should be in the opposite
     * direction of up.
     *
     * @returns {Vec3} - Extra translation vector.
     * @defaultValue Vec3(0, 0, 0)
     */
    get walkStairsStepDownExtra() {
        return this._walkStairsStepDownExtra;
    }

    /**
     * @param {number} dist - Test distance.
     */
    set walkStairsStepForwardTest(dist) {
        if (this._walkStairsStepForwardTest === dist) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkFloat(dist);
            if (!ok) {
                return;
            }
        }

        this._walkStairsStepForwardTest = dist;
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_TEST_DIST, this._index,
            dist, BUFFER_WRITE_FLOAT32, false
        );
    }

    /**
     * When running at a high frequency, stepForward can be very small and it's likely that you hit
     * the side of the stairs on the way down. This could produce a normal that violates the max
     * slope angle. If this happens, we test again using this distance from the up position to see
     * if we find a valid slope.
     *
     * @type {number}
     * @defaultValue 0.15 (m)
     */
    get walkStairsStepForwardTest() {
        return this._walkStairsStepForwardTest;
    }

    /**
     * @param {Vec3} vec - Direction and distance of the step.
     */
    set walkStairsStepUp(vec) {
        if (this._walkStairsStepUp.equals(vec)) {
            return;
        }

        if ($_DEBUG) {
            const ok = Debug.checkVec(vec);
            if (!ok) {
                return;
            }
        }

        this._walkStairsStepUp.copy(vec);
        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_STEP_UP, this._index,
            vec, BUFFER_WRITE_VEC32, false
        );
    }

    /**
     * The direction and distance to step up (this corresponds to the max step height).
     *
     * @returns {Vec3} - Vector, representing step direction and distance.
     * @defaultValue Vec3(0, 0.4, 0) (m)
     */
    get walkStairsStepUp() {
        return this._walkStairsStepUp;
    }

    /**
     * Instant position and rotation change.
     *
     * @param {Vec3} pos - Character position.
     * @param {Quat} [rot] - Character rotation.
     */
    teleport(pos, rot = Quat.IDENTITY) {
        if ($_DEBUG) {
            let ok = Debug.checkVec(pos);
            ok = ok && Debug.checkQuat(rot);
            if (!ok) {
                return;
            }
        }

        const system = this.system;
        const useRot = !rot.equals(Quat.IDENTITY);

        system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_POS_ROT, this._index,
            pos, BUFFER_WRITE_VEC32, false,
            useRot, BUFFER_WRITE_BOOL, false
        );

        if (useRot) {
            system.addCommandArgs(rot, BUFFER_WRITE_VEC32, false);
        }
    }

    /**
     * Allows to change the shape of the character collider.
     *
     * @param {number} shapeIndex - The shape index to switch to. It can be created by
     * {@link JoltManager.createShape | createShape}. Use negative number to reset to original
     * shape.
     * @param {CharSetShapeCallback} callback - Callback function that will accept a boolean,
     * telling if the shape change was successful.
     */
    setShape(shapeIndex, callback) {
        if ($_DEBUG) {
            let ok = Debug.checkInt(shapeIndex);
            ok = ok && Debug.checkFunc(callback);
            if (!ok) {
                return;
            }
        }

        this.system.addCommand(
            OPERATOR_MODIFIER, CMD_CHAR_SET_SHAPE, this._index,
            shapeIndex < 0 ? null : shapeIndex, BUFFER_WRITE_UINT32
        );

        this._writeCallback(callback);
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

        cb.write(this._stickToFloorStepDown, BUFFER_WRITE_VEC32, false);
        cb.write(this._walkStairsStepUp, BUFFER_WRITE_VEC32, false);
        cb.write(this._walkStairsMinStepForward, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._walkStairsStepForwardTest, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._walkStairsCosAngleForwardContact, BUFFER_WRITE_FLOAT32, false);
        cb.write(this._walkStairsStepDownExtra, BUFFER_WRITE_VEC32, false);
        cb.write(this._bpFilterLayer, BUFFER_WRITE_UINT16, false);
        cb.write(this._objFilterLayer, BUFFER_WRITE_UINT16, false);

        if ($_DEBUG) {
            cb.write(this._debugDrawDepth, BUFFER_WRITE_BOOL, false);
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
            system.addCommandArgs(callbackIndex, BUFFER_WRITE_UINT16, false);
        }
    }
}

export { CharComponent };

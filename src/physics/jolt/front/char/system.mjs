import { Debug } from '../../debug.mjs';
import { IndexedCache } from '../../../indexed-cache.mjs';
import { CharComponent } from './component.mjs';
import { ResponseHandler } from '../response-handler.mjs';
import { ShapeComponentSystem } from '../shape/system.mjs';
import {
    BUFFER_READ_UINT32, CMD_CREATE_CHAR, CMD_REPORT_CONTACTS, CMD_REPORT_SET_SHAPE,
    CMD_REPORT_TRANSFORMS, OPERATOR_CREATOR
} from '../../constants.mjs';

const schema = [
    // Jolt virtual character
    'up',
    'supportingVolume',
    'maxSlopeAngle',
    'mass',
    'maxStrength',
    'shapeOffset',
    'backFaceMode',
    'predictiveContactDistance',
    'maxCollisionIterations',
    'maxConstraintIterations',
    'minTimeRemaining',
    'collisionTolerance',
    'characterPadding',
    'maxNumHits',
    'hitReductionCosMaxAngle',
    'penetrationRecoverySpeed',
    'isSupported',
    'isSlopeTooSteep',
    'groundEntity',
    'groundNormal',
    'groundVelocity',
    'state',
    'pairedEntity',
];

/**
 * Char Component System handles all Char Components.
 * 
 * @category Char Component
 */
class CharComponentSystem extends ShapeComponentSystem {
    
    constructor(app, manager, id) {
        super(app, manager);

        this._schema = [...this._schema, ...schema];
        this._queryMap = new IndexedCache();

        this._exposeConstants();

        manager.systems.set(id, this);
    }

    get id() {
        return 'char';
    }

    get ComponentType() {
        return CharComponent;
    }

    getCallbackIndex(callback) {
        return this._manager.queryMap.add(callback);
    }

    // initializeComponentData(component, data) {
    //     if ($_DEBUG) {
    //         const ok = Debug.verifyProperties(data, this.schema);
    //         if (!ok) return;
    //     }

    //     super.initializeComponentData(component, data);
    // }

    processCommands(cb) {
        const command = cb.readCommand();

        switch (command) {
            case CMD_REPORT_TRANSFORMS:
                this._updateCharTransforms(cb);
                break;

            case CMD_REPORT_CONTACTS:
                ResponseHandler.handleCharContacts(cb, this.entityMap);
                break;

            case CMD_REPORT_SET_SHAPE:
                ResponseHandler.handleCharSetShape(cb, this._manager.queryMap);
                break;
        }
    }

    createCharacter(component) {
        const cb = this._manager.commandsBuffer;

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_CHAR);

        component.writeComponentData(cb);
    }

    /**
     * Allows to override the JS callbacks that Jolt will call from Wasm instance. Important - do
     * not use arrow functions! User regular ones.
     * 
     * Note that the functions will be re-evaluated and will lose their current scope, so don't
     * reference any existing variables outside these functions.
     * 
     * For details, refer to Jolt documentation: [Character Contact Listener](
     * https://jrouwe.github.io/JoltPhysics/class_character_contact_listener.html)
     * 
     * @param {object} callbacks An object with one or more callback functions, allowing you to
     * override the default ones.
     * @param {function} callbacks.OnAdjustBodyVelocity
     * Callback to adjust the velocity of a body as seen by the character.
     * ```javascript
     * OnAdjustBodyVelocity: function (inCharacter, inBody2, ioLinearVelocity,
     *     ioAngularVelocity) {}
     * ```
     * @param {function} callbacks.OnContactValidate
     * Checks if a character can collide with specified body. Return true if the contact is valid.
     * ```javascript
     * OnAdjustBodyVelocity: function (inCharacter, inBodyID2, inSubShapeID2) {
     *     return true;  // allow all
     * }
     * ```
     * @param {function} callbacks.OnContactAdded
     * Called whenever the character collides with a body.
     * ```javascript
     * OnAdjustBodyVelocity: function (inCharacter, inBodyID2, inSubShapeID2, inContactPosition,
     *     inContactNormal, ioSettings) {}
     * ```
     * @param {function} callbacks.OnContactSolve
     * Called whenever a contact is being used by the solver.
     * ```javascript
     * OnAdjustBodyVelocity: function (inCharacter, inBodyID2, inSubShapeID2, inContactPosition,
     *     inContactNormal, inContactVelocity, inContactMaterial, inCharacterVelocity,
     *     ioNewCharacterVelocity) {}
     * ```
     */
    overrideContacts(callbacks = {}) {
        if ($_DEBUG) {
            !!callbacks.OnAdjustBodyVelocity && Debug.assert(typeof callbacks.OnAdjustBodyVelocity === 'function', 'OnAdjustBodyVelocity must be a function', callbacks);
            !!callbacks.OnContactValidate && Debug.assert(typeof callbacks.OnContactValidate === 'function', 'OnContactValidate must be a function', callbacks);
            !!callbacks.OnContactAdded && Debug.assert(typeof callbacks.OnContactAdded === 'function', 'OnContactAdded must be a function', callbacks);
            !!callbacks.OnContactSolve && Debug.assert(typeof callbacks.OnContactSolve === 'function', 'OnContactSolve must be a function', callbacks);
        }

        const overrides = Object.create(null);
        if (callbacks.OnAdjustBodyVelocity) {
            overrides.OnAdjustBodyVelocity = new String(callbacks.OnAdjustBodyVelocity);
        }
        if (callbacks.OnContactValidate) {
            overrides.OnContactValidate = new String(callbacks.OnContactValidate);
        }
        if (callbacks.OnContactAdded) {
            overrides.OnContactAdded = new String(callbacks.OnContactAdded);
        }
        if (callbacks.OnContactSolve) {
            overrides.OnContactSolve = new String(callbacks.OnContactSolve);
        }

        const msg = Object.create(null);
        msg.type = 'override-contacts';
        msg.listener = 'char';
        msg.overrides = overrides;
        this._manager.sendUncompressed(msg);
    }

    _exposeConstants() { }

    _updateCharTransforms(cb) {
        const charsCount = cb.read(BUFFER_READ_UINT32);

        for (let i = 0; i < charsCount; i++) {
            const index = cb.read(BUFFER_READ_UINT32);
            const entity = this.entityMap.get(index);

            entity?.char?.updateTransforms(cb, this.entityMap);
        }
    }
}

export { CharComponentSystem };
import { buildAccessors } from "../../../util.mjs";
import { Debug } from "../../../debug.mjs";
import { BUFFER_READ_UINT32, CMD_CREATE_CHAR, CMD_REPORT_CONTACTS, CMD_REPORT_SET_SHAPE, CMD_UPDATE_TRANSFORMS, COMPONENT_SYSTEM_CHAR, OPERATOR_CREATOR } from "../constants.mjs";
import { IndexedCache } from "../../../indexed-cache.mjs";
import { CharComponent } from "./component.mjs";
import { ResponseHandler } from "../response-handler.mjs";
import { ShapeComponentSystem } from "../system.mjs";

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
    'state'
];

class CharComponentSystem extends ShapeComponentSystem {
    constructor(app, manager, id) {
        super(app, manager);

        this.id = 'char';
        this.schema = [...this.schema, ...schema];
        this.ComponentType = CharComponent;

        this._queryMap = new IndexedCache();

        this._exposeConstants();

        manager.systems.set(id, this);

        buildAccessors(this, this.schema);
    }

    getCallbackIndex(callback) {
        return this._manager.queryMap.add(callback);
    }

    initializeComponentData(component, data) {
        if (Debug.dev) {
            const ok = Debug.verifyProperties(data, this.schema);
            if (!ok) return;
        }

        super.initializeComponentData(component, data);
    }

    processCommands(cb) {
        const command = cb.readCommand();

        switch (command) {
            case CMD_UPDATE_TRANSFORMS:
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

    overrideContacts(callbacks = {}) {
        if (Debug.dev) {
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
            if (!entity) continue;

            entity.char.updateTransforms(cb, this.entityMap);
        }
    }
}

export { CharComponentSystem };
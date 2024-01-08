import { Debug } from "../../../debug.mjs";
import { buildAccessors } from "../../../util.mjs";
import {
    CMD_CAST_RAY,
    CMD_CAST_SHAPE,
    CMD_CREATE_BODY,
    CMD_REPORT_CONTACTS,
    CMD_UPDATE_TRANSFORMS,
    COMPONENT_SYSTEM_BODY,
    OPERATOR_CREATOR
} from "../constants.mjs";
import { ResponseHandler } from "../response-handler.mjs";
import { ShapeComponentSystem } from "../system.mjs";
import { BodyComponent } from "./component.mjs";

const schema = [
    // Jolt body
    'position',
    'rotation',
    'linearVelocity',
    'angularVelocity',
    'friction',
    'restitution',
    'linearDamping',
    'angularDamping',
    'maxLinearVelocity',
    'maxAngularVelocity',
    'gravityFactor',
    'inertiaMultiplier',
    'overrideMass',
    'overrideMassProperties',
    'overrideInertiaPosition',
    'overrideInertiaRotation',
    'motionType',
    'objectLayer',
    'group',
    'subGroup',
    'allowedDOFs',
    'allowDynamicOrKinematic',
    'isSensor',
    'motionQuality',
    'allowSleeping',
];

class BodyComponentSystem extends ShapeComponentSystem {

    constructor(app, manager) {
        super(app, manager);

        this.id = 'body';
        this.schema = [...this.schema, ...schema];
        this.ComponentType = BodyComponent;

        manager.systems.set(COMPONENT_SYSTEM_BODY, this);

        buildAccessors(this, this.schema);
    }

    overrideContacts(callbacks = {}) {
        if (Debug.dev) {
            !!callbacks.OnContactValidate && Debug.assert(typeof callbacks.OnContactValidate === 'function', 'OnContactValidate must be a function', callbacks);
            !!callbacks.OnContactAdded && Debug.assert(typeof callbacks.OnContactAdded === 'function', 'OnContactAdded must be a function', callbacks);
            !!callbacks.OnContactPersisted && Debug.assert(typeof callbacks.OnContactPersisted === 'function', 'OnContactPersisted must be a function', callbacks);
            !!callbacks.OnContactRemoved && Debug.assert(typeof callbacks.OnContactRemoved === 'function', 'OnContactRemoved must be a function', callbacks);
        }

        const overrides = Object.create(null);
        if (callbacks.OnContactValidate) {
            overrides.OnContactValidate = new String(callbacks.OnContactValidate);
        }
        if (callbacks.OnContactAdded) {
            overrides.OnContactAdded = new String(callbacks.OnContactAdded);
        }
        if (callbacks.OnContactPersisted) {
            overrides.OnContactPersisted = new String(callbacks.OnContactPersisted);
        }
        if (callbacks.OnContactRemoved) {
            overrides.OnContactRemoved = new String(callbacks.OnContactRemoved);
        }

        const msg = Object.create(null);
        msg.type = 'override-contacts';
        msg.listener = 'contacts';
        msg.overrides = overrides;
        this._manager.sendUncompressed(msg);
    }

    createBody(component) {
        const cb = this._manager.commandsBuffer;

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_BODY);

        component.writeComponentData(cb);
    }

    processCommands(cb) {
        const command = cb.readCommand();

        switch (command) {
            case CMD_UPDATE_TRANSFORMS:
                // TODO
                // move to ResponseHandler
                ShapeComponentSystem.updateDynamic(cb);
                break;

            // TODO
            // handle by manager directly
            case CMD_CAST_RAY:
            case CMD_CAST_SHAPE:
                ResponseHandler.handleQuery(cb, this.entityMap, this._manager.queryMap);
                break;

            case CMD_REPORT_CONTACTS:
                ResponseHandler.handleContact(cb, this.entityMap, this._manager.config);
                break;
        }
    }

    requestKinematicIsometry() {
        this.fire('write-isometry');
    }

    initializeComponentData(component, data) {
        if (Debug.dev) {
            const ok = Debug.verifyProperties(data, this.schema);
            if (!ok)
                return;
        }

        super.initializeComponentData(component, data);
    }
}

export { BodyComponentSystem };


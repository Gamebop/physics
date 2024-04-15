import { Debug } from "../../../debug.mjs";
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
    'collisionGroup',
    'subGroup',
    'allowedDOFs',
    'allowDynamicOrKinematic',
    'isSensor',
    'motionQuality',
    'allowSleeping',
];

/**
 * Body Component System description.
 * 
 * @category Body Component
 */
class BodyComponentSystem extends ShapeComponentSystem {

    constructor(app, manager, id) {
        super(app, manager);

        this.id = 'body';
        this.schema = [...this.schema, ...schema];
        this.ComponentType = BodyComponent;

        manager.systems.set(id, this);

        this.on('beforeremove', this.onBeforeRemove, this);
    }

    /**
     * Allows to override the JS callbacks that Jolt will call from Wasm instance. Important - do
     * not use arrow functions! User regular ones.
     * 
     * Note that the functions will be re-evaluated and will lose their current scope, so don't
     * reference any existing variables outside these functions.
     * 
     * For details, refer to Jolt documentation: [Contact Listener](
     * https://jrouwe.github.io/JoltPhysics/class_contact_listener.html)
     * 
     * @param {object} callbacks An object with one or more callback functions, allowing you to
     * override the default ones. The examples show the default behavior that you can customize.
     * @param {function} callbacks.OnContactValidate
     * Called after detecting a collision between a body pair, but before calling `OnContactAdded`
     * and before adding the contact constraint.
     * ```javascript
     * onContactValidate: function (body1, body2, baseOffset, collideShapeResult) {
     *     // TODO export local flag
     *     return Jolt.ValidateResult_AcceptAllContactsForThisBodyPair;
     * }
     * ```
     * @param {function} callbacks.OnContactAdded
     * Called whenever a new contact point is detected.
     * ```javascript
     * OnContactAdded: function (body1, body2, manifold, settings) {}
     * ```
     * @param {function} callbacks.OnContactPersisted
     * Called whenever a contact is detected that was also detected last update.
     * ```javascript
     * OnContactPersisted: function (body1, body2, manifold, settings) {}
     * ```
     * @param {function} callbacks.OnContactRemoved
     * Called whenever a contact was detected last update but is not detected anymore.
     * ```javascript
     * OnContactRemoved: function (subShapePair) {}
     * ```
     */
    overrideContacts(callbacks) {
        if (DEBUG) {
            let ok = !!callbacks;
            if (!!callbacks.OnContactValidate) {
                ok = ok && Debug.assert(typeof callbacks.OnContactValidate === 'function', 'OnContactValidate must be a function', callbacks);
            }
            if (!!callbacks.OnContactAdded) {
                ok = ok && Debug.assert(typeof callbacks.OnContactAdded === 'function', 'OnContactAdded must be a function', callbacks);
            }
            if (!!callbacks.OnContactPersisted) {
                ok = ok && Debug.assert(typeof callbacks.OnContactPersisted === 'function', 'OnContactPersisted must be a function', callbacks);
            }
            if (!!callbacks.OnContactRemoved) {
                ok = ok && Debug.assert(typeof callbacks.OnContactRemoved === 'function', 'OnContactRemoved must be a function', callbacks);
            }
            if (!ok) {
                return;
            }
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

    requestIsometry() {
        this.fire('write-isometry');
    }

    initializeComponentData(component, data) {
        if (DEBUG) {
            const ok = Debug.verifyProperties(data, this.schema);
            if (!ok)
                return;
        }

        super.initializeComponentData(component, data);
    }

    onBeforeRemove(entity, component) {
        if (component.enabled) {
            component.enabled = false;
        }
    }
}

export { BodyComponentSystem };


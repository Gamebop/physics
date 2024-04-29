import { Debug } from '../../debug.mjs';
import { buildAccessors } from '../../util.mjs';

class ComponentSystem extends pc.ComponentSystem {

    _store = {};

    _manager = null;

    _schema = [ 'enabled' ];

    constructor(app, manager) {
        super(app);

        this._manager = manager;
    }

    get schema() {
        return this._schema;
    }

    set schema(newSchema) {
        this._schema = newSchema;
    }

    get manager() {
        return this._manager;
    }

    get store() {
        return this._store;
    }

    // PlayCanvas compatibility
    set store(obj) {
        this._store = obj;
    }

    addCommand() {
        const cb = this._manager.commandsBuffer;
        
        cb.writeOperator(arguments[0]);
        cb.writeCommand(arguments[1]);

        // component/constraint index
        cb.write(arguments[2], BUFFER_WRITE_UINT32, false);

        for (let i = 3, end = arguments.length; i < end; i += 3) {
            cb.write(arguments[i], arguments[i + 1], arguments[i + 2]);
        }
    }

    addCommandArgs() {
        const cb = this._manager.commandsBuffer;
        for (let i = 0, end = arguments.length; i < end; i += 3) {
            cb.write(arguments[i], arguments[i + 1], arguments[i + 2]);
        }
    }

    addComponent(entity, data = {}) {
        if (DEBUG) {
            const ok = Debug.verifyProperties(data, this._schema);
            if (!ok) {
                return;
            }
        }

        const component = new this.ComponentType(this, entity);

        buildAccessors(component, this._schema);

        this.store[entity.getGuid()] = { entity };

        entity[this.id] = component;
        entity.c[this.id] = component;

        this.initializeComponentData(component, data);

        return component;
    }

    initializeComponentData(component, data) {
        component.enabled = true;

        for (const [key, value] of Object.entries(data)) {
            DEBUG && Debug.assert(value != null, 
                `Trying to initialize a component with invalid value for property "${ key }": ${ value }`, data);
            component[`_${ key }`] = value;
        }

        if (component.entity.enabled && !component.isCompoundChild) {
            component.onEnable();
        }
    }
}

export { ComponentSystem };


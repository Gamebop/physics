import { Debug } from '../debug.mjs';
import { buildAccessors } from '../../util.mjs';
import { BUFFER_WRITE_UINT32 } from '../constants.mjs';
import { ComponentSystem } from 'playcanvas';

class JoltComponentSystem extends ComponentSystem {
    _store = {};

    _manager = null;

    _schema = ['enabled'];

    constructor(app, manager) {
        super(app);

        this._manager = manager;

        this.on('beforeremove', this.onBeforeRemove, this);
    }

    set schema(newSchema) {
        this._schema = newSchema;
    }

    get schema() {
        return this._schema;
    }

    get manager() {
        return this._manager;
    }

    // PlayCanvas compatibility
    set store(obj) {
        this._store = obj;
    }

    get store() {
        return this._store;
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
        if ($_DEBUG) {
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

        // TODO
        // we need to add a component to a sorted list, refer to
        // https://github.com/playcanvas/engine/issues/6647

        this.initializeComponentData(component, data);

        return component;
    }

    initializeComponentData(component, data) {
        component.enabled = true;

        for (const [key, value] of Object.entries(data)) {
            if ($_DEBUG) {
                Debug.assert(value != null, `Trying to initialize a component with invalid value for property "${key}": ${value}`, data);
            }
            component[`_${key}`] = value;
        }

        if (component.entity.enabled && !component.isCompoundChild) {
            component.onEnable();
        }
    }

    onBeforeRemove(entity, component) {
        if (component.enabled) {
            component.enabled = false;
        }
    }
}

export { JoltComponentSystem };

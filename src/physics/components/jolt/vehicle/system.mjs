import { BodyComponentSystem } from "../body/system.mjs";
import { VehicleComponent } from "./component.mjs";

const schema = [
    'antiRollBars',
    'castFraction',
    'castMaxSlopeAngle',
    'castObjectLayer',
    'castRadius',
    'castType',
    'castUp',
    'clutchReleaseTime',
    'clutchStrength',
    'differentialLimitedSlipRatio',
    'differentials',
    'forward',
    'gearRatios',
    'inertia',
    'numVelocityStepsOverride',
    'leanSmoothingFactor',
    'leanSpringConstant',
    'leanSpringDamping',
    'leanSpringIntegrationCoefficient',
    'leanSpringIntegrationCoefficientDecay',
    'maxLeanAngle',
    'numPositionStepsOverride',
    'maxPitchRollAngle',
    'maxTorque',
    'maxRPM',
    'minRPM',
    'mode',
    'normalizedTorque',
    'reverseGearRatios',
    'shiftDownRPM',
    'shiftUpRPM',
    'switchLatency',
    'switchTime',
    'tracks',
    'type',
    'up',
    'wheelAngularDamping',
    'wheels'
];

class VehicleComponentSystem extends BodyComponentSystem {
    constructor(app, manager, id) {
        super(app, manager);

        this.id = 'vehicle';
        this.schema = [...this.schema, ...schema];
        this.ComponentType = VehicleComponent;

        manager.systems.set(id, this);
    }

    createVehicle(component) {
        super.createBody(component);

        const cb = this._manager.commandsBuffer;

        cb.writeOperator(OPERATOR_CREATOR);
        cb.writeCommand(CMD_CREATE_VEHICLE);

        component.writeVehicleData(cb);
    }
}

export { VehicleComponentSystem };
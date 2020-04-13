import {
    forwardRef,
    Inject,
    Injectable,
    InternalServerErrorException
} from '@nestjs/common'
import { ConsoleLoggerService } from '../../../core/logs/console'
import {
    ComponentDeploymentEntity,
    ComponentUndeploymentEntity,
    DeploymentEntity,
    QueuedDeploymentEntity,
    QueuedUndeploymentEntity,
    UndeploymentEntity
} from '../entity'
import { ComponentEntity } from '../../components/entity'
import { InjectRepository } from '@nestjs/typeorm'
import { Repository } from 'typeorm'
import { PipelineErrorHandlerService } from './pipeline-error-handler.service'
import { ComponentUndeploymentsRepository } from '../repository'
import IEnvConfiguration from '../../../core/integrations/configuration/interfaces/env-configuration.interface'
import { IoCTokensConstants } from '../../../core/constants/ioc'
import { CdStrategyFactory } from '../../../core/integrations/cd'
import { CdConfigurationsRepository } from '../../configurations/repository'
import { CdConfigurationEntity } from '../../configurations/entity'

@Injectable()
export class PipelineDeploymentsService {

    constructor(
        private readonly consoleLoggerService: ConsoleLoggerService,
        private readonly pipelineErrorHandlerService: PipelineErrorHandlerService,
        private readonly cdStrategyFactory: CdStrategyFactory,
        @Inject(IoCTokensConstants.ENV_CONFIGURATION)
        private readonly envConfiguration: IEnvConfiguration,
        @InjectRepository(ComponentEntity)
        private readonly componentsRepository: Repository<ComponentEntity>,
        @InjectRepository(ComponentUndeploymentsRepository)
        private readonly componentUndeploymentsRepository: ComponentUndeploymentsRepository,
        @InjectRepository(CdConfigurationsRepository)
        private readonly cdConfigurationsRepository: CdConfigurationsRepository
    ) {}

    public async triggerCircleDeployment(
        componentDeployment: ComponentDeploymentEntity,
        component: ComponentEntity,
        deployment: DeploymentEntity,
        queuedDeployment: QueuedDeploymentEntity
    ): Promise<void> {

        try {
            this.consoleLoggerService.log('START:TRIGGER_CIRCLE_DEPLOYMENT', queuedDeployment)
            await this.setComponentPipelineCircle(componentDeployment, deployment, component)
            const pipelineCallbackUrl: string = this.getDeploymentCallbackUrl(queuedDeployment.id)
            await this.triggerComponentDeployment(
                component, deployment, componentDeployment,
                pipelineCallbackUrl, queuedDeployment.id
            )
            this.consoleLoggerService.log('FINISH:TRIGGER_CIRCLE_DEPLOYMENT', queuedDeployment)
        } catch (error) {
            this.consoleLoggerService.error('ERROR:TRIGGER_CIRCLE_DEPLOYMENT')
            await this.pipelineErrorHandlerService.handleComponentDeploymentFailure(componentDeployment, queuedDeployment, deployment.circle)
            await this.pipelineErrorHandlerService.handleDeploymentFailure(deployment)
            throw error
        }
    }

    public async triggerDefaultDeployment(
        componentDeployment: ComponentDeploymentEntity,
        component: ComponentEntity,
        deployment: DeploymentEntity,
        queuedDeployment: QueuedDeploymentEntity
    ): Promise<void> {

        try {
            this.consoleLoggerService.log('START:TRIGGER_DEFAULT_DEPLOYMENT', queuedDeployment)
            await this.setComponentPipelineDefaultCircle(componentDeployment, component)
            const pipelineCallbackUrl: string = this.getDeploymentCallbackUrl(queuedDeployment.id)
            await this.triggerComponentDeployment(
                component, deployment, componentDeployment,
                pipelineCallbackUrl, queuedDeployment.id
            )
            this.consoleLoggerService.log('FINISH:TRIGGER_DEFAULT_DEPLOYMENT', queuedDeployment)
        } catch (error) {
            this.consoleLoggerService.error('ERROR:TRIGGER_DEFAULT_DEPLOYMENT')
            await this.pipelineErrorHandlerService.handleComponentDeploymentFailure(componentDeployment, queuedDeployment, deployment.circle)
            await this.pipelineErrorHandlerService.handleDeploymentFailure(deployment)
            throw error
        }
    }

    public async triggerUndeployment(
        componentDeployment: ComponentDeploymentEntity,
        undeployment: UndeploymentEntity,
        component: ComponentEntity,
        deployment: DeploymentEntity,
        queuedUndeployment: QueuedUndeploymentEntity
    ): Promise<void> {

        try {
            this.consoleLoggerService.log('START:TRIGGER_UNDEPLOYMENT', queuedUndeployment)
            await this.unsetComponentPipelineCircle(deployment, component)
            const pipelineCallbackUrl: string = this.getUndeploymentCallbackUrl(queuedUndeployment.id)
            await this.triggerComponentUnDeployment(
                component, deployment, undeployment, componentDeployment,
                pipelineCallbackUrl, queuedUndeployment.id
            )
            this.consoleLoggerService.log('FINISH:TRIGGER_UNDEPLOYMENT', queuedUndeployment)
        } catch (error) {
            this.consoleLoggerService.error('ERROR:TRIGGER_UNDEPLOYMENT')
            const componentUndeployment: ComponentUndeploymentEntity =
                await this.componentUndeploymentsRepository.getOneWithRelations(queuedUndeployment.componentUndeploymentId)
            await this.pipelineErrorHandlerService.handleComponentUndeploymentFailure(componentDeployment, queuedUndeployment)
            await this.pipelineErrorHandlerService.handleUndeploymentFailure(componentUndeployment.moduleUndeployment.undeployment)
            throw error
        }
    }

    private async setComponentPipelineCircle(
        componentDeployment: ComponentDeploymentEntity,
        deployment: DeploymentEntity,
        component: ComponentEntity
    ): Promise<void> {

        try {
            component.setPipelineCircle(deployment.circle, componentDeployment)
            await this.componentsRepository.save(component)
        } catch (error) {
            throw new InternalServerErrorException('Could not update component pipeline')
        }
    }

    private async setComponentPipelineDefaultCircle(
        componentDeployment: ComponentDeploymentEntity,
        component: ComponentEntity
    ): Promise<void> {

        try {
            component.setPipelineDefaultCircle(componentDeployment)
            await this.componentsRepository.save(component)
        } catch (error) {
            throw new InternalServerErrorException('Could not update component pipeline')
        }
    }

    private async unsetComponentPipelineCircle(
        deployment: DeploymentEntity,
        component: ComponentEntity
    ): Promise<void> {

        try {
            component.unsetPipelineCircle(deployment.circle)
            await this.componentsRepository.save(component)
        } catch (error) {
            throw new InternalServerErrorException('Could not update component pipeline')
        }
    }

    private getDeploymentCallbackUrl(queuedDeploymentId: number): string {
        return `${this.envConfiguration.darwinDeploymentCallbackUrl}?queuedDeploymentId=${queuedDeploymentId}`
    }

    private getUndeploymentCallbackUrl(queuedUndeploymentId: number): string {
        return `${this.envConfiguration.darwinUndeploymentCallbackUrl}?queuedUndeploymentId=${queuedUndeploymentId}`
    }

    private async triggerComponentDeployment(
        componentEntity: ComponentEntity,
        deploymentEntity: DeploymentEntity,
        componentDeployment: ComponentDeploymentEntity,
        pipelineCallbackUrl: string,
        queueId: number
    ): Promise<void> {

        const cdConfiguration: CdConfigurationEntity =
            await this.cdConfigurationsRepository.findDecrypted(componentEntity.module.cdConfigurationId)

        const cdService = this.cdStrategyFactory.create(cdConfiguration.type)

        await cdService.createDeployment(
            componentEntity.pipelineOptions, cdConfiguration.configurationData, componentDeployment.id,
            deploymentEntity.id, deploymentEntity.circleId, pipelineCallbackUrl, queueId
        )
    }

    private async triggerComponentUnDeployment(
        componentEntity: ComponentEntity,
        deploymentEntity: DeploymentEntity,
        undeploymentEntity: UndeploymentEntity,
        componentDeployment: ComponentDeploymentEntity,
        pipelineCallbackUrl: string,
        queueId: number
    ): Promise<void> {

        try {
            const cdConfiguration: CdConfigurationEntity =
                await this.cdConfigurationsRepository.findDecrypted(componentEntity.module.cdConfigurationId)

            const cdService = this.cdStrategyFactory.create(cdConfiguration.type)

            await cdService.createDeployment(
                componentEntity.pipelineOptions, cdConfiguration.configurationData, componentDeployment.id,
                deploymentEntity.id, undeploymentEntity.circleId, pipelineCallbackUrl, queueId
            )
        } catch (error) {
            throw error
        }
    }
}
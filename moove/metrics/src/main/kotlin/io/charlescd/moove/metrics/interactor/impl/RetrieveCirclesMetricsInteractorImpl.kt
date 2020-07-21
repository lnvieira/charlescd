/*
 * Copyright 2020 ZUP IT SERVICOS EM TECNOLOGIA E INOVACAO SA
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package io.charlescd.moove.metrics.interactor.impl

import io.charlescd.moove.domain.repository.CircleRepository
import io.charlescd.moove.metrics.api.response.CirclesMetricsRepresentation
import io.charlescd.moove.metrics.interactor.RetrieveCirclesMetricsInteractor
import org.springframework.stereotype.Component

@Component
class RetrieveCirclesMetricsInteractorImpl(val circleRepository: CircleRepository) : RetrieveCirclesMetricsInteractor {

    override fun execute(workspaceId: String): CirclesMetricsRepresentation {
        return CirclesMetricsRepresentation.from(
            this.circleRepository.countByWorkspaceGroupedByStatus(workspaceId),
            this.circleRepository.getCirclesAverageLifeTime(workspaceId)
        )
    }
}
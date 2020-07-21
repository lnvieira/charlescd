package io.charlescd.moove.application.circle.impl

import io.charlescd.moove.application.circle.FindCirclesHistoryInteractor
import io.charlescd.moove.application.circle.response.CircleHistoryResponse
import io.charlescd.moove.domain.PageRequest
import io.charlescd.moove.domain.repository.CircleRepository
import javax.inject.Named

@Named
class FindCirclesHistoryInteractorImpl(private val circleRepository: CircleRepository) : FindCirclesHistoryInteractor {
    override fun execute(workspaceId: String, name: String?, pageRequest: PageRequest): CircleHistoryResponse {
        val historyItems = circleRepository.findCirclesHistory(workspaceId, name, pageRequest)
        val summaryItems = circleRepository.countNotDefaultByWorkspaceGroupedByStatus(workspaceId, name)

        return CircleHistoryResponse.from(summaryItems, historyItems)
    }
}

package com.badmintonbooking.user.ai.controller;

import com.badmintonbooking.common.ApiResponse;
import com.badmintonbooking.user.ai.dto.AiSearchRequest;
import com.badmintonbooking.user.ai.dto.AiSearchResponse;
import com.badmintonbooking.user.ai.service.AiSearchOrchestratorService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.security.Principal;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/ai")
public class AiSearchController {

    private final AiSearchOrchestratorService orchestratorService;

    public AiSearchController(AiSearchOrchestratorService orchestratorService) {
        this.orchestratorService = orchestratorService;
    }

    @PostMapping("/search")
    public ResponseEntity<ApiResponse<AiSearchResponse>> searchCourtsWithAi(
            @Valid @RequestBody AiSearchRequest request,
            HttpServletRequest httpRequest,
            Principal principal
    ) {
        // Resolve client key (User Email or IP Address)
        String clientKey = principal != null ? principal.getName() : resolveClientIp(httpRequest);

        AiSearchResponse response = orchestratorService.orchestrateSearch(request, clientKey);
        return ResponseEntity.ok(ApiResponse.success(response, "Phân tích AI và tìm kiếm sân thành công"));
    }

    @GetMapping("/quota")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getRemainingQuota(
            HttpServletRequest httpRequest,
            Principal principal
    ) {
        String clientKey = principal != null ? principal.getName() : resolveClientIp(httpRequest);
        int quota = orchestratorService.checkRemainingQuota(clientKey);
        return ResponseEntity.ok(ApiResponse.success(
                Map.of("remainingQuota", quota, "maxQuotaPerMinute", 15),
                "Truy vấn quota AI thành công"
        ));
    }

    private String resolveClientIp(HttpServletRequest request) {
        return request.getRemoteAddr() != null ? request.getRemoteAddr() : "127.0.0.1";
    }
}

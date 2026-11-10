package com.badmintonbooking.user.integration;

import com.badmintonbooking.common.ApiResponse;
import com.badmintonbooking.user.auth.dto.UserResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import java.security.Principal;
import java.net.URI;
import java.util.*;

@RestController
public class AccountIntegrationController {
    private final AccountIntegrationService service;
    private final String frontendUrl;
    public AccountIntegrationController(AccountIntegrationService service,@Value("${app.frontend-url:http://localhost:5173}") String frontendUrl) { this.service=service; this.frontendUrl=frontendUrl.replaceAll("/+$",""); }
    public record TokenRequest(@NotBlank @Size(max=4096) String token) {}
    @GetMapping("/api/v1/account/integrations") public ApiResponse<Map<String,Boolean>> capabilities() { return ApiResponse.success(service.capabilities(),"Kết nối tài khoản"); }
    @PostMapping("/api/v1/account/push") public ApiResponse<UserResponse> subscribe(Principal user,@Valid @RequestBody TokenRequest request) { return ApiResponse.success(service.subscribe(user,request.token()),"Đã bật thông báo"); }
    @DeleteMapping("/api/v1/account/push") public ApiResponse<UserResponse> unsubscribe(Principal user,@RequestBody(required=false) TokenRequest request) { return ApiResponse.success(service.unsubscribe(user,request==null?null:request.token()),"Đã cập nhật thông báo"); }
    @PostMapping("/api/v1/account/calendar/connect") public ApiResponse<Map<String,String>> connect(Principal user) { return ApiResponse.success(Map.of("url",service.startCalendar(user),"callbackOrigin",service.callbackOrigin()),"Kết nối Google Calendar"); }
    @DeleteMapping("/api/v1/account/calendar") public ApiResponse<UserResponse> disconnect(Principal user) { return ApiResponse.success(service.disconnectCalendar(user),"Đã ngắt kết nối lịch"); }

    @GetMapping(value="/api/v1/auth/calendar/callback",produces=MediaType.TEXT_HTML_VALUE)
    public ResponseEntity<String> callback(@RequestParam(defaultValue="") String state,@RequestParam(defaultValue="") String code) {
        boolean success=false;
        if (state.length()<=100 && !state.isBlank() && !code.isBlank() && code.length()<8192) {
            try { service.completeCalendar(state,code); success=true; }
            catch (RuntimeException ex) { /* Never echo OAuth codes, tokens or provider errors. */ }
        }
        URI uri=URI.create(frontendUrl); String origin=uri.getScheme()+"://"+uri.getAuthority();
        if (!("http".equals(uri.getScheme()) || "https".equals(uri.getScheme())) || uri.getHost()==null || uri.getUserInfo()!=null
                || origin.indexOf('\'')>=0 || origin.indexOf('<')>=0) throw new IllegalStateException("Invalid frontend origin");
        String nonce=UUID.randomUUID().toString();
        String result=success?"success":"error";
        String html="<!doctype html><html lang='vi'><meta charset='utf-8'><title>Kết nối lịch</title><p>Đang quay lại SmashCourt…</p><script nonce='"+nonce+"'>"
            +"if(window.opener){window.opener.postMessage({type:'smashcourt-calendar',result:'"+result+"'},'"+origin+"');window.close()}"
            +"else{window.location.replace('"+origin+"/account?section=settings&calendar_result="+result+"')}</script></html>";
        return ResponseEntity.ok().header("Cache-Control","no-store").header("Referrer-Policy","no-referrer")
            .header("Content-Security-Policy","default-src 'none'; script-src 'nonce-"+nonce+"'").body(html);
    }
}

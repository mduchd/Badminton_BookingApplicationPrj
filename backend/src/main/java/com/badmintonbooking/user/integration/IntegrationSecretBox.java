package com.badmintonbooking.user.integration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import javax.crypto.Cipher;
import javax.crypto.spec.*;
import java.security.SecureRandom;
import java.nio.charset.StandardCharsets;
import java.util.*;

@Component
public class IntegrationSecretBox {
    private final byte[] key;
    public IntegrationSecretBox(@Value("${app.integrations.encryption-key:}") String encoded) {
        try { key = encoded.isBlank() ? new byte[0] : Base64.getDecoder().decode(encoded); }
        catch (IllegalArgumentException ex) { throw new IllegalStateException("INTEGRATIONS_ENCRYPTION_KEY must be base64", ex); }
        if (key.length != 0 && key.length != 32) throw new IllegalStateException("INTEGRATIONS_ENCRYPTION_KEY must contain 32 bytes");
    }
    public boolean isConfigured() { return key.length == 32; }
    public String encrypt(String value) {
        if (!isConfigured()) throw new IllegalStateException("Integration encryption is not configured");
        try {
            byte[] nonce = new byte[12]; new SecureRandom().nextBytes(nonce);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.ENCRYPT_MODE, new SecretKeySpec(key,"AES"), new GCMParameterSpec(128, nonce));
            byte[] encrypted = cipher.doFinal(value.getBytes(StandardCharsets.UTF_8));
            byte[] result = Arrays.copyOf(nonce, nonce.length + encrypted.length);
            System.arraycopy(encrypted, 0, result, nonce.length, encrypted.length);
            return Base64.getEncoder().encodeToString(result);
        } catch (Exception ex) { throw new IllegalStateException("Cannot encrypt integration credentials", ex); }
    }
    public String decrypt(String value) {
        try {
            byte[] bytes = Base64.getDecoder().decode(value);
            Cipher cipher = Cipher.getInstance("AES/GCM/NoPadding");
            cipher.init(Cipher.DECRYPT_MODE, new SecretKeySpec(key,"AES"), new GCMParameterSpec(128, Arrays.copyOf(bytes,12)));
            return new String(cipher.doFinal(Arrays.copyOfRange(bytes,12,bytes.length)), StandardCharsets.UTF_8);
        } catch (Exception ex) { throw new IllegalStateException("Cannot decrypt integration credentials", ex); }
    }
}

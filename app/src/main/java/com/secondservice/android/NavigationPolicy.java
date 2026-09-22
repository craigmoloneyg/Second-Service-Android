package com.secondservice.android;

import java.net.URI;

final class NavigationPolicy {
    static final String HOME = "https://garnish-craig.craig-moloneyg.chatgpt.site/";
    static boolean isInternal(String url) {
        try {
            URI uri = URI.create(url);
            return "https".equalsIgnoreCase(uri.getScheme())
                && "garnish-craig.craig-moloneyg.chatgpt.site".equalsIgnoreCase(uri.getHost())
                && uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443);
        } catch (IllegalArgumentException e) { return false; }
    }
}

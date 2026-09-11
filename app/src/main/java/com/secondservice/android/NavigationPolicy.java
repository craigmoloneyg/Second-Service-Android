package com.secondservice.android;

import java.net.URI;

final class NavigationPolicy {
    static final String HOME = "https://second-service-profit-intelligence.craig-moloneyg.workers.dev/";
    static boolean isInternal(String url) {
        try {
            URI uri = URI.create(url);
            return "https".equalsIgnoreCase(uri.getScheme())
                && "second-service-profit-intelligence.craig-moloneyg.workers.dev".equalsIgnoreCase(uri.getHost())
                && uri.getUserInfo() == null && (uri.getPort() == -1 || uri.getPort() == 443);
        } catch (IllegalArgumentException e) { return false; }
    }
}
